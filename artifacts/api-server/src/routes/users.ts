import { Router, type IRouter } from "express";
import { db, usersTable, userExamAccessTable, examsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import {
  GetUsersResponse,
  UpdateUserParams,
  UpdateUserBody,
  UpdateUserResponse,
  DeleteUserParams,
} from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  const mapped = users.map(u => ({ ...u, email: u.email ?? null, provider: u.provider ?? null }));
  res.json(GetUsersResponse.parse(mapped));
});

router.put("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, string> = { role: parsed.data.role };
  if (parsed.data.name) updateData.name = parsed.data.name;
  const [user] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json(UpdateUserResponse.parse({ ...user, email: user.email ?? null, provider: user.provider ?? null }));
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/users/:id/exam-access", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const rows = await db.select().from(userExamAccessTable).where(eq(userExamAccessTable.userId, userId));
  res.json(rows.map(r => ({ examId: r.examId, isUnlocked: r.isUnlocked })));
});

const UpdateSubscriptionBody = z.object({ subscriptionStatus: z.boolean() });

router.put("/users/:id/subscription", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = UpdateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }

  const [user] = await db.update(usersTable)
    .set({ subscriptionStatus: parsed.data.subscriptionStatus })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  res.json({ ...user, email: user.email ?? null, provider: user.provider ?? null });
});

const SetExamAccessBody = z.object({ isUnlocked: z.boolean() });

router.put("/users/:id/exam-access/:examId", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  const examId = parseInt(req.params.examId);
  if (isNaN(userId) || isNaN(examId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }
  const parsed = SetExamAccessBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }

  const existing = await db.select().from(userExamAccessTable)
    .where(and(eq(userExamAccessTable.userId, userId), eq(userExamAccessTable.examId, examId)));

  if (existing.length > 0) {
    await db.update(userExamAccessTable)
      .set({ isUnlocked: parsed.data.isUnlocked })
      .where(and(eq(userExamAccessTable.userId, userId), eq(userExamAccessTable.examId, examId)));
  } else {
    await db.insert(userExamAccessTable).values({ userId, examId, isUnlocked: parsed.data.isUnlocked });
  }
  res.json({ examId, isUnlocked: parsed.data.isUnlocked });
});

router.post("/users/:id/unlock-all", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

  await db.update(usersTable)
    .set({ subscriptionStatus: true })
    .where(eq(usersTable.id, userId));

  res.json({ success: true });
});

export default router;
