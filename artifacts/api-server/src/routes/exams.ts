import { Router, type IRouter } from "express";
import { db, examsTable, questionsTable, unitsTable, subjectsTable, examTargetUnitsTable, usersTable, userExamAccessTable } from "@workspace/db";
import { eq, count, and, inArray } from "drizzle-orm";
import { requireAdmin, optionalAuth } from "../lib/auth";
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

async function computeLockedStatus(userId: number, examIds: number[]): Promise<Map<number, boolean>> {
  const lockedMap = new Map<number, boolean>();
  if (examIds.length === 0) return lockedMap;

  const [userRow] = await db.select({ subscriptionStatus: usersTable.subscriptionStatus })
    .from(usersTable).where(eq(usersTable.id, userId));

  if (userRow?.subscriptionStatus) {
    examIds.forEach(id => lockedMap.set(id, false));
    return lockedMap;
  }

  const accessRows = await db.select()
    .from(userExamAccessTable)
    .where(and(eq(userExamAccessTable.userId, userId), inArray(userExamAccessTable.examId, examIds)));

  const unlockedSet = new Set(accessRows.filter(r => r.isUnlocked).map(r => r.examId));
  examIds.forEach(id => lockedMap.set(id, !unlockedSet.has(id)));
  return lockedMap;
}

router.get("/exams", optionalAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const isAdmin = user && (user.role === "admin" || user.role === "supervisor");
  const queryParsed = GetExamsQueryParams.safeParse(req.query);
  let exams;
  if (queryParsed.success && queryParsed.data.unitId) {
    const unitId = queryParsed.data.unitId;
    const directExams = await db.select().from(examsTable)
      .where(isAdmin ? eq(examsTable.unitId, unitId) : and(eq(examsTable.unitId, unitId), eq(examsTable.isPublished, true)))
      .orderBy(examsTable.id);
    const linkedRows = await db.select({ examId: examTargetUnitsTable.examId })
      .from(examTargetUnitsTable)
      .where(eq(examTargetUnitsTable.unitId, unitId));
    const linkedExamIds = linkedRows.map(r => r.examId).filter(id => !directExams.some(e => e.id === id));
    let linkedExams: typeof directExams = [];
    if (linkedExamIds.length > 0) {
      linkedExams = await db.select().from(examsTable)
        .where(isAdmin ? inArray(examsTable.id, linkedExamIds) : and(inArray(examsTable.id, linkedExamIds), eq(examsTable.isPublished, true)))
        .orderBy(examsTable.id);
    }
    exams = [...directExams, ...linkedExams];
  } else {
    exams = isAdmin
      ? await db.select().from(examsTable).orderBy(examsTable.id)
      : await db.select().from(examsTable).where(eq(examsTable.isPublished, true)).orderBy(examsTable.id);
  }

  const examsWithCount = await Promise.all(exams.map(async (exam) => {
    const [{ count: qCount }] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
    return { ...exam, questionCount: Number(qCount) };
  }));

  if (isAdmin) {
    res.json(GetExamsResponse.parse(examsWithCount.map(e => ({ ...e, isLocked: false }))));
    return;
  }

  if (user) {
    const examIds = examsWithCount.map(e => e.id);
    const lockedMap = await computeLockedStatus(user.id, examIds);
    const withLocked = examsWithCount.map(e => ({ ...e, isLocked: lockedMap.get(e.id) ?? true }));
    res.json(GetExamsResponse.parse(withLocked));
  } else {
    res.json(GetExamsResponse.parse(examsWithCount.map(e => ({ ...e, isLocked: true }))));
  }
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

router.get("/exams/:id", optionalAuth, async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = (req as any).user;
  const isAdmin = user && (user.role === "admin" || user.role === "supervisor");
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!exam) {
    res.status(404).json({ error: "الاختبار غير موجود" });
    return;
  }
  if (!exam.isPublished && !isAdmin) {
    res.status(404).json({ error: "الاختبار غير موجود" });
    return;
  }

  if (!isAdmin && user) {
    const lockedMap = await computeLockedStatus(user.id, [exam.id]);
    if (lockedMap.get(exam.id)) {
      res.status(403).json({ error: "هذا الاختبار مقفل. يرجى الاشتراك للوصول إليه." });
      return;
    }
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

router.patch("/exams/:id/publish", requireAdmin, async (req, res): Promise<void> => {
  const examId = parseInt(req.params.id);
  if (isNaN(examId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const { isPublished } = req.body as { isPublished?: boolean };
  if (typeof isPublished !== "boolean") { res.status(400).json({ error: "يجب تحديد حالة النشر" }); return; }
  const [exam] = await db.update(examsTable).set({ isPublished }).where(eq(examsTable.id, examId)).returning();
  if (!exam) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
  broadcastChange("exams");
  res.json({ id: exam.id, isPublished: exam.isPublished });
});

router.get("/exam-target-units", requireAdmin, async (req, res): Promise<void> => {
  const allLinks = await db.select().from(examTargetUnitsTable);
  const grouped: Record<number, number[]> = {};
  for (const link of allLinks) {
    if (!grouped[link.examId]) grouped[link.examId] = [];
    grouped[link.examId].push(link.unitId);
  }
  res.json(grouped);
});

router.get("/exams/:id/target-units", requireAdmin, async (req, res): Promise<void> => {
  const examId = parseInt(req.params.id);
  if (isNaN(examId)) { res.status(400).json({ error: "معرف الاختبار غير صالح" }); return; }
  const links = await db.select().from(examTargetUnitsTable)
    .where(eq(examTargetUnitsTable.examId, examId));
  res.json(links.map(l => l.unitId));
});

const normalizeName = (name: string) =>
  name.trim().replace(/\s+/g, " ")
    .replace(/آ/g, "ا").replace(/أ/g, "ا").replace(/إ/g, "ا").replace(/ٱ/g, "ا")
    .replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/َ|ُ|ِ|ّ|ْ|ٌ|ً|ٍ/g, "");

router.post("/exams/:id/link-to-specs", requireAdmin, async (req, res): Promise<void> => {
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

  const subjectNameNorm = normalizeName(subject.name);
  const unitNameNorm = normalizeName(unit.name);

  const existingLinks = await db.select().from(examTargetUnitsTable)
    .where(eq(examTargetUnitsTable.examId, examId));
  const alreadyLinkedUnitIds = new Set(existingLinks.map(l => l.unitId));

  const results: { specId: number; status: string; unitId?: number }[] = [];

  for (const specId of targetSpecIds) {
    try {
      const allSubsInSpec = await db.select().from(subjectsTable)
        .where(eq(subjectsTable.specializationId, specId));
      const candidates = allSubsInSpec.filter(s => {
        const targetNorm = normalizeName(s.name);
        return targetNorm === subjectNameNorm
          || targetNorm.startsWith(subjectNameNorm)
          || subjectNameNorm.startsWith(targetNorm);
      });
      if (candidates.length > 1) {
        const exact = candidates.find(s => normalizeName(s.name) === subjectNameNorm);
        if (exact) candidates.splice(0, candidates.length, exact);
      }
      const matchSubject = candidates[0];
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

      if (alreadyLinkedUnitIds.has(matchUnit.id)) {
        results.push({ specId, status: "الاختبار مرتبط بهذا التخصص مسبقاً" });
        continue;
      }

      await db.insert(examTargetUnitsTable).values({
        examId: examId,
        unitId: matchUnit.id,
      });

      results.push({ specId, status: "تم الربط بنجاح", unitId: matchUnit.id });
    } catch (err) {
      results.push({ specId, status: "حدث خطأ أثناء الربط" });
    }
  }

  broadcastChange("exams");
  res.json({ results });
});

router.post("/exams/:id/link-unit", requireAdmin, async (req, res): Promise<void> => {
  const examId = parseInt(req.params.id);
  const { unitId } = req.body as { unitId?: number };
  if (isNaN(examId) || !unitId) {
    res.status(400).json({ error: "معرفات غير صالحة" });
    return;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "الاختبار غير موجود" }); return; }
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, unitId));
  if (!unit) { res.status(404).json({ error: "الوحدة غير موجودة" }); return; }
  try {
    await db.insert(examTargetUnitsTable).values({ examId, unitId }).onConflictDoNothing();
    broadcastChange("exams");
    res.json({ status: "تم الربط بنجاح", examId, unitId });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ أثناء الربط" });
  }
});

router.post("/exams/:id/unlink-unit", requireAdmin, async (req, res): Promise<void> => {
  const examId = parseInt(req.params.id);
  const { unitId } = req.body as { unitId?: number };
  if (isNaN(examId) || !unitId) {
    res.status(400).json({ error: "معرفات غير صالحة" });
    return;
  }
  await db.delete(examTargetUnitsTable)
    .where(and(eq(examTargetUnitsTable.examId, examId), eq(examTargetUnitsTable.unitId, unitId)));
  broadcastChange("exams");
  res.sendStatus(204);
});

export default router;
