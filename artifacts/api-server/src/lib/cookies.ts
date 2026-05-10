import type { CookieOptions } from "express";

export function sessionCookieOptions(expiresAt: Date): CookieOptions {
  const isProd = process.env["NODE_ENV"] === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    expires: expiresAt,
    path: "/",
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  const isProd = process.env["NODE_ENV"] === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };
}
