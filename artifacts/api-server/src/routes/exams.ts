import { Router, type IRouter } from "express";
import { db, examsTable, questionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import {
  GetExamsResponse,
  GetExamsQueryParams,
  CreateExamBody,
  GetExamParams,
  GetExamResponse,
  UpdateExamParams,
  UpdateExamBody,
  UpdateExamResponse,
  DeleteExamParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/exams", async (req, res): Promise<void> => {
  const queryParsed = GetExamsQueryParams.safeParse(req.query);
  let exams;
  if (queryParsed.success && queryParsed.data.unitId) {
    exams = await db.select().from(examsTable)
      .where(eq(examsTable.unitId, queryParsed.data.unitId))
      .orderBy(examsTable.id);
  } else {
    exams = await db.select().from(examsTable).orderBy(examsTable.id);
  }
  const examsWithCount = await Promise.all(exams.map(async (exam) => {
    const [{ count: qCount }] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
    return { ...exam, questionCount: Number(qCount) };
  }));
  res.json(GetExamsResponse.parse(examsWithCount));
});

router.post("/exams", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [exam] = await db.insert(examsTable).values(parsed.data).returning();
  res.status(201).json({ ...exam, questionCount: 0 });
});

router.get("/exams/:id", async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!exam) {
    res.status(404).json({ error: "الاختبار غير موجود" });
    return;
  }
  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.examId, exam.id))
    .orderBy(questionsTable.orderIndex);
  res.json(GetExamResponse.parse({ ...exam, questionCount: questions.length, questions }));
});

router.put("/exams/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [exam] = await db.update(examsTable)
    .set(parsed.data)
    .where(eq(examsTable.id, params.data.id))
    .returning();
  if (!exam) {
    res.status(404).json({ error: "الاختبار غير موجود" });
    return;
  }
  const [{ count: qCount }] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
  res.json(UpdateExamResponse.parse({ ...exam, questionCount: Number(qCount) }));
});

router.delete("/exams/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(examsTable).where(eq(examsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
