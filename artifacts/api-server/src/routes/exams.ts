import { Router, type IRouter } from "express";
import { db, examsTable, questionsTable, unitsTable, subjectsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { broadcastChange } from "../sse";
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
  broadcastChange("exams");
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
  broadcastChange("exams");
  res.json(UpdateExamResponse.parse({ ...exam, questionCount: Number(qCount) }));
});

router.delete("/exams/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(examsTable).where(eq(examsTable.id, params.data.id));
  broadcastChange("exams");
  res.sendStatus(204);
});

router.post("/exams/:id/duplicate-to-specs", requireAdmin, async (req, res): Promise<void> => {
  const examId = parseInt(req.params.id);
  if (isNaN(examId)) { res.status(400).json({ error: "معرف الاختبار غير صالح" }); return; }

  const { specializationIds } = req.body as { specializationIds?: number[] };
  if (!specializationIds || !Array.isArray(specializationIds) || specializationIds.length === 0) {
    res.status(400).json({ error: "يجب تحديد تخصص واحد على الأقل" });
    return;
  }

  const uniqueSpecIds = [...new Set(specializationIds.filter(id => typeof id === "number" && id > 0))];
  if (uniqueSpecIds.length === 0) {
    res.status(400).json({ error: "معرفات التخصصات غير صالحة" });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }

  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.examId, examId))
    .orderBy(questionsTable.orderIndex);

  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, exam.unitId));
  if (!unit) { res.status(404).json({ error: "الوحدة غير موجودة" }); return; }
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, unit.subjectId));
  if (!subject) { res.status(404).json({ error: "المادة غير موجودة" }); return; }

  const sourceSpecId = subject.specializationId;
  const targetSpecIds = uniqueSpecIds.filter(id => id !== sourceSpecId);
  if (targetSpecIds.length === 0) {
    res.status(400).json({ error: "جميع التخصصات المحددة هي نفس تخصص الاختبار الأصلي" });
    return;
  }

  const normalizeName = (name: string) =>
    name.trim().replace(/\s+/g, " ")
      .replace(/آ/g, "ا").replace(/أ/g, "ا").replace(/إ/g, "ا").replace(/ٱ/g, "ا")
      .replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/َ|ُ|ِ|ّ|ْ|ٌ|ً|ٍ/g, "");

  const results: { specId: number; status: string; examId?: number }[] = [];
  const subjectNameNorm = normalizeName(subject.name);
  const unitNameNorm = normalizeName(unit.name);

  for (const specId of targetSpecIds) {
    try {
      const allSubsInSpec = await db.select().from(subjectsTable)
        .where(eq(subjectsTable.specializationId, specId));
      const matchSubject = allSubsInSpec.find(s => normalizeName(s.name) === subjectNameNorm);
      if (!matchSubject) {
        results.push({ specId, status: "لا توجد مادة بنفس الاسم في هذا التخصص" });
        continue;
      }
      const allUnitsInSub = await db.select().from(unitsTable)
        .where(eq(unitsTable.subjectId, matchSubject.id));
      const matchUnit = allUnitsInSub.find(u => normalizeName(u.name) === unitNameNorm);
      if (!matchUnit) {
        results.push({ specId, status: "لا توجد وحدة بنفس الاسم في هذا التخصص" });
        continue;
      }

      const existingExams = await db.select().from(examsTable)
        .where(and(eq(examsTable.unitId, matchUnit.id), eq(examsTable.title, exam.title)));
      if (existingExams.length > 0) {
        results.push({ specId, status: "يوجد اختبار بنفس الاسم في هذه الوحدة مسبقاً" });
        continue;
      }

      const [newExam] = await db.insert(examsTable).values({
        title: exam.title,
        unitId: matchUnit.id,
        timeLimit: exam.timeLimit,
        questionLimit: exam.questionLimit,
      }).returning();

      if (questions.length > 0) {
        await db.insert(questionsTable).values(
          questions.map(q => ({
            examId: newExam.id,
            text: q.text,
            imageUrl: q.imageUrl,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            orderIndex: q.orderIndex,
          }))
        );
      }

      results.push({ specId, status: "تم النسخ بنجاح", examId: newExam.id });
    } catch (err) {
      results.push({ specId, status: "حدث خطأ أثناء النسخ" });
    }
  }

  broadcastChange("exams");
  res.json({ results });
});

export default router;
