import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { broadcastChange } from "../sse";
import {
  CreateQuestionBody,
  UpdateQuestionParams,
  UpdateQuestionBody,
  UpdateQuestionResponse,
  DeleteQuestionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/questions", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [question] = await db.insert(questionsTable).values(parsed.data).returning();
  broadcastChange("questions");
  res.status(201).json(question);
});

router.put("/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [question] = await db.update(questionsTable)
    .set(parsed.data)
    .where(eq(questionsTable.id, params.data.id))
    .returning();
  if (!question) {
    res.status(404).json({ error: "السؤال غير موجود" });
    return;
  }
  broadcastChange("questions");
  res.json(UpdateQuestionResponse.parse(question));
});

router.delete("/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(questionsTable).where(eq(questionsTable.id, params.data.id));
  broadcastChange("questions");
  res.sendStatus(204);
});

export default router;
