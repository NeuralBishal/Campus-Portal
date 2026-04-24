import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db, sessionsTable, securitySettingsTable } from "@workspace/db";

export const SESSION_COOKIE = "campus_session";

export async function createSession(userId: string, role: string): Promise<{ id: string; expiresAt: Date }> {
  const [settings] = await db.select().from(securitySettingsTable).limit(1);
  const minutes = settings?.sessionTimeoutMinutes ?? 120;
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + minutes * 60_000);
  await db.insert(sessionsTable).values({ id, userId, role, expiresAt });
  return { id, expiresAt };
}

export async function getSession(id: string | undefined): Promise<{ userId: string; role: string } | null> {
  if (!id) return null;
  const [s] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id)).limit(1);
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
    return null;
  }
  return { userId: s.userId, role: s.role };
}

export async function destroySession(id: string | undefined): Promise<void> {
  if (!id) return;
  await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}
