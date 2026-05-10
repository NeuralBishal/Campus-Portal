import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import {
  db,
  adminsTable,
  facultiesTable,
  studentsTable,
  securitySettingsTable,
} from "@workspace/db";
import { Schemas } from "@workspace/api-zod";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { createSession, destroySession, SESSION_COOKIE } from "../lib/sessions";
import { sessionCookieOptions, clearSessionCookieOptions } from "../lib/cookies";
import { recordAudit } from "../lib/audit";
import { requireAuth } from "../middlewares/auth";
import { loginRateLimiter, registerRateLimiter } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.post("/auth/login", loginRateLimiter, async (req, res): Promise<void> => {
  const parsed = Schemas.LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { role, identifier, password } = parsed.data;
  const ident = identifier.trim();

  const [settings] = await db.select().from(securitySettingsTable).limit(1);
  if (settings) {
    if (role === "student" && !settings.allowStudentLogin) {
      res.status(403).json({ error: "Student login is disabled by the administrator." });
      return;
    }
    if (role === "faculty" && !settings.allowFacultyLogin) {
      res.status(403).json({ error: "Faculty login is disabled by the administrator." });
      return;
    }
  }

  let userId: string | null = null;
  let userName = "";
  let mustChangePassword = false;

  if (role === "admin") {
    const [a] = await db.select().from(adminsTable).where(eq(adminsTable.email, ident.toLowerCase())).limit(1);
    if (!a || !verifyPassword(password, a.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    userId = a.id;
    userName = a.name;
    mustChangePassword = !a.passwordChanged;
  } else if (role === "faculty") {
    const [f] = await db.select().from(facultiesTable).where(eq(facultiesTable.facultyId, ident)).limit(1);
    if (!f || !verifyPassword(password, f.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    userId = f.id;
    userName = f.name;
    mustChangePassword = !f.passwordChanged && (settings?.requirePasswordChange ?? true);
  } else if (role === "student") {
    const [s] = await db.select().from(studentsTable).where(eq(studentsTable.rollNumber, ident)).limit(1);
    if (!s || !verifyPassword(password, s.passwordHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    userId = s.id;
    userName = s.name;
    mustChangePassword = !s.passwordChanged && (settings?.requirePasswordChange ?? true);
  }

  if (!userId) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sess = await createSession(userId, role);
  res.cookie(SESSION_COOKIE, sess.id, sessionCookieOptions(sess.expiresAt));

  await recordAudit({
    actorRole: role,
    actorId: userId,
    actorName: userName,
    action: "login",
    details: `Role: ${role}`,
  });

  res.json({
    authenticated: true,
    userId,
    role,
    name: userName,
    identifier: ident,
    mustChangePassword,
  });
});

router.get("/auth/registration-status", async (_req, res): Promise<void> => {
  const [row] = await db.select({ c: count() }).from(adminsTable);
  res.json({ allowed: (row?.c ?? 0) === 0 });
});

router.post("/auth/register-admin", registerRateLimiter, async (req, res): Promise<void> => {
  const [adminCountRow] = await db.select({ c: count() }).from(adminsTable);
  if ((adminCountRow?.c ?? 0) > 0) {
    res.status(403).json({ error: "Admin registration is disabled. An administrator already exists." });
    return;
  }

  const parsed = Schemas.CreateAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  const [settings] = await db.select().from(securitySettingsTable).limit(1);
  const minLen = settings?.minPasswordLength ?? 6;
  if (password.length < minLen) {
    res.status(400).json({ error: `Password must be at least ${minLen} characters.` });
    return;
  }

  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, cleanEmail)).limit(1);
  if (existing) {
    res.status(400).json({ error: "An admin with that email already exists." });
    return;
  }

  const [a] = await db.insert(adminsTable).values({
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password),
    passwordChanged: true,
  }).returning();

  await recordAudit({
    actorRole: "admin",
    actorId: a!.id,
    actorName: a!.name,
    action: "register_admin",
    details: `Self-registered admin ${a!.email}`,
  });

  const sess = await createSession(a!.id, "admin");
  res.cookie(SESSION_COOKIE, sess.id, sessionCookieOptions(sess.expiresAt));

  res.json({
    authenticated: true,
    userId: a!.id,
    role: "admin",
    name: a!.name,
    identifier: a!.email,
    mustChangePassword: false,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  await destroySession(sid);
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions());
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.user) {
    res.json({ authenticated: false, mustChangePassword: false });
    return;
  }
  res.json({
    authenticated: true,
    userId: req.user.id,
    role: req.user.role,
    name: req.user.name,
    identifier: req.user.identifier,
    mustChangePassword: !req.user.passwordChanged,
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = Schemas.ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const user = req.user!;

  const [settings] = await db.select().from(securitySettingsTable).limit(1);
  const minLen = settings?.minPasswordLength ?? 6;
  if (newPassword.length < minLen) {
    res.status(400).json({ error: `Password must be at least ${minLen} characters.` });
    return;
  }

  if (user.role === "admin") {
    const [a] = await db.select().from(adminsTable).where(eq(adminsTable.id, user.id)).limit(1);
    if (!a || !verifyPassword(currentPassword, a.passwordHash)) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }
    await db.update(adminsTable).set({ passwordHash: hashPassword(newPassword), passwordChanged: true }).where(eq(adminsTable.id, user.id));
  } else if (user.role === "faculty") {
    const [f] = await db.select().from(facultiesTable).where(eq(facultiesTable.id, user.id)).limit(1);
    if (!f || !verifyPassword(currentPassword, f.passwordHash)) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }
    await db.update(facultiesTable).set({ passwordHash: hashPassword(newPassword), passwordChanged: true }).where(eq(facultiesTable.id, user.id));
  } else if (user.role === "student") {
    const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, user.id)).limit(1);
    if (!s || !verifyPassword(currentPassword, s.passwordHash)) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }
    await db.update(studentsTable).set({ passwordHash: hashPassword(newPassword), passwordChanged: true }).where(eq(studentsTable.id, user.id));
  }

  await recordAudit({
    actorRole: user.role,
    actorId: user.id,
    actorName: user.name,
    action: "change_password",
  });

  res.json({ ok: true });
});

export default router;
