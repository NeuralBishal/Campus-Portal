import app from "./app";
import { logger } from "./lib/logger";
import { ensureSeed } from "./lib/seed";
import { startBackgroundSync } from "./lib/sheets";
import { purgeExpiredSessions } from "./lib/sessions";
import { describeCookieMode } from "./lib/cookies";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info(
    {
      port,
      nodeEnv: process.env["NODE_ENV"] ?? "(unset)",
      allowedOrigins: process.env["ALLOWED_ORIGINS"] ?? "(unset, allowing all)",
      cookieMode: describeCookieMode(),
    },
    "Server listening",
  );

  try {
    await ensureSeed();
    startBackgroundSync();
    purgeExpiredSessions().catch((e) => logger.warn({ err: e }, "Initial session purge failed"));
    setInterval(() => {
      purgeExpiredSessions().catch((e) => logger.warn({ err: e }, "Session purge failed"));
    }, 30 * 60_000).unref();
  } catch (e) {
    logger.error({ err: e }, "Startup tasks failed");
  }
});
