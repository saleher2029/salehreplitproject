import { Router, type IRouter } from "express";
import { db, unitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import {
  GetUnitsResponse,
  GetUnitsQueryParams,
  CreateUnitBody,
  UpdateUnitParams,
  UpdateUnitBody,
  UpdateUnitResponse,
  DeleteUnitParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/units", async (req, res): Promise<void> => {
  const queryParsed = GetUnitsQueryParams.safeParse(req.query);
  let units;
  if (queryParsed.success && queryParsed.data.subjectId) {
    units = await db.select().from(unitsTable)
      .where(eq(unitsTable.subjectId, queryParsed.data.subjectId))
      .orderBy(unitsTable.id);
  } else {
    units = await db.select().from(unitsTable).orderBy(unitsTable.id);
  }
  res.json(GetUnitsResponse.parse(units));
});

router.post("/units", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUnitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [unit] = await db.insert(unitsTable).values(parsed.data).returning();
  res.status(201).json(unit);
});

router.put("/units/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUnitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUnitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [unit] = await db.update(unitsTable)
    .set(parsed.data)
    .where(eq(unitsTable.id, params.data.id))
    .returning();
  if (!unit) {
    res.status(404).json({ error: "الوحدة غير موجودة" });
    return;
  }
  res.json(UpdateUnitResponse.parse(unit));
});

router.delete("/units/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteUnitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(unitsTable).where(eq(unitsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
