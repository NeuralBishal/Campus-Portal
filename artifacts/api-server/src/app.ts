import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import { loadUser } from "./middlewares/auth";
import { mountStaticFrontend } from "./lib/staticFiles";

const app: Express = express();

app.set("trust proxy", true);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const isProd = process.env["NODE_ENV"] === "production";

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // Same-origin (no Origin header) is always fine.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // In dev with no allowlist, reflect the origin (for Replit preview).
      if (!isProd && allowedOrigins.length === 0) return cb(null, true);
      // In prod with no allowlist, treat as single-origin deploy: reject all
      // cross-origin requests. Set ALLOWED_ORIGINS to opt in.
      cb(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check routes (no authentication required)
app.use("/api", healthRouter);

// Main API routes (with authentication)
app.use("/api", loadUser, router);

// Serve the built React frontend (single-service deploy on Render etc.)
// No-op when the static dir doesn't exist (e.g. local dev where Vite serves it).
mountStaticFrontend(app);

export default app;
