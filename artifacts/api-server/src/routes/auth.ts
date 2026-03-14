import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import {
  LoginAsGuestResponse,
  LoginWithGoogleBody,
  LoginWithGoogleResponse,
  LoginWithFacebookBody,
  LoginWithFacebookResponse,
  LoginAsAdminBody,
  LoginAsAdminResponse,
  GetCurrentUserResponse,
  LogoutResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/guest", async (_req, res): Promise<void> => {
  const guestName = `ضيف_${Math.floor(Math.random() * 100000)}`;
  const [user] = await db.insert(usersTable).values({
    name: guestName,
    role: "guest",
    provider: "guest",
  }).returning();
  const token = signToken(user.id);
  res.json(LoginAsGuestResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

router.post("/auth/google", async (req, res): Promise<void> => {
  const parsed = LoginWithGoogleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email } = parsed.data;
  let user;
  if (email) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      user = existing;
    }
  }
  if (!user) {
    const [created] = await db.insert(usersTable).values({
      name,
      email: email ?? null,
      role: "student",
      provider: "google",
    }).returning();
    user = created;
  }
  const token = signToken(user.id);
  res.json(LoginWithGoogleResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

router.post("/auth/facebook", async (req, res): Promise<void> => {
  const parsed = LoginWithFacebookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email } = parsed.data;
  let user;
  if (email) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      user = existing;
    }
  }
  if (!user) {
    const [created] = await db.insert(usersTable).values({
      name,
      email: email ?? null,
      role: "student",
      provider: "facebook",
    }).returning();
    user = created;
  }
  const token = signToken(user.id);
  res.json(LoginWithFacebookResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

router.post("/auth/admin", async (req, res): Promise<void> => {
  const parsed = LoginAsAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "tawjihi2024";

  if (username !== adminUsername || password !== adminPassword) {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, username));
    if (!user || user.role !== "admin" && user.role !== "supervisor") {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    const token = signToken(user.id);
    res.json(LoginAsAdminResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
    return;
  }

  let [adminUser] = await db.select().from(usersTable).where(eq(usersTable.email, adminUsername + "@admin"));
  if (!adminUser) {
    const [created] = await db.insert(usersTable).values({
      name: "المشرف الرئيسي",
      email: adminUsername + "@admin",
      role: "admin",
      provider: "local",
    }).returning();
    adminUser = created;
  }
  const token = signToken(adminUser.id);
  res.json(LoginAsAdminResponse.parse({ user: { ...adminUser, email: adminUser.email ?? null, provider: adminUser.provider ?? null }, token }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json(GetCurrentUserResponse.parse({ ...user, email: user.email ?? null, provider: user.provider ?? null }));
});

router.post("/auth/logout", (_req, res): void => {
  res.json(LogoutResponse.parse({ success: true }));
});

export default router;
