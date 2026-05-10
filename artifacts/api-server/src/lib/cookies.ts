import type { CookieOptions } from "express";

function isCrossSite(): boolean {
  if (process.env["COOKIE_CROSS_SITE"] === "true") return true;
  if (process.env["NODE_ENV"] === "production") return true;
  if ((process.env["ALLOWED_ORIGINS"] ?? "").trim() !== "") return true;
  return false;
}

export function sessionCookieOptions(expiresAt: Date): CookieOptions {
  const cross = isCrossSite();
  return {
    httpOnly: true,
    sameSite: cross ? "none" : "lax",
    secure: cross,
    expires: expiresAt,
    path: "/",
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  const cross = isCrossSite();
  return {
    httpOnly: true,
    sameSite: cross ? "none" : "lax",
    secure: cross,
    path: "/",
  };
}

export function describeCookieMode(): string {
  return isCrossSite() ? "cross-site (SameSite=None; Secure)" : "same-site (SameSite=Lax)";
}
