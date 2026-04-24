import { Router, type IRouter } from "express";
import { eq, desc, and, sql, count, isNull, inArray } from "drizzle-orm";
import {
  db,
  studentsTable,
  facultiesTable,
  groupsTable,
  domainsTable,
  attendanceTable,
  performanceTable,
  notificationsTable,
} from "@workspace/db";
import { Schemas } from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.use("/student", requireRole("student"));

const MAX_GROUP_SIZE = 4;
const MAX_GROUPS_PER_FACULTY = 3;

async function loadGroupForStudent(studentId: string) {
  const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!s || !s.groupId) return null;
  const [g] = await db.select().from(groupsTable).where(eq(groupsTable.id, s.groupId)).limit(1);
  if (!g) return null;
  const [f] = await db.select().from(facultiesTable).where(eq(facultiesTable.id, g.facultyId)).limit(1);
  const [d] = await db.select().from(domainsTable).where(eq(domainsTable.id, g.domainId)).limit(1);
  const members = await db.select().from(studentsTable).where(eq(studentsTable.groupId, g.id));
  return {
    id: g.id,
    projectTitle: g.projectTitle,
    description: g.description,
    facultyId: g.facultyId,
    facultyName: f?.name ?? "Unknown",
    domainId: g.domainId,
    domainName: d?.name ?? "Unknown",
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    members: members.map((m) => ({
      id: m.id, rollNumber: m.rollNumber, name: m.name, email: m.email,
      department: m.department, groupId: m.groupId, passwordChanged: m.passwordChanged,
    })),
  };
}

router.get("/student/dashboard", async (req, res): Promise<void> => {
  const studentId = req.user!.id;
  const group = await loadGroupForStudent(studentId);
  const att = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, studentId));
  const present = att.filter((a) => a.status === "present").length;
  const attPercent = att.length > 0 ? (present / att.length) * 100 : 0;
  const perf = await db.select().from(performanceTable).where(eq(performanceTable.studentId, studentId));
  const avgPerf = perf.length > 0 ? perf.reduce((a, b) => a + b.score, 0) / perf.length : 0;
  const [unread] = await db
    .select({ c: count() })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.recipientType, "student"),
      eq(notificationsTable.recipientId, studentId),
      eq(notificationsTable.read, false),
    ));
  const recent = await db
    .select()
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.recipientType, "student"),
      eq(notificationsTable.recipientId, studentId),
    ))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(5);
  res.json({
    hasGroup: !!group,
    group,
    attendancePercent: Number(attPercent.toFixed(1)),
    averagePerformance: Number(avgPerf.toFixed(2)),
    unreadNotifications: unread?.c ?? 0,
    recentNotifications: recent.map((n) => ({
      id: n.id, title: n.title, body: n.body, read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

router.get("/student/group", async (req, res): Promise<void> => {
  const g = await loadGroupForStudent(req.user!.id);
  res.json(g ?? null);
});

router.get("/student/available-faculties", async (_req, res): Promise<void> => {
  const faculties = await db.select().from(facultiesTable).orderBy(facultiesTable.name);
  const groupCounts = await db
    .select({ facultyId: groupsTable.facultyId, c: count() })
    .from(groupsTable)
    .groupBy(groupsTable.facultyId);
  const countMap = new Map(groupCounts.map((g) => [g.facultyId, g.c]));
  const allDomains = await db.select().from(domainsTable);
  const result = faculties
    .map((f) => {
      const gc = countMap.get(f.id) ?? 0;
      return {
        id: f.id,
        facultyId: f.facultyId,
        name: f.name,
        department: f.department,
        groupCount: gc,
        domains: allDomains
          .filter((d) => d.facultyId === f.id)
          .map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            facultyId: d.facultyId,
            facultyName: f.name,
          })),
      };
    })
    .filter((f) => f.groupCount < MAX_GROUPS_PER_FACULTY && f.domains.length > 0);
  res.json(result);
});

router.get("/student/free-students", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(studentsTable)
    .where(isNull(studentsTable.groupId))
    .orderBy(studentsTable.rollNumber);
  res.json(rows
    .filter((s) => s.id !== req.user!.id)
    .map((s) => ({
      id: s.id, rollNumber: s.rollNumber, name: s.name, email: s.email,
      department: s.department, groupId: s.groupId, passwordChanged: s.passwordChanged,
    })));
});

router.post("/student/groups", async (req, res): Promise<void> => {
  const parsed = Schemas.CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const studentId = req.user!.id;
  const { projectTitle, description, memberRollNumbers, facultyId, domainId } = parsed.data;

  const [me] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!me) { res.status(404).json({ error: "Student not found" }); return; }
  if (me.groupId) { res.status(400).json({ error: "You are already in a group." }); return; }

  // Resolve teammates
  const cleanRolls = Array.from(new Set(memberRollNumbers.map((r) => r.trim()).filter((r) => r.length > 0 && r !== me.rollNumber)));
  if (cleanRolls.length + 1 > MAX_GROUP_SIZE) {
    res.status(400).json({ error: `A group can have at most ${MAX_GROUP_SIZE} members (you + ${MAX_GROUP_SIZE - 1}).` });
    return;
  }
  let teammates: typeof studentsTable.$inferSelect[] = [];
  if (cleanRolls.length > 0) {
    teammates = await db.select().from(studentsTable).where(inArray(studentsTable.rollNumber, cleanRolls));
    if (teammates.length !== cleanRolls.length) {
      res.status(400).json({ error: "One or more roll numbers were not found." });
      return;
    }
    const conflict = teammates.find((t) => t.groupId);
    if (conflict) {
      res.status(400).json({ error: `${conflict.name} (${conflict.rollNumber}) is already in another group.` });
      return;
    }
  }

  // Faculty + domain checks
  const [faculty] = await db.select().from(facultiesTable).where(eq(facultiesTable.id, facultyId)).limit(1);
  if (!faculty) { res.status(400).json({ error: "Faculty not found." }); return; }
  const [domain] = await db.select().from(domainsTable).where(and(eq(domainsTable.id, domainId), eq(domainsTable.facultyId, facultyId))).limit(1);
  if (!domain) { res.status(400).json({ error: "Domain does not belong to that faculty." }); return; }
  const [fcountRow] = await db.select({ c: count() }).from(groupsTable).where(eq(groupsTable.facultyId, facultyId));
  if ((fcountRow?.c ?? 0) >= MAX_GROUPS_PER_FACULTY) {
    res.status(400).json({ error: `${faculty.name} already has the maximum of ${MAX_GROUPS_PER_FACULTY} groups.` });
    return;
  }

  // Create group, assign students
  const [group] = await db.insert(groupsTable).values({
    projectTitle: projectTitle.trim(),
    description: description ?? null,
    facultyId,
    domainId,
    status: "assigned",
  }).returning();

  const allMemberIds = [studentId, ...teammates.map((t) => t.id)];
  await db.update(studentsTable).set({ groupId: group!.id }).where(inArray(studentsTable.id, allMemberIds));

  // Notify faculty
  const memberNames = [me.name, ...teammates.map((t) => t.name)].join(", ");
  await db.insert(notificationsTable).values({
    recipientType: "faculty",
    recipientId: facultyId,
    title: `New group assigned: ${group!.projectTitle}`,
    body: `Domain: ${domain.name}\nMembers: ${memberNames}`,
  });
  // Notify each teammate
  for (const t of teammates) {
    await db.insert(notificationsTable).values({
      recipientType: "student",
      recipientId: t.id,
      title: `You were added to a project group`,
      body: `${me.name} added you to "${group!.projectTitle}" under ${faculty.name}.`,
    });
  }

  const full = await loadGroupForStudent(studentId);
  res.json(full!);
});

router.get("/student/notifications", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.recipientType, "student"),
      eq(notificationsTable.recipientId, req.user!.id),
    ))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(rows.map((n) => ({
    id: n.id, title: n.title, body: n.body, read: n.read,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/student/notifications/:notificationId/read", async (req, res): Promise<void> => {
  const id = String(req.params.notificationId);
  await db.update(notificationsTable).set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, req.user!.id)));
  res.json({ ok: true });
});

router.get("/student/attendance", async (req, res): Promise<void> => {
  const studentId = req.user!.id;
  const rows = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.studentId, studentId))
    .orderBy(desc(attendanceTable.date));
  const total = rows.length;
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;
  const me = req.user!;
  res.json({
    totalSessions: total,
    presentCount: present,
    absentCount: absent,
    lateCount: late,
    attendancePercent: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
    entries: rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: me.name,
      rollNumber: me.identifier,
      date: r.date,
      status: r.status,
    })),
  });
});

router.get("/student/performance", async (req, res): Promise<void> => {
  const studentId = req.user!.id;
  const me = req.user!;
  const rows = await db
    .select()
    .from(performanceTable)
    .where(eq(performanceTable.studentId, studentId))
    .orderBy(desc(performanceTable.recordedAt));
  res.json(rows.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    studentName: me.name,
    rollNumber: me.identifier,
    score: p.score,
    notes: p.notes,
    period: p.period,
    recordedAt: p.recordedAt.toISOString(),
  })));
});

export default router;
