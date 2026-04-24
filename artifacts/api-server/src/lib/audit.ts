import { db, auditLogsTable } from "@workspace/db";

export async function recordAudit(opts: {
  actorRole: string;
  actorId?: string | null;
  actorName: string;
  action: string;
  details?: string;
}): Promise<void> {
  await db.insert(auditLogsTable).values({
    actorRole: opts.actorRole,
    actorId: opts.actorId ?? null,
    actorName: opts.actorName,
    action: opts.action,
    details: opts.details ?? null,
  });
}
