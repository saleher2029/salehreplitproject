import { Router, type IRouter } from "express";
import { db, examResultsTable, answerDetailsTable, questionsTable, examsTable, usersTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  GetMyResultsResponse,
  SubmitExamBody,
  GetResultParams,
  GetResultResponse,
} from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

// ── My results list ──────────────────────────────────────────────────────────
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

// ── Submit exam ──────────────────────────────────────────────────────────────
router.post("/results", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = SubmitExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { examId, answers, bookmarkedQuestionIds } = parsed.data;

  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
  if (questions.length === 0) {
    res.status(404).json({ error: "الاختبار غير موجود أو لا يحتوي على أسئلة" });
    return;
  }

  let score = 0;
  const answerMap = new Map(answers.map(a => [a.questionId, a.selectedOption]));
  for (const question of questions) {
    if (answerMap.get(question.id) === question.correctOption) score++;
  }

  const percentage = Math.round((score / questions.length) * 100);
  const bookmarkedJson = bookmarkedQuestionIds?.length
    ? JSON.stringify(bookmarkedQuestionIds)
    : null;

  const [result] = await db.insert(examResultsTable).values({
    userId: user.id,
    examId,
    score,
    totalQuestions: questions.length,
    percentage,
    bookmarkedQuestions: bookmarkedJson,
  }).returning();

  for (const question of questions) {
    const selected = answerMap.get(question.id) ?? "A";
    await db.insert(answerDetailsTable).values({
      resultId: result.id,
      questionId: question.id,
      selectedOption: selected,
      isCorrect: selected === question.correctOption ? 1 : 0,
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
    difficulty: result.difficulty ?? null,
    notes: result.notes ?? null,
    bookmarkedQuestions: result.bookmarkedQuestions ?? null,
    answers: answerDetails,
  });
});

// ── IMPORTANT: /results/admin/notes MUST come before /results/:id ────────────
// ── Admin: all student notes ─────────────────────────────────────────────────
router.get("/results/admin/notes", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: examResultsTable.id,
      userId: examResultsTable.userId,
      examId: examResultsTable.examId,
      score: examResultsTable.score,
      totalQuestions: examResultsTable.totalQuestions,
      percentage: examResultsTable.percentage,
      completedAt: examResultsTable.completedAt,
      difficulty: examResultsTable.difficulty,
      notes: examResultsTable.notes,
      studentName: usersTable.name,
      examTitle: examsTable.title,
    })
    .from(examResultsTable)
    .leftJoin(usersTable, eq(examResultsTable.userId, usersTable.id))
    .leftJoin(examsTable, eq(examResultsTable.examId, examsTable.id))
    .where(isNotNull(examResultsTable.notes))
    .orderBy(examResultsTable.completedAt);

  res.json(rows.map(r => ({
    ...r,
    studentName: r.studentName ?? "مجهول",
    examTitle: r.examTitle ?? "اختبار محذوف",
  })));
});

// ── Submit feedback (difficulty + notes) ─────────────────────────────────────
const FeedbackBody = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  notes: z.string().max(2000).optional(),
});

router.put("/results/:id/feedback", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const resultId = parseInt(req.params.id);
  if (isNaN(resultId)) { res.status(400).json({ error: "معرّف غير صالح" }); return; }

  const [result] = await db.select().from(examResultsTable).where(eq(examResultsTable.id, resultId));
  if (!result) { res.status(404).json({ error: "النتيجة غير موجودة" }); return; }
  if (result.userId !== user.id) { res.status(403).json({ error: "غير مصرح" }); return; }

  const parsed = FeedbackBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "البيانات غير صالحة" }); return; }

  const [updated] = await db.update(examResultsTable)
    .set({ difficulty: parsed.data.difficulty ?? null, notes: parsed.data.notes ?? null })
    .where(eq(examResultsTable.id, resultId))
    .returning();

  res.json({ success: true, difficulty: updated.difficulty, notes: updated.notes });
});

// ── Get single result ─────────────────────────────────────────────────────────
router.get("/results/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = GetResultParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [result] = await db.select().from(examResultsTable).where(eq(examResultsTable.id, params.data.id));
  if (!result) { res.status(404).json({ error: "النتيجة غير موجودة" }); return; }
  if (result.userId !== user.id && user.role !== "admin" && user.role !== "supervisor") {
    res.status(403).json({ error: "غير مصرح" }); return;
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
    unitId: exam?.unitId ?? null,
    userId: result.userId,
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    completedAt: result.completedAt,
    difficulty: result.difficulty ?? null,
    notes: result.notes ?? null,
    bookmarkedQuestions: result.bookmarkedQuestions ?? null,
    answers,
  }));
});

export default router;
