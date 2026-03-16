import { Router, type IRouter } from "express";
import { db, subjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { broadcastChange } from "../sse";
import {
  GetSubjectsResponse,
  GetSubjectsQueryParams,
  CreateSubjectBody,
  UpdateSubjectParams,
  UpdateSubjectBody,
  UpdateSubjectResponse,
  DeleteSubjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/subjects", async (req, res): Promise<void> => {
  const queryParsed = GetSubjectsQueryParams.safeParse(req.query);
  let subjects;
  if (queryParsed.success && queryParsed.data.specializationId) {
    subjects = await db.select().from(subjectsTable)
      .where(eq(subjectsTable.specializationId, queryParsed.data.specializationId))
      .orderBy(subjectsTable.id);
  } else {
    subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);
  }
  res.json(GetSubjectsResponse.parse(subjects));
});

router.post("/subjects", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values(parsed.data).returning();
  broadcastChange("subjects");
  res.status(201).json(subject);
});

router.put("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db.update(subjectsTable)
    .set(parsed.data)
    .where(eq(subjectsTable.id, params.data.id))
    .returning();
  if (!subject) {
    res.status(404).json({ error: "المادة غير موجودة" });
    return;
  }
  broadcastChange("subjects");
  res.json(UpdateSubjectResponse.parse(subject));
});

router.delete("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.id));
  broadcastChange("subjects");
  res.sendStatus(204);
});

export default router;
