import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { logger } from "./logger";

export function mountStaticFrontend(app: Express): void {
  const configured = process.env["STATIC_DIR"];
  const candidates = [
    configured,
    path.resolve(process.cwd(), "artifacts/campus-portal/dist"),
    path.resolve(process.cwd(), "../campus-portal/dist"),
    path.resolve(process.cwd(), "dist/public"),
  ].filter(Boolean) as string[];

  const staticDir = candidates.find((p) => existsSync(path.join(p, "index.html")));

  if (!staticDir) {
    logger.warn(
      { tried: candidates },
      "Static frontend directory not found — serving API only. Set STATIC_DIR to enable single-service mode.",
    );
    return;
  }

  logger.info({ staticDir }, "Serving frontend from static directory");

  app.use(
    express.static(staticDir, {
      index: false,
      maxAge: "1h",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  const indexHtml = path.join(staticDir, "index.html");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
}
