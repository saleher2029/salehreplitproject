import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function ensureSettings() {
  const rows = await db.select().from(siteSettingsTable);
  if (rows.length === 0) {
    const [created] = await db.insert(siteSettingsTable).values({
      whatsappNumber: "+970599000000",
      subscriptionInfo: "للاشتراك في الموقع، يرجى التواصل معنا عبر واتساب",
    }).returning();
    return created;
  }
  return rows[0];
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureSettings();
  const rows = await db.select().from(siteSettingsTable);
  const existing = rows[0];
  const { eq } = await import("drizzle-orm");
  const [settings] = await db.update(siteSettingsTable)
    .set(parsed.data)
    .where(eq(siteSettingsTable.id, existing.id))
    .returning();
  res.json(UpdateSettingsResponse.parse(settings));
});

export default router;
