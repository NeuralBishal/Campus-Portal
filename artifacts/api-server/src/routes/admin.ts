import { Router, type IRouter } from "express";
import { eq, desc, sql, count, inArray } from "drizzle-orm";
import {
  db,
  adminsTable,
  facultiesTable,
  studentsTable,
  groupsTable,
  domainsTable,
  attendanceTable,
  auditLogsTable,
  sheetsConfigTable,
  securitySettingsTable,
} from "@workspace/db";
import { Schemas } from "@workspace/api-zod";
import { hashPassword } from "../lib/passwords";
import { syncFromSheets } from "../lib/sheets";
import { recordAudit } from "../lib/audit";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.use("/admin", requireRole("admin"));

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const [studentRow] = await db.select({ c: count() }).from(studentsTable);
  const [facultyRow] = await db.select({ c: count() }).from(facultiesTable);
  const [adminRow] = await db.select({ c: count() }).from(adminsTable);
  const [groupRow] = await db.select({ c: count() }).from(groupsTable);
  const [domainRow] = await db.select({ c: count() }).from(domainsTable);
  const [attRow] = await db.select({ c: count() }).from(attendanceTable);
  const [presentRow] = await db
    .select({ c: count() })
    .from(attendanceTable)
    .where(eq(attendanceTable.status, "present"));
  const attendanceRate = (attRow?.c ?? 0) > 0 ? ((presentRow?.c ?? 0) / (attRow?.c ?? 1)) * 100 : 0;
  const [config] = await db.select().from(sheetsConfigTable).limit(1);
  const recent = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(15);

  // groups by domain (top 8)
  const byDomain = await db.execute(sql`
    SELECT d.name as domain, COUNT(g.id)::int as count
    FROM ${domainsTable} d
    LEFT JOIN ${groupsTable} g ON g.domain_id = d.id
    GROUP BY d.id, d.name
    ORDER BY count DESC
    LIMIT 8
  `);
  const groupsByDomain = byDomain.rows.map((r: any) => ({ domain: r.domain, count: Number(r.count) }));

  res.json({
    studentCount: studentRow?.c ?? 0,
    facultyCount: facultyRow?.c ?? 0,
    adminCount: adminRow?.c ?? 0,
    groupCount: groupRow?.c ?? 0,
    domainsCount: domainRow?.c ?? 0,
    attendanceRate: Number(attendanceRate.toFixed(1)),
    lastSyncedAt: config?.lastSyncedAt ? config.lastSyncedAt.toISOString() : null,
    lastSyncStatus: config?.lastSyncStatus ?? null,
    recentActivity: recent.map((r) => ({
      id: r.id,
      actorRole: r.actorRole,
      actorName: r.actorName,
      action: r.action,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
    })),
    groupsByDomain,
  });
});

router.get("/admin/sheets", async (_req, res): Promise<void> => {
  const [config] = await db.select().from(sheetsConfigTable).limit(1);
  if (!config) {
    res.json({
      studentSheetUrl: null,
      facultySheetUrl: null,
      lastSyncedAt: null,
      lastSyncStatus: null,
      autoSyncEnabled: true,
    });
    return;
  }
  res.json({
    studentSheetUrl: config.studentSheetUrl,
    facultySheetUrl: config.facultySheetUrl,
    lastSyncedAt: config.lastSyncedAt ? config.lastSyncedAt.toISOString() : null,
    lastSyncStatus: config.lastSyncStatus,
    autoSyncEnabled: config.autoSyncEnabled,
  });
});

router.put("/admin/sheets", async (req, res): Promise<void> => {
  const parsed = Schemas.UpdateSheetsConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(sheetsConfigTable).limit(1);
  const updates: Partial<typeof sheetsConfigTable.$inferInsert> = {};
  if (parsed.data.studentSheetUrl !== undefined) updates.studentSheetUrl = parsed.data.studentSheetUrl;
  if (parsed.data.facultySheetUrl !== undefined) updates.facultySheetUrl = parsed.data.facultySheetUrl;
  if (parsed.data.autoSyncEnabled !== undefined && parsed.data.autoSyncEnabled !== null) {
    updates.autoSyncEnabled = parsed.data.autoSyncEnabled;
  }

  if (!existing) {
    await db.insert(sheetsConfigTable).values({ id: "singleton", ...updates });
  } else {
    await db.update(sheetsConfigTable).set(updates).where(eq(sheetsConfigTable.id, existing.id));
  }
  await recordAudit({
    actorRole: "admin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "update_sheets_config",
  });
  const [updated] = await db.select().from(sheetsConfigTable).limit(1);
  res.json({
    studentSheetUrl: updated!.studentSheetUrl,
    facultySheetUrl: updated!.facultySheetUrl,
    lastSyncedAt: updated!.lastSyncedAt ? updated!.lastSyncedAt.toISOString() : null,
    lastSyncStatus: updated!.lastSyncStatus,
    autoSyncEnabled: updated!.autoSyncEnabled,
  });
});

router.post("/admin/sheets/sync", async (req, res): Promise<void> => {
  const result = await syncFromSheets();
  await recordAudit({
    actorRole: "admin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "sync_sheets",
    details: result.message,
  });
  res.json(result);
});

router.get("/admin/students", async (_req, res): Promise<void> => {
  const rows = await db.select().from(studentsTable).orderBy(studentsTable.rollNumber);
  res.json(rows.map((s) => ({
    id: s.id,
    rollNumber: s.rollNumber,
    name: s.name,
    email: s.email,
    department: s.department,
    groupId: s.groupId,
    passwordChanged: s.passwordChanged,
  })));
});

router.get("/admin/faculties", async (_req, res): Promise<void> => {
  const faculties = await db.select().from(facultiesTable).orderBy(facultiesTable.name);
  const groupCounts = await db
    .select({ facultyId: groupsTable.facultyId, c: count() })
    .from(groupsTable)
    .groupBy(groupsTable.facultyId);
  const countMap = new Map(groupCounts.map((g) => [g.facultyId, g.c]));
  res.json(faculties.map((f) => ({
    id: f.id,
    facultyId: f.facultyId,
    name: f.name,
    email: f.email,
    department: f.department,
    groupCount: countMap.get(f.id) ?? 0,
    passwordChanged: f.passwordChanged,
  })));
});

router.get("/admin/admins", async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminsTable).orderBy(adminsTable.createdAt);
  res.json(rows.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/admin/admins", async (req, res): Promise<void> => {
  const parsed = Schemas.CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "An admin with that email already exists." });
    return;
  }
  const [a] = await db.insert(adminsTable).values({
    name: parsed.data.name,
    email,
    passwordHash: hashPassword(parsed.data.password),
    passwordChanged: true,
  }).returning();
  await recordAudit({
    actorRole: "admin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "create_admin",
    details: `Created admin ${a!.email}`,
  });
  res.json({
    id: a!.id,
    name: a!.name,
    email: a!.email,
    createdAt: a!.createdAt.toISOString(),
  });
});

router.delete("/admin/admins/:adminId", async (req, res): Promise<void> => {
  const adminId = String(req.params.adminId);
  const [count1] = await db.select({ c: count() }).from(adminsTable);
  if ((count1?.c ?? 0) <= 1) {
    res.status(400).json({ error: "Cannot delete the last admin." });
    return;
  }
  if (adminId === req.user!.id) {
    res.status(400).json({ error: "You cannot delete yourself." });
    return;
  }
  await db.delete(adminsTable).where(eq(adminsTable.id, adminId));
  await recordAudit({
    actorRole: "admin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "delete_admin",
    details: `Deleted admin ${adminId}`,
  });
  res.json({ ok: true });
});

router.get("/admin/security", async (_req, res): Promise<void> => {
  const [s] = await db.select().from(securitySettingsTable).limit(1);
  if (!s) {
    res.json({
      sessionTimeoutMinutes: 120,
      minPasswordLength: 6,
      requirePasswordChange: true,
      allowStudentLogin: true,
      allowFacultyLogin: true,
    });
    return;
  }
  res.json({
    sessionTimeoutMinutes: s.sessionTimeoutMinutes,
    minPasswordLength: s.minPasswordLength,
    requirePasswordChange: s.requirePasswordChange,
    allowStudentLogin: s.allowStudentLogin,
    allowFacultyLogin: s.allowFacultyLogin,
  });
});

router.put("/admin/security", async (req, res): Promise<void> => {
  const parsed = Schemas.UpdateSecuritySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(securitySettingsTable).limit(1);
  const updates: Partial<typeof securitySettingsTable.$inferInsert> = {};
  if (parsed.data.sessionTimeoutMinutes != null) updates.sessionTimeoutMinutes = parsed.data.sessionTimeoutMinutes;
  if (parsed.data.minPasswordLength != null) updates.minPasswordLength = parsed.data.minPasswordLength;
  if (parsed.data.requirePasswordChange != null) updates.requirePasswordChange = parsed.data.requirePasswordChange;
  if (parsed.data.allowStudentLogin != null) updates.allowStudentLogin = parsed.data.allowStudentLogin;
  if (parsed.data.allowFacultyLogin != null) updates.allowFacultyLogin = parsed.data.allowFacultyLogin;

  if (!existing) {
    await db.insert(securitySettingsTable).values({ id: "singleton", ...updates });
  } else {
    await db.update(securitySettingsTable).set(updates).where(eq(securitySettingsTable.id, existing.id));
  }
  await recordAudit({
    actorRole: "admin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "update_security",
  });
  const [updated] = await db.select().from(securitySettingsTable).limit(1);
  res.json({
    sessionTimeoutMinutes: updated!.sessionTimeoutMinutes,
    minPasswordLength: updated!.minPasswordLength,
    requirePasswordChange: updated!.requirePasswordChange,
    allowStudentLogin: updated!.allowStudentLogin,
    allowFacultyLogin: updated!.allowFacultyLogin,
  });
});

router.get("/admin/audit-logs", async (_req, res): Promise<void> => {
  const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(200);
  res.json(rows.map((r) => ({
    id: r.id,
    actorRole: r.actorRole,
    actorName: r.actorName,
    action: r.action,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/admin/groups", async (_req, res): Promise<void> => {
  const groups = await db.select().from(groupsTable).orderBy(desc(groupsTable.createdAt));
  if (groups.length === 0) { res.json([]); return; }
  const facultyIds = Array.from(new Set(groups.map((g) => g.facultyId)));
  const domainIds = Array.from(new Set(groups.map((g) => g.domainId)));
  const faculties = facultyIds.length
    ? await db.select().from(facultiesTable).where(inArray(facultiesTable.id, facultyIds))
    : [];
  const domains = domainIds.length
    ? await db.select().from(domainsTable).where(inArray(domainsTable.id, domainIds))
    : [];
  const allMembers = await db.select().from(studentsTable).where(inArray(studentsTable.groupId, groups.map((g) => g.id)));
  const facMap = new Map(faculties.map((f) => [f.id, f]));
  const domMap = new Map(domains.map((d) => [d.id, d]));
  res.json(groups.map((g) => ({
    id: g.id,
    projectTitle: g.projectTitle,
    description: g.description,
    facultyId: g.facultyId,
    facultyName: facMap.get(g.facultyId)?.name ?? "Unknown",
    domainId: g.domainId,
    domainName: domMap.get(g.domainId)?.name ?? "Unknown",
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    members: allMembers
      .filter((m) => m.groupId === g.id)
      .map((m) => ({
        id: m.id,
        rollNumber: m.rollNumber,
        name: m.name,
        email: m.email,
        department: m.department,
        groupId: m.groupId,
        passwordChanged: m.passwordChanged,
      })),
  })));
});

export default router;
