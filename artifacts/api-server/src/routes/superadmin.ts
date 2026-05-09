import { Router, type IRouter } from "express";
import { eq, or, desc } from "drizzle-orm";
import {
  db,
  adminsTable,
  superadminsTable,
  webauthnCredentialsTable,
} from "@workspace/db";
import { hashPassword } from "../lib/passwords";
import { createSession, destroySession, SESSION_COOKIE } from "../lib/sessions";
import { recordAudit } from "../lib/audit";
import { requireRole } from "../middlewares/auth";
import { loginRateLimiter, registerRateLimiter } from "../middlewares/rateLimit";
import {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  consumeChallenge,
  clearFingerprintFailures,
  getFingerprintFailures,
  isFallbackUnlocked,
  recordFingerprintFailure,
  verifyAuthentication,
  verifyRegistration,
  FINGERPRINT_LOCKOUT_THRESHOLD,
} from "../lib/webauthn";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

function setSessionCookie(res: any, sess: { id: string; expiresAt: Date }): void {
  res.cookie(SESSION_COOKIE, sess.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    expires: sess.expiresAt,
    path: "/",
  });
}

router.post("/superadmin/register/options", registerRateLimiter, async (req, res): Promise<void> => {
  const { name, email, phone } = (req.body ?? {}) as { name?: string; email?: string; phone?: string };
  if (!name || !email || !phone) {
    res.status(400).json({ error: "Name, email, and phone are required." });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  const existing = await db.select().from(superadminsTable)
    .where(or(eq(superadminsTable.email, cleanEmail), eq(superadminsTable.phone, cleanPhone)))
    .limit(1);
  if (existing.length) {
    res.status(400).json({ error: "A superadmin with that email or phone already exists." });
    return;
  }
  const userID = randomUUID();
  const options = await buildRegistrationOptions(req, {
    userID,
    userName: cleanEmail,
    userDisplayName: name.trim(),
    email: cleanEmail,
  });
  res.json({ options, pending: { userID, name: name.trim(), email: cleanEmail, phone: cleanPhone } });
});

router.post("/superadmin/register/verify", async (req, res): Promise<void> => {
  const { attestation, pending } = (req.body ?? {}) as {
    attestation?: any;
    pending?: { userID: string; name: string; email: string; phone: string };
  };
  if (!attestation || !pending) {
    res.status(400).json({ error: "Missing attestation or pending registration data." });
    return;
  }
  const challengeStr: string | undefined = attestation?.response?.clientDataJSON
    ? JSON.parse(Buffer.from(attestation.response.clientDataJSON, "base64").toString("utf8")).challenge
    : undefined;
  if (!challengeStr) {
    res.status(400).json({ error: "Invalid attestation: no challenge." });
    return;
  }
  const ctx = consumeChallenge(challengeStr);
  if (!ctx || ctx.email !== pending.email) {
    res.status(400).json({ error: "Challenge expired or invalid." });
    return;
  }

  let verification;
  try {
    verification = await verifyRegistration(req, attestation, challengeStr);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Registration verification failed." });
    return;
  }
  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: "Could not verify registration." });
    return;
  }
  const dup = await db.select().from(superadminsTable)
    .where(or(eq(superadminsTable.email, pending.email), eq(superadminsTable.phone, pending.phone)))
    .limit(1);
  if (dup.length) {
    res.status(400).json({ error: "A superadmin with that email or phone already exists." });
    return;
  }
  const [sa] = await db.insert(superadminsTable).values({
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
  }).returning();

  const cred = verification.registrationInfo.credential;
  await db.insert(webauthnCredentialsTable).values({
    id: cred.id,
    superadminId: sa!.id,
    publicKey: Buffer.from(cred.publicKey).toString("base64"),
    counter: cred.counter ?? 0,
    transports: (cred.transports as string[] | undefined) ?? [],
  });

  await recordAudit({
    actorRole: "superadmin",
    actorId: sa!.id,
    actorName: sa!.name,
    action: "superadmin_register",
    details: `Registered superadmin ${sa!.email}`,
  });

  const sess = await createSession(sa!.id, "superadmin");
  setSessionCookie(res, sess);
  clearFingerprintFailures(pending.email);
  res.json({ authenticated: true, userId: sa!.id, role: "superadmin", name: sa!.name, identifier: sa!.email, mustChangePassword: false });
});

router.get("/superadmin/login/attempts", async (req, res): Promise<void> => {
  const email = String(req.query["email"] ?? "").trim().toLowerCase();
  const failures = email ? getFingerprintFailures(email) : 0;
  res.json({
    failures,
    threshold: FINGERPRINT_LOCKOUT_THRESHOLD,
    fallbackUnlocked: email ? isFallbackUnlocked(email) : false,
  });
});

router.post("/superadmin/login/options", loginRateLimiter, async (req, res): Promise<void> => {
  const email = String((req.body?.email ?? "")).trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }
  const [sa] = await db.select().from(superadminsTable).where(eq(superadminsTable.email, email)).limit(1);
  if (!sa) {
    res.status(404).json({ error: "No superadmin found with that email." });
    return;
  }
  const creds = await db.select().from(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.superadminId, sa.id));
  if (!creds.length) {
    res.status(400).json({ error: "No fingerprint credentials registered for this account." });
    return;
  }
  const options = await buildAuthenticationOptions(req, {
    email,
    allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
  });
  res.json({ options });
});

router.post("/superadmin/login/verify", loginRateLimiter, async (req, res): Promise<void> => {
  const { assertion, email } = (req.body ?? {}) as { assertion?: any; email?: string };
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  if (!assertion || !cleanEmail) {
    res.status(400).json({ error: "Missing assertion or email." });
    return;
  }
  const challengeStr: string | undefined = assertion?.response?.clientDataJSON
    ? JSON.parse(Buffer.from(assertion.response.clientDataJSON, "base64").toString("utf8")).challenge
    : undefined;
  if (!challengeStr) {
    res.status(400).json({ error: "Invalid assertion: no challenge." });
    return;
  }
  const ctx = consumeChallenge(challengeStr);
  if (!ctx || ctx.email !== cleanEmail) {
    res.status(400).json({ error: "Challenge expired or invalid." });
    return;
  }

  const credId = String(assertion.id ?? "");
  const [cred] = await db.select().from(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.id, credId)).limit(1);
  if (!cred) {
    const failures = recordFingerprintFailure(cleanEmail);
    res.status(400).json({ error: "Unknown credential.", failures, fallbackUnlocked: failures >= FINGERPRINT_LOCKOUT_THRESHOLD });
    return;
  }
  const [sa] = await db.select().from(superadminsTable).where(eq(superadminsTable.id, cred.superadminId)).limit(1);
  if (!sa || sa.email !== cleanEmail) {
    const failures = recordFingerprintFailure(cleanEmail);
    res.status(400).json({ error: "Credential does not match account.", failures, fallbackUnlocked: failures >= FINGERPRINT_LOCKOUT_THRESHOLD });
    return;
  }

  let verification;
  try {
    verification = await verifyAuthentication(req, assertion, challengeStr, {
      id: cred.id,
      publicKey: cred.publicKey,
      counter: cred.counter,
    });
  } catch (e: any) {
    const failures = recordFingerprintFailure(cleanEmail);
    res.status(400).json({ error: e?.message || "Authentication failed.", failures, fallbackUnlocked: failures >= FINGERPRINT_LOCKOUT_THRESHOLD });
    return;
  }
  if (!verification.verified) {
    const failures = recordFingerprintFailure(cleanEmail);
    res.status(400).json({ error: "Fingerprint did not match.", failures, fallbackUnlocked: failures >= FINGERPRINT_LOCKOUT_THRESHOLD });
    return;
  }
  await db.update(webauthnCredentialsTable)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(webauthnCredentialsTable.id, cred.id));

  clearFingerprintFailures(cleanEmail);
  await recordAudit({
    actorRole: "superadmin",
    actorId: sa.id,
    actorName: sa.name,
    action: "superadmin_login_fingerprint",
  });
  const sess = await createSession(sa.id, "superadmin");
  setSessionCookie(res, sess);
  res.json({ authenticated: true, userId: sa.id, role: "superadmin", name: sa.name, identifier: sa.email, mustChangePassword: false });
});

router.post("/superadmin/login/fallback", loginRateLimiter, async (req, res): Promise<void> => {
  const { email, phone } = (req.body ?? {}) as { email?: string; phone?: string };
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanPhone = String(phone ?? "").trim();
  if (!cleanEmail || !cleanPhone) {
    res.status(400).json({ error: "Email and phone are required." });
    return;
  }
  if (!isFallbackUnlocked(cleanEmail)) {
    res.status(403).json({ error: `Fallback login is locked. Try fingerprint at least ${FINGERPRINT_LOCKOUT_THRESHOLD} times first.` });
    return;
  }
  const [sa] = await db.select().from(superadminsTable).where(eq(superadminsTable.email, cleanEmail)).limit(1);
  if (!sa || sa.phone !== cleanPhone) {
    res.status(401).json({ error: "Email and phone did not match a registered superadmin." });
    return;
  }
  clearFingerprintFailures(cleanEmail);
  await recordAudit({
    actorRole: "superadmin",
    actorId: sa.id,
    actorName: sa.name,
    action: "superadmin_login_fallback",
    details: "Email + phone fallback login",
  });
  const sess = await createSession(sa.id, "superadmin");
  setSessionCookie(res, sess);
  res.json({ authenticated: true, userId: sa.id, role: "superadmin", name: sa.name, identifier: sa.email, mustChangePassword: false });
});

router.post("/superadmin/logout", async (req, res): Promise<void> => {
  const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  await destroySession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.use("/superadmin", requireRole("superadmin"));

router.get("/superadmin/me", async (req, res): Promise<void> => {
  const u = req.user!;
  const [sa] = await db.select().from(superadminsTable).where(eq(superadminsTable.id, u.id)).limit(1);
  res.json({ id: sa!.id, name: sa!.name, email: sa!.email, phone: sa!.phone, createdAt: sa!.createdAt.toISOString() });
});

router.get("/superadmin/admins", async (_req, res): Promise<void> => {
  const rows = await db.select().from(adminsTable).orderBy(desc(adminsTable.createdAt));
  res.json(rows.map((a) => ({ id: a.id, name: a.name, email: a.email, createdAt: a.createdAt.toISOString() })));
});

router.post("/superadmin/admins", async (req, res): Promise<void> => {
  const { name, email, password } = (req.body ?? {}) as { name?: string; email?: string; password?: string };
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, cleanEmail)).limit(1);
  if (existing) {
    res.status(400).json({ error: "An admin with that email already exists." });
    return;
  }
  const [a] = await db.insert(adminsTable).values({
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPassword(password),
    passwordChanged: false,
  }).returning();
  await recordAudit({
    actorRole: "superadmin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "superadmin_create_admin",
    details: `Created admin ${a!.email}`,
  });
  res.json({ id: a!.id, name: a!.name, email: a!.email, createdAt: a!.createdAt.toISOString() });
});

router.delete("/superadmin/admins/:adminId", async (req, res): Promise<void> => {
  const adminId = String(req.params.adminId);
  await db.delete(adminsTable).where(eq(adminsTable.id, adminId));
  await recordAudit({
    actorRole: "superadmin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "superadmin_delete_admin",
    details: `Deleted admin ${adminId}`,
  });
  res.json({ ok: true });
});

router.post("/superadmin/admins/bulk-upload", async (req, res): Promise<void> => {
  const { rows } = (req.body ?? {}) as { rows?: Array<{ name?: string; email?: string; password?: string }> };
  if (!Array.isArray(rows) || !rows.length) {
    res.status(400).json({ error: "No rows supplied." });
    return;
  }
  const created: Array<{ email: string }> = [];
  const skipped: Array<{ email: string; reason: string }> = [];
  for (const r of rows) {
    const name = (r?.name ?? "").trim();
    const email = (r?.email ?? "").trim().toLowerCase();
    const password = (r?.password ?? "").trim() || email.split("@")[0] || "changeme";
    if (!name || !email) { skipped.push({ email: email || "(blank)", reason: "Missing name or email" }); continue; }
    const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
    if (existing) { skipped.push({ email, reason: "Already exists" }); continue; }
    await db.insert(adminsTable).values({
      name,
      email,
      passwordHash: hashPassword(password),
      passwordChanged: false,
    });
    created.push({ email });
  }
  await recordAudit({
    actorRole: "superadmin",
    actorId: req.user!.id,
    actorName: req.user!.name,
    action: "superadmin_bulk_upload_admins",
    details: `Created ${created.length}, skipped ${skipped.length}`,
  });
  res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
});

export default router;
