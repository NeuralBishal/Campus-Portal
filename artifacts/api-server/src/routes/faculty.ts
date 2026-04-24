import { Router, type IRouter } from "express";
import { eq, desc, and, sql, count, gte, inArray } from "drizzle-orm";
import {
  db,
  facultiesTable,
  studentsTable,
  groupsTable,
  domainsTable,
  attendanceTable,
  performanceTable,
  emailLogsTable,
  notificationsTable,
} from "@workspace/db";
import { Schemas } from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.use("/faculty", requireRole("faculty"));

async function studentsUnderFaculty(facultyId: string) {
  const groups = await db.select().from(groupsTable).where(eq(groupsTable.facultyId, facultyId));
  if (groups.length === 0) return [] as (typeof studentsTable.$inferSelect)[];
  const groupIds = groups.map((g) => g.id);
  const students = await db.select().from(studentsTable).where(inArray(studentsTable.groupId, groupIds));
  return students;
}

router.get("/faculty/dashboard", async (req, res): Promise<void> => {
  const facultyId = req.user!.id;
  const groups = await db.select().from(groupsTable).where(eq(groupsTable.facultyId, facultyId));
  const students = await studentsUnderFaculty(facultyId);
  const [domainsCount] = await db.select({ c: count() }).from(domainsTable).where(eq(domainsTable.facultyId, facultyId));
  const att = await db.select().from(attendanceTable).where(eq(attendanceTable.facultyId, facultyId));
  const present = att.filter((a) => a.status === "present").length;
  const attendanceRate = att.length > 0 ? (present / att.length) * 100 : 0;
  const [unread] = await db
    .select({ c: count() })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.recipientType, "faculty"),
      eq(notificationsTable.recipientId, facultyId),
      eq(notificationsTable.read, false),
    ));
  const recentEmails = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.facultyId, facultyId))
    .orderBy(desc(emailLogsTable.sentAt))
    .limit(5);

  // upcoming groups = all groups for this faculty (UI can label)
  const groupsList = await Promise.all(groups.slice(0, 6).map(async (g) => {
    const [d] = await db.select().from(domainsTable).where(eq(domainsTable.id, g.domainId)).limit(1);
    const members = students.filter((s) => s.groupId === g.id).map((m) => ({
      id: m.id,
      rollNumber: m.rollNumber,
      name: m.name,
      email: m.email,
      department: m.department,
      groupId: m.groupId,
      passwordChanged: m.passwordChanged,
    }));
    return {
      id: g.id,
      projectTitle: g.projectTitle,
      description: g.description,
      facultyId: g.facultyId,
      facultyName: req.user!.name,
      domainId: g.domainId,
      domainName: d?.name ?? "Unknown",
      status: g.status,
      createdAt: g.createdAt.toISOString(),
      members,
    };
  }));

  res.json({
    groupCount: groups.length,
    groupCapacity: 3,
    studentCount: students.length,
    domainsCount: domainsCount?.c ?? 0,
    attendanceRate: Number(attendanceRate.toFixed(1)),
    unreadNotifications: unread?.c ?? 0,
    recentEmails: recentEmails.map((e) => ({
      id: e.id,
      subject: e.subject,
      body: e.body,
      recipientCount: e.recipientStudentIds.length,
      recipientNames: e.recipientNames,
      sentAt: e.sentAt.toISOString(),
    })),
    upcomingGroups: groupsList,
  });
});

router.get("/faculty/groups", async (req, res): Promise<void> => {
  const facultyId = req.user!.id;
  const groups = await db.select().from(groupsTable).where(eq(groupsTable.facultyId, facultyId)).orderBy(desc(groupsTable.createdAt));
  if (groups.length === 0) { res.json([]); return; }
  const domains = await db.select().from(domainsTable).where(eq(domainsTable.facultyId, facultyId));
  const allStudents = await db.select().from(studentsTable).where(inArray(studentsTable.groupId, groups.map((g) => g.id)));
  const domMap = new Map(domains.map((d) => [d.id, d]));
  res.json(groups.map((g) => ({
    id: g.id,
    projectTitle: g.projectTitle,
    description: g.description,
    facultyId: g.facultyId,
    facultyName: req.user!.name,
    domainId: g.domainId,
    domainName: domMap.get(g.domainId)?.name ?? "Unknown",
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    members: allStudents.filter((s) => s.groupId === g.id).map((m) => ({
      id: m.id, rollNumber: m.rollNumber, name: m.name, email: m.email,
      department: m.department, groupId: m.groupId, passwordChanged: m.passwordChanged,
    })),
  })));
});

router.get("/faculty/students", async (req, res): Promise<void> => {
  const students = await studentsUnderFaculty(req.user!.id);
  res.json(students.map((s) => ({
    id: s.id, rollNumber: s.rollNumber, name: s.name, email: s.email,
    department: s.department, groupId: s.groupId, passwordChanged: s.passwordChanged,
  })));
});

router.get("/faculty/domains", async (req, res): Promise<void> => {
  const facultyId = req.user!.id;
  const rows = await db.select().from(domainsTable).where(eq(domainsTable.facultyId, facultyId)).orderBy(domainsTable.name);
  res.json(rows.map((d) => ({
    id: d.id, name: d.name, description: d.description,
    facultyId: d.facultyId, facultyName: req.user!.name,
  })));
});

router.post("/faculty/domains", async (req, res): Promise<void> => {
  const parsed = Schemas.CreateDomainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [d] = await db.insert(domainsTable).values({
    facultyId: req.user!.id,
    name: parsed.data.name.trim(),
    description: parsed.data.description ?? null,
  }).returning();
  res.json({
    id: d!.id, name: d!.name, description: d!.description,
    facultyId: d!.facultyId, facultyName: req.user!.name,
  });
});

router.delete("/faculty/domains/:domainId", async (req, res): Promise<void> => {
  const domainId = String(req.params.domainId);
  const [d] = await db.select().from(domainsTable).where(and(eq(domainsTable.id, domainId), eq(domainsTable.facultyId, req.user!.id))).limit(1);
  if (!d) {
    res.status(404).json({ error: "Domain not found" });
    return;
  }
  const [used] = await db.select({ c: count() }).from(groupsTable).where(eq(groupsTable.domainId, domainId));
  if ((used?.c ?? 0) > 0) {
    res.status(400).json({ error: "Cannot delete a domain that has groups assigned." });
    return;
  }
  await db.delete(domainsTable).where(eq(domainsTable.id, domainId));
  res.json({ ok: true });
});

router.post("/faculty/attendance", async (req, res): Promise<void> => {
  const parsed = Schemas.MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const facultyId = req.user!.id;
  const { date, entries } = parsed.data;
  const myStudents = await studentsUnderFaculty(facultyId);
  const myStudentIds = new Set(myStudents.map((s) => s.id));
  for (const e of entries) {
    if (!myStudentIds.has(e.studentId)) continue;
    // upsert
    const [existing] = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.studentId, e.studentId), eq(attendanceTable.date, date)))
      .limit(1);
    if (existing) {
      await db.update(attendanceTable).set({ status: e.status, facultyId }).where(eq(attendanceTable.id, existing.id));
    } else {
      await db.insert(attendanceTable).values({
        studentId: e.studentId, facultyId, date, status: e.status,
      });
    }
  }
  res.json({ ok: true });
});

router.get("/faculty/attendance", async (req, res): Promise<void> => {
  const date = String(req.query.date ?? "");
  if (!date) { res.status(400).json({ error: "date is required" }); return; }
  const facultyId = req.user!.id;
  const myStudents = await studentsUnderFaculty(facultyId);
  if (myStudents.length === 0) { res.json([]); return; }
  const studentIds = myStudents.map((s) => s.id);
  const rows = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.date, date), inArray(attendanceTable.studentId, studentIds)));
  const byStudent = new Map(rows.map((r) => [r.studentId, r]));
  res.json(myStudents.map((s) => {
    const r = byStudent.get(s.id);
    return {
      id: r?.id ?? `na-${s.id}`,
      studentId: s.id,
      studentName: s.name,
      rollNumber: s.rollNumber,
      date,
      status: r?.status ?? "absent",
    };
  }));
});

router.post("/faculty/email", async (req, res): Promise<void> => {
  const parsed = Schemas.SendEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const facultyId = req.user!.id;
  const { recipientStudentIds, subject, body } = parsed.data;
  const myStudents = await studentsUnderFaculty(facultyId);
  const allowed = new Map(myStudents.map((s) => [s.id, s]));
  const filteredIds = recipientStudentIds.filter((id) => allowed.has(id));
  if (filteredIds.length === 0) {
    res.status(400).json({ error: "No valid recipients." });
    return;
  }
  const names = filteredIds.map((id) => allowed.get(id)!.name);
  await db.insert(emailLogsTable).values({
    facultyId, subject, body,
    recipientStudentIds: filteredIds,
    recipientNames: names,
  });
  // also drop a notification for each recipient
  for (const id of filteredIds) {
    await db.insert(notificationsTable).values({
      recipientType: "student",
      recipientId: id,
      title: `Message from ${req.user!.name}`,
      body: `${subject}\n\n${body}`,
    });
  }
  res.json({ ok: true });
});

router.get("/faculty/emails", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(emailLogsTable)
    .where(eq(emailLogsTable.facultyId, req.user!.id))
    .orderBy(desc(emailLogsTable.sentAt))
    .limit(100);
  res.json(rows.map((e) => ({
    id: e.id, subject: e.subject, body: e.body,
    recipientCount: e.recipientStudentIds.length,
    recipientNames: e.recipientNames,
    sentAt: e.sentAt.toISOString(),
  })));
});

router.get("/faculty/notifications", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.recipientType, "faculty"),
      eq(notificationsTable.recipientId, req.user!.id),
    ))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(rows.map((n) => ({
    id: n.id, title: n.title, body: n.body, read: n.read,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/faculty/notifications/:notificationId/read", async (req, res): Promise<void> => {
  const id = String(req.params.notificationId);
  await db.update(notificationsTable).set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, req.user!.id)));
  res.json({ ok: true });
});

router.post("/faculty/performance", async (req, res): Promise<void> => {
  const parsed = Schemas.RecordPerformanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const facultyId = req.user!.id;
  const myStudents = await studentsUnderFaculty(facultyId);
  if (!myStudents.find((s) => s.id === parsed.data.studentId)) {
    res.status(400).json({ error: "Student not under your mentorship." });
    return;
  }
  await db.insert(performanceTable).values({
    studentId: parsed.data.studentId,
    facultyId,
    score: parsed.data.score,
    notes: parsed.data.notes ?? null,
    period: parsed.data.period,
  });
  res.json({ ok: true });
});

router.get("/faculty/performance/report", async (req, res): Promise<void> => {
  const period = String(req.query.period ?? "weekly");
  const groupId = req.query.groupId ? String(req.query.groupId) : null;
  const facultyId = req.user!.id;
  let students = await studentsUnderFaculty(facultyId);
  if (groupId) students = students.filter((s) => s.groupId === groupId);
  if (students.length === 0) {
    res.json({ period, averageScore: 0, topPerformer: null, entries: [], attendanceByStudent: [] });
    return;
  }
  const studentIds = students.map((s) => s.id);
  const sinceDate = period === "weekly"
    ? new Date(Date.now() - 7 * 86400_000)
    : period === "monthly"
      ? new Date(Date.now() - 30 * 86400_000)
      : new Date(Date.now() - 180 * 86400_000);

  const perfRows = await db
    .select()
    .from(performanceTable)
    .where(and(
      inArray(performanceTable.studentId, studentIds),
      eq(performanceTable.period, period),
      gte(performanceTable.recordedAt, sinceDate),
    ))
    .orderBy(desc(performanceTable.recordedAt));

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const entries = perfRows.map((p) => {
    const s = studentMap.get(p.studentId)!;
    return {
      id: p.id,
      studentId: p.studentId,
      studentName: s.name,
      rollNumber: s.rollNumber,
      score: p.score,
      notes: p.notes,
      period: p.period,
      recordedAt: p.recordedAt.toISOString(),
    };
  });

  const avg = entries.length > 0 ? entries.reduce((a, b) => a + b.score, 0) / entries.length : 0;

  // top performer = highest avg score across entries
  const byStudent = new Map<string, number[]>();
  for (const e of entries) {
    if (!byStudent.has(e.studentId)) byStudent.set(e.studentId, []);
    byStudent.get(e.studentId)!.push(e.score);
  }
  let top: { studentId: string; name: string; rollNumber: string; score: number } | null = null;
  for (const [sid, scores] of byStudent) {
    const a = scores.reduce((x, y) => x + y, 0) / scores.length;
    if (!top || a > top.score) {
      const s = studentMap.get(sid)!;
      top = { studentId: sid, name: s.name, rollNumber: s.rollNumber, score: Number(a.toFixed(2)) };
    }
  }

  // attendance by student in same window
  const attRows = await db
    .select()
    .from(attendanceTable)
    .where(and(
      inArray(attendanceTable.studentId, studentIds),
      gte(attendanceTable.createdAt, sinceDate),
    ));
  const attByStudent = new Map<string, { p: number; t: number }>();
  for (const r of attRows) {
    if (!attByStudent.has(r.studentId)) attByStudent.set(r.studentId, { p: 0, t: 0 });
    const x = attByStudent.get(r.studentId)!;
    x.t++;
    if (r.status === "present") x.p++;
  }
  const attendanceByStudent = students.map((s) => {
    const x = attByStudent.get(s.id);
    return {
      studentId: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      attendancePercent: x && x.t > 0 ? Number(((x.p / x.t) * 100).toFixed(1)) : 0,
    };
  });

  res.json({
    period,
    averageScore: Number(avg.toFixed(2)),
    topPerformer: top,
    entries,
    attendanceByStudent,
  });
});

export default router;
