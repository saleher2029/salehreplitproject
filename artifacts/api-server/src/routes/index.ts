import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import specializationsRouter from "./specializations";
import subjectsRouter from "./subjects";
import unitsRouter from "./units";
import examsRouter from "./exams";
import questionsRouter from "./questions";
import resultsRouter from "./results";
import usersRouter from "./users";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(specializationsRouter);
router.use(subjectsRouter);
router.use(unitsRouter);
router.use(examsRouter);
router.use(questionsRouter);
router.use(resultsRouter);
router.use(usersRouter);
router.use(settingsRouter);

export default router;
