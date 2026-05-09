import { pgTable, text, timestamp, integer, boolean, real, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminsTable = pgTable("admins", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordChanged: boolean("password_changed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facultiesTable = pgTable("faculties", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  facultyId: text("faculty_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  department: text("department"),
  passwordHash: text("password_hash").notNull(),
  passwordChanged: boolean("password_changed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentsTable = pgTable("students", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  rollNumber: text("roll_number").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  department: text("department"),
  passwordHash: text("password_hash").notNull(),
  passwordChanged: boolean("password_changed").notNull().default(false),
  groupId: text("group_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const domainsTable = pgTable("domains", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  facultyId: text("faculty_id").notNull().references(() => facultiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupsTable = pgTable("groups", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  projectTitle: text("project_title").notNull(),
  description: text("description"),
  facultyId: text("faculty_id").notNull().references(() => facultiesTable.id, { onDelete: "cascade" }),
  domainId: text("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("assigned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceTable = pgTable("attendance", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: text("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  facultyId: text("faculty_id").notNull().references(() => facultiesTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("attendance_student_date_unique").on(t.studentId, t.date),
  byFacultyDate: index("attendance_faculty_date_idx").on(t.facultyId, t.date),
}));

export const performanceTable = pgTable("performance_entries", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: text("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  facultyId: text("faculty_id").notNull().references(() => facultiesTable.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  notes: text("notes"),
  period: text("period").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailLogsTable = pgTable("email_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  facultyId: text("faculty_id").notNull().references(() => facultiesTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientStudentIds: jsonb("recipient_student_ids").notNull().$type<string[]>(),
  recipientNames: jsonb("recipient_names").notNull().$type<string[]>(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientType: text("recipient_type").notNull(),
  recipientId: text("recipient_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byRecipient: index("notifications_recipient_idx").on(t.recipientType, t.recipientId),
}));

export const auditLogsTable = pgTable("audit_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  actorRole: text("actor_role").notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sheetsConfigTable = pgTable("sheets_config", {
  id: text("id").primaryKey().default("singleton"),
  studentSheetUrl: text("student_sheet_url"),
  facultySheetUrl: text("faculty_sheet_url"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  autoSyncEnabled: boolean("auto_sync_enabled").notNull().default(true),
});

export const securitySettingsTable = pgTable("security_settings", {
  id: text("id").primaryKey().default("singleton"),
  sessionTimeoutMinutes: integer("session_timeout_minutes").notNull().default(120),
  minPasswordLength: integer("min_password_length").notNull().default(6),
  requirePasswordChange: boolean("require_password_change").notNull().default(true),
  allowStudentLogin: boolean("allow_student_login").notNull().default(true),
  allowFacultyLogin: boolean("allow_faculty_login").notNull().default(true),
});

export const superadminsTable = pgTable("superadmins", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webauthnCredentialsTable = pgTable("webauthn_credentials", {
  id: text("id").primaryKey(),
  superadminId: text("superadmin_id").notNull().references(() => superadminsTable.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: jsonb("transports").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  bySuperadmin: index("webauthn_credentials_superadmin_idx").on(t.superadminId),
}));

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => ({
  byUser: index("sessions_user_idx").on(t.userId),
}));

export type Admin = typeof adminsTable.$inferSelect;
export type Faculty = typeof facultiesTable.$inferSelect;
export type Student = typeof studentsTable.$inferSelect;
export type Domain = typeof domainsTable.$inferSelect;
export type Group = typeof groupsTable.$inferSelect;
export type Attendance = typeof attendanceTable.$inferSelect;
export type Performance = typeof performanceTable.$inferSelect;
export type EmailLog = typeof emailLogsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type SheetsConfig = typeof sheetsConfigTable.$inferSelect;
export type SecuritySettings = typeof securitySettingsTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type Superadmin = typeof superadminsTable.$inferSelect;
export type WebauthnCredential = typeof webauthnCredentialsTable.$inferSelect;
