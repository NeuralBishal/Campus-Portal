import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import facultyRouter from "./faculty";
import studentRouter from "./student";
import superadminRouter from "./superadmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(facultyRouter);
router.use(studentRouter);
router.use(superadminRouter);

export default router;
