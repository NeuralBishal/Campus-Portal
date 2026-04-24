import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const COST = 16384;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, KEYLEN, { N: COST }).toString("hex");
  return `scrypt$${COST}$${salt}$${derived}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") {
      return false;
    }
    const cost = Number(parts[1]);
    const salt = parts[2]!;
    const expected = Buffer.from(parts[3]!, "hex");
    const derived = scryptSync(plain, salt, KEYLEN, { N: cost });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
