import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

function createLimiter(opts: {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string;
  message?: string;
}) {
  const buckets = new Map<string, Bucket>();

  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }, Math.max(opts.windowMs, 60_000)).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = opts.keyFn(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: opts.message ?? "Too many requests. Please try again later.",
      });
      return;
    }
    next();
  };
}

function ipOf(req: Request): string {
  const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return fwd || req.ip || req.socket.remoteAddress || "unknown";
}

export const loginRateLimiter = createLimiter({
  windowMs: 15 * 60_000,
  max: 20,
  keyFn: (req) => {
    const ident = (req.body?.identifier ?? req.body?.email ?? "")
      .toString()
      .toLowerCase()
      .slice(0, 80);
    return `${ipOf(req)}|${ident}`;
  },
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

export const registerRateLimiter = createLimiter({
  windowMs: 60 * 60_000,
  max: 5,
  keyFn: (req) => ipOf(req),
  message: "Too many registration attempts. Please try again later.",
});
