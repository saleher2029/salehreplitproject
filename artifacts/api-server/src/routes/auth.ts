import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import {
  LoginAsGuestResponse,
  RegisterWithEmailBody,
  LoginWithEmailBody,
  LoginWithEmailResponse,
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

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterWithEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صحيحة" });
    return;
  }
  const { name, email, password } = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    role: "student",
    provider: "email",
    passwordHash,
  }).returning();
  const token = signToken(user.id);
  res.status(201).json(LoginWithEmailResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginWithEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صحيحة" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    return;
  }
  const token = signToken(user.id);
  res.json(LoginWithEmailResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
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
