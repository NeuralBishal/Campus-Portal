import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  adminsTable,
  facultiesTable,
  studentsTable,
  superadminsTable,
} from "@workspace/db";
import { getSession, SESSION_COOKIE } from "../lib/sessions";

export type AuthRole = "student" | "faculty" | "admin" | "superadmin";

export type AuthUser = {
  id: string;
  role: AuthRole;
  name: string;
  identifier: string;
  passwordChanged: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const sess = await getSession(sid);
  if (!sess) {
    next();
    return;
  }
  if (sess.role === "admin") {
    const [a] = await db.select().from(adminsTable).where(eq(adminsTable.id, sess.userId)).limit(1);
    if (a) {
      req.user = {
        id: a.id,
        role: "admin",
        name: a.name,
        identifier: a.email,
        passwordChanged: a.passwordChanged,
      };
    }
  } else if (sess.role === "faculty") {
    const [f] = await db.select().from(facultiesTable).where(eq(facultiesTable.id, sess.userId)).limit(1);
    if (f) {
      req.user = {
        id: f.id,
        role: "faculty",
        name: f.name,
        identifier: f.facultyId,
        passwordChanged: f.passwordChanged,
      };
    }
  } else if (sess.role === "superadmin") {
    const [sa] = await db.select().from(superadminsTable).where(eq(superadminsTable.id, sess.userId)).limit(1);
    if (sa) {
      req.user = {
        id: sa.id,
        role: "superadmin",
        name: sa.name,
        identifier: sa.email,
        passwordChanged: true,
      };
    }
  } else if (sess.role === "student") {
    const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, sess.userId)).limit(1);
    if (s) {
      req.user = {
        id: s.id,
        role: "student",
        name: s.name,
        identifier: s.rollNumber,
        passwordChanged: s.passwordChanged,
      };
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(role: AuthRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
