import { count } from "drizzle-orm";
import {
  db,
  adminsTable,
  facultiesTable,
  studentsTable,
  domainsTable,
  groupsTable,
  attendanceTable,
  performanceTable,
  sheetsConfigTable,
  securitySettingsTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { hashPassword } from "./passwords";
import { logger } from "./logger";

export async function ensureSeed(): Promise<void> {
  // Singletons
  const [secCount] = await db.select({ c: count() }).from(securitySettingsTable);
  if ((secCount?.c ?? 0) === 0) {
    await db.insert(securitySettingsTable).values({ id: "singleton" });
  }
  const [shCount] = await db.select({ c: count() }).from(sheetsConfigTable);
  if ((shCount?.c ?? 0) === 0) {
    await db.insert(sheetsConfigTable).values({ id: "singleton" });
  }

  // Default admin
  const [adminCount] = await db.select({ c: count() }).from(adminsTable);
  if ((adminCount?.c ?? 0) === 0) {
    await db.insert(adminsTable).values({
      name: "Default Admin",
      email: "admin@campus.edu",
      passwordHash: hashPassword("admin123"),
      passwordChanged: false,
    });
    logger.info("Seeded default admin: admin@campus.edu / admin123");
  }

  // Demo faculties + students if empty
  const [fc] = await db.select({ c: count() }).from(facultiesTable);
  if ((fc?.c ?? 0) === 0) {
    const [f1] = await db.insert(facultiesTable).values({
      facultyId: "FAC101", name: "Dr. Anita Rao", email: "anita.rao@campus.edu",
      department: "Computer Science",
      passwordHash: hashPassword("FAC101"),
      passwordChanged: false,
    }).returning();
    const [f2] = await db.insert(facultiesTable).values({
      facultyId: "FAC102", name: "Prof. Daniel Mehta", email: "daniel.mehta@campus.edu",
      department: "Electronics",
      passwordHash: hashPassword("FAC102"),
      passwordChanged: false,
    }).returning();
    const [f3] = await db.insert(facultiesTable).values({
      facultyId: "FAC103", name: "Dr. Priya Sharma", email: "priya.sharma@campus.edu",
      department: "Computer Science",
      passwordHash: hashPassword("FAC103"),
      passwordChanged: false,
    }).returning();

    // Domains
    const [d1] = await db.insert(domainsTable).values({ facultyId: f1!.id, name: "Machine Learning", description: "Applied ML projects with real datasets." }).returning();
    const [d2] = await db.insert(domainsTable).values({ facultyId: f1!.id, name: "Distributed Systems" }).returning();
    const [d3] = await db.insert(domainsTable).values({ facultyId: f2!.id, name: "Embedded IoT" }).returning();
    const [d4] = await db.insert(domainsTable).values({ facultyId: f3!.id, name: "Human-Computer Interaction" }).returning();

    // Students
    const studentSeeds = [
      { roll: "CS2101", name: "Aarav Kapoor", dept: "Computer Science" },
      { roll: "CS2102", name: "Diya Patel", dept: "Computer Science" },
      { roll: "CS2103", name: "Rohan Iyer", dept: "Computer Science" },
      { roll: "CS2104", name: "Meera Nair", dept: "Computer Science" },
      { roll: "CS2105", name: "Vikram Sethi", dept: "Computer Science" },
      { roll: "EC2201", name: "Ananya Bose", dept: "Electronics" },
      { roll: "EC2202", name: "Karthik Subramanian", dept: "Electronics" },
      { roll: "EC2203", name: "Sara Khan", dept: "Electronics" },
      { roll: "CS2106", name: "Ishaan Mehta", dept: "Computer Science" },
      { roll: "CS2107", name: "Nisha Verma", dept: "Computer Science" },
      { roll: "CS2108", name: "Aditya Joshi", dept: "Computer Science" },
      { roll: "CS2109", name: "Riya Sen", dept: "Computer Science" },
    ];
    const insertedStudents = [];
    for (const s of studentSeeds) {
      const [row] = await db.insert(studentsTable).values({
        rollNumber: s.roll, name: s.name, department: s.dept,
        email: `${s.roll.toLowerCase()}@campus.edu`,
        passwordHash: hashPassword(s.roll),
        passwordChanged: false,
      }).returning();
      insertedStudents.push(row!);
    }

    // Sample group under f1 / d1
    const [g1] = await db.insert(groupsTable).values({
      projectTitle: "Predicting Crop Yields with Satellite Imagery",
      description: "Train a CNN on Sentinel-2 tiles to forecast quarterly yields.",
      facultyId: f1!.id,
      domainId: d1!.id,
      status: "assigned",
    }).returning();
    const groupMembers = insertedStudents.slice(0, 4);
    for (const m of groupMembers) {
      await db.update(studentsTable).set({ groupId: g1!.id }).where((await import("drizzle-orm")).eq(studentsTable.id, m.id));
    }

    // Sample attendance for last 5 days for the group
    const today = new Date();
    for (let day = 4; day >= 0; day--) {
      const d = new Date(today.getTime() - day * 86400_000);
      const iso = d.toISOString().slice(0, 10);
      for (const m of groupMembers) {
        const status = (Math.random() < 0.85) ? "present" : (Math.random() < 0.5 ? "absent" : "late");
        await db.insert(attendanceTable).values({
          studentId: m.id, facultyId: f1!.id, date: iso, status,
        });
      }
    }

    // Sample performance entries (weekly)
    for (const m of groupMembers) {
      await db.insert(performanceTable).values({
        studentId: m.id, facultyId: f1!.id,
        score: Math.round((6.5 + Math.random() * 3.5) * 10) / 10,
        notes: "Initial sprint review",
        period: "weekly",
      });
    }

    // Notifications
    await db.insert(notificationsTable).values({
      recipientType: "faculty", recipientId: f1!.id,
      title: `New group assigned: Predicting Crop Yields with Satellite Imagery`,
      body: `Domain: Machine Learning\nMembers: ${groupMembers.map((m) => m.name).join(", ")}`,
    });

    await db.insert(auditLogsTable).values({
      actorRole: "system",
      actorName: "Seed",
      action: "seed_initial_data",
      details: `Seeded ${studentSeeds.length} students, 3 faculties, 4 domains, 1 group.`,
    });

    logger.info("Seeded faculties, students, domains and a sample group");
  }
}
