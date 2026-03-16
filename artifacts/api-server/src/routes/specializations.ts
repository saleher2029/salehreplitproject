import { Router, type IRouter } from "express";
import { db, specializationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { broadcastChange } from "../sse";
import {
  GetSpecializationsResponse,
  CreateSpecializationBody,
  UpdateSpecializationParams,
  UpdateSpecializationBody,
  UpdateSpecializationResponse,
  DeleteSpecializationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/specializations", async (_req, res): Promise<void> => {
  const specs = await db.select().from(specializationsTable).orderBy(specializationsTable.id);
  res.json(GetSpecializationsResponse.parse(specs));
});

router.post("/specializations", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSpecializationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [spec] = await db.insert(specializationsTable).values(parsed.data).returning();
  broadcastChange("specializations");
  res.status(201).json(spec);
});

router.put("/specializations/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateSpecializationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSpecializationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [spec] = await db.update(specializationsTable)
    .set(parsed.data)
    .where(eq(specializationsTable.id, params.data.id))
    .returning();
  if (!spec) {
    res.status(404).json({ error: "التخصص غير موجود" });
    return;
  }
  broadcastChange("specializations");
  res.json(UpdateSpecializationResponse.parse(spec));
});

router.delete("/specializations/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteSpecializationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(specializationsTable).where(eq(specializationsTable.id, params.data.id));
  broadcastChange("specializations");
  res.sendStatus(204);
});

export default router;
