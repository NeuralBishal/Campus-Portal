import { eq, sql, inArray, notInArray } from "drizzle-orm";
import {
  db,
  studentsTable,
  facultiesTable,
  sheetsConfigTable,
  groupsTable,
} from "@workspace/db";
import { hashPassword } from "./passwords";
import { logger } from "./logger";

type ParsedRow = Record<string, string>;

function parseCsv(text: string): ParsedRow[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else { field += ch; }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim().length > 0))
    .map((r) => {
      const obj: ParsedRow = {};
      header.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return obj;
    });
}

export function toCsvUrl(url: string): string {
  // Convert any /edit?... or /view?... to /export?format=csv
  // Handles patterns like: docs.google.com/spreadsheets/d/<ID>/edit#gid=0 or /pubhtml
  try {
    const u = new URL(url);
    if (u.hostname.includes("docs.google.com")) {
      const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
      if (m) {
        const id = m[1];
        // try to preserve gid
        const gidMatch = (u.hash + "&" + u.search).match(/gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      }
      if (u.pathname.includes("/pub")) {
        // output=csv works for published sheets
        u.searchParams.set("output", "csv");
        return u.toString();
      }
    }
  } catch {
    /* ignore */
  }
  return url;
}

async function fetchCsv(url: string): Promise<ParsedRow[]> {
  const resolved = toCsvUrl(url);
  const r = await fetch(resolved, { redirect: "follow" });
  if (!r.ok) throw new Error(`Failed to fetch sheet (${r.status})`);
  const text = await r.text();
  return parseCsv(text);
}

function pick(row: ParsedRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v && v.length > 0) return v;
  }
  return "";
}

export async function syncFromSheets(): Promise<{
  studentsAdded: number;
  studentsRemoved: number;
  facultiesAdded: number;
  facultiesRemoved: number;
  message: string;
  ok: boolean;
}> {
  const [config] = await db.select().from(sheetsConfigTable).limit(1);
  if (!config) {
    return { studentsAdded: 0, studentsRemoved: 0, facultiesAdded: 0, facultiesRemoved: 0, ok: false, message: "No sheets configured." };
  }
  let studentsAdded = 0;
  let studentsRemoved = 0;
  let facultiesAdded = 0;
  let facultiesRemoved = 0;
  const messages: string[] = [];

  // Faculties first (so domains/groups are valid)
  if (config.facultySheetUrl) {
    try {
      const rows = await fetchCsv(config.facultySheetUrl);
      const incoming = rows
        .map((r) => ({
          facultyId: pick(r, ["facultyid", "faculty_id", "id", "empid", "employee id"]),
          name: pick(r, ["name", "fullname", "full name"]),
          email: pick(r, ["email", "mail"]),
          department: pick(r, ["department", "dept"]),
          initialPassword: pick(r, ["password", "initialpassword", "initial_password"]),
        }))
        .filter((r) => r.facultyId && r.name);

      const existing = await db.select().from(facultiesTable);
      const existingById = new Map(existing.map((f) => [f.facultyId, f]));
      const incomingIds = new Set(incoming.map((r) => r.facultyId));

      for (const r of incoming) {
        const e = existingById.get(r.facultyId);
        if (!e) {
          const initial = r.initialPassword || r.facultyId;
          await db.insert(facultiesTable).values({
            facultyId: r.facultyId,
            name: r.name,
            email: r.email || null,
            department: r.department || null,
            passwordHash: hashPassword(initial),
            passwordChanged: false,
          });
          facultiesAdded++;
        } else {
          await db.update(facultiesTable)
            .set({
              name: r.name,
              email: r.email || null,
              department: r.department || null,
            })
            .where(eq(facultiesTable.id, e.id));
        }
      }

      // Remove faculties not in sheet — keep their data only if they have groups (safety)
      const toRemove = existing.filter((e) => !incomingIds.has(e.facultyId));
      for (const f of toRemove) {
        await db.delete(facultiesTable).where(eq(facultiesTable.id, f.id));
        facultiesRemoved++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      messages.push(`Faculty sheet: ${msg}`);
      logger.error({ err }, "Faculty sheet sync failed");
    }
  }

  // Students
  if (config.studentSheetUrl) {
    try {
      const rows = await fetchCsv(config.studentSheetUrl);
      const incoming = rows
        .map((r) => ({
          rollNumber: pick(r, ["rollnumber", "roll_number", "roll number", "roll", "id"]),
          name: pick(r, ["name", "fullname", "full name"]),
          email: pick(r, ["email", "mail"]),
          department: pick(r, ["department", "dept", "branch"]),
          initialPassword: pick(r, ["password", "initialpassword", "initial_password"]),
        }))
        .filter((r) => r.rollNumber && r.name);

      const existing = await db.select().from(studentsTable);
      const existingByRoll = new Map(existing.map((s) => [s.rollNumber, s]));
      const incomingRolls = new Set(incoming.map((r) => r.rollNumber));

      for (const r of incoming) {
        const e = existingByRoll.get(r.rollNumber);
        if (!e) {
          const initial = r.initialPassword || r.rollNumber;
          await db.insert(studentsTable).values({
            rollNumber: r.rollNumber,
            name: r.name,
            email: r.email || null,
            department: r.department || null,
            passwordHash: hashPassword(initial),
            passwordChanged: false,
          });
          studentsAdded++;
        } else {
          await db.update(studentsTable)
            .set({
              name: r.name,
              email: r.email || null,
              department: r.department || null,
            })
            .where(eq(studentsTable.id, e.id));
        }
      }

      const toRemove = existing.filter((e) => !incomingRolls.has(e.rollNumber));
      for (const s of toRemove) {
        await db.delete(studentsTable).where(eq(studentsTable.id, s.id));
        studentsRemoved++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      messages.push(`Student sheet: ${msg}`);
      logger.error({ err }, "Student sheet sync failed");
    }
  }

  const ok = messages.length === 0;
  const summary = ok
    ? `Synced. Students +${studentsAdded}/-${studentsRemoved}; Faculties +${facultiesAdded}/-${facultiesRemoved}.`
    : messages.join(" | ");

  await db.update(sheetsConfigTable)
    .set({ lastSyncedAt: new Date(), lastSyncStatus: summary })
    .where(eq(sheetsConfigTable.id, config.id));

  return { studentsAdded, studentsRemoved, facultiesAdded, facultiesRemoved, ok, message: summary };
}

export function startBackgroundSync(): void {
  const intervalMs = 5 * 60_000; // 5 min
  setInterval(async () => {
    try {
      const [config] = await db.select().from(sheetsConfigTable).limit(1);
      if (config?.autoSyncEnabled && (config.studentSheetUrl || config.facultySheetUrl)) {
        await syncFromSheets();
      }
    } catch (err) {
      logger.error({ err }, "Background sheets sync failed");
    }
  }, intervalMs);
}
