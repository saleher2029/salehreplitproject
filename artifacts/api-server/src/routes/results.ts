import { Router, type IRouter } from "express";
import { db, examResultsTable, answerDetailsTable, questionsTable, examsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  GetMyResultsResponse,
  SubmitExamBody,
  GetResultParams,
  GetResultResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/results", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const results = await db.select({
    id: examResultsTable.id,
    examId: examResultsTable.examId,
    userId: examResultsTable.userId,
    score: examResultsTable.score,
    totalQuestions: examResultsTable.totalQuestions,
    percentage: examResultsTable.percentage,
    completedAt: examResultsTable.completedAt,
    examTitle: examsTable.title,
  })
    .from(examResultsTable)
    .leftJoin(examsTable, eq(examResultsTable.examId, examsTable.id))
    .where(eq(examResultsTable.userId, user.id))
    .orderBy(examResultsTable.completedAt);

  const mapped = results.map(r => ({ ...r, examTitle: r.examTitle ?? "اختبار محذوف" }));
  res.json(GetMyResultsResponse.parse(mapped));
});

router.post("/results", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = SubmitExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { examId, answers } = parsed.data;

  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
  if (questions.length === 0) {
    res.status(404).json({ error: "الاختبار غير موجود أو لا يحتوي على أسئلة" });
    return;
  }

  let score = 0;
  const answerMap = new Map(answers.map(a => [a.questionId, a.selectedOption]));

  for (const question of questions) {
    const selected = answerMap.get(question.id);
    if (selected === question.correctOption) {
      score++;
    }
  }

  const percentage = Math.round((score / questions.length) * 100);

  const [result] = await db.insert(examResultsTable).values({
    userId: user.id,
    examId,
    score,
    totalQuestions: questions.length,
    percentage,
  }).returning();

  for (const question of questions) {
    const selected = answerMap.get(question.id) ?? "A";
    const isCorrect = selected === question.correctOption ? 1 : 0;
    await db.insert(answerDetailsTable).values({
      resultId: result.id,
      questionId: question.id,
      selectedOption: selected,
      isCorrect,
    });
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  const answerDetails = questions.map(q => ({
    questionId: q.id,
    questionText: q.text,
    questionImage: q.imageUrl ?? null,
    selectedOption: answerMap.get(q.id) ?? "A",
    correctOption: q.correctOption,
    isCorrect: answerMap.get(q.id) === q.correctOption,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
  }));

  res.status(201).json({
    id: result.id,
    examId: result.examId,
    examTitle: exam?.title ?? "اختبار",
    userId: result.userId,
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    completedAt: result.completedAt,
    answers: answerDetails,
  });
});

router.get("/results/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = GetResultParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [result] = await db.select().from(examResultsTable).where(eq(examResultsTable.id, params.data.id));
  if (!result) {
    res.status(404).json({ error: "النتيجة غير موجودة" });
    return;
  }
  if (result.userId !== user.id && user.role !== "admin" && user.role !== "supervisor") {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, result.examId));
  const answerDetailRows = await db.select().from(answerDetailsTable).where(eq(answerDetailsTable.resultId, result.id));
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, result.examId));

  const questionMap = new Map(questions.map(q => [q.id, q]));
  const answers = answerDetailRows.map(ad => {
    const q = questionMap.get(ad.questionId);
    return {
      questionId: ad.questionId,
      questionText: q?.text ?? "",
      questionImage: q?.imageUrl ?? null,
      selectedOption: ad.selectedOption,
      correctOption: q?.correctOption ?? "",
      isCorrect: ad.isCorrect === 1,
      optionA: q?.optionA ?? "",
      optionB: q?.optionB ?? "",
      optionC: q?.optionC ?? "",
      optionD: q?.optionD ?? "",
    };
  });

  res.json(GetResultResponse.parse({
    id: result.id,
    examId: result.examId,
    examTitle: exam?.title ?? "اختبار محذوف",
    userId: result.userId,
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    completedAt: result.completedAt,
    answers,
  }));
});

export default router;
