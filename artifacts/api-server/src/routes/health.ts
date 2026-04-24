import { Router, type IRouter } from "express";
import { Schemas } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = Schemas.HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
