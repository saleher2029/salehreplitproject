import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { sendPasswordResetEmail } from "../lib/email";
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
import { z } from "zod";

const router: IRouter = Router();

function generateSessionToken() {
  return crypto.randomUUID();
}

// ── Guest login ──────────────────────────────────────────────────────────────
router.post("/auth/guest", async (_req, res): Promise<void> => {
  const guestName = `ضيف_${Math.floor(Math.random() * 100000)}`;
  const sessionToken = generateSessionToken();
  const [user] = await db.insert(usersTable).values({
    name: guestName,
    role: "guest",
    provider: "guest",
    sessionToken,
  }).returning();
  const token = signToken(user.id, sessionToken);
  res.json(LoginAsGuestResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

// ── Register with email ──────────────────────────────────────────────────────
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
  const sessionToken = generateSessionToken();
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    role: "student",
    provider: "email",
    passwordHash,
    sessionToken,
  }).returning();
  const token = signToken(user.id, sessionToken);
  res.status(201).json(LoginWithEmailResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

// ── Login with email ─────────────────────────────────────────────────────────
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
  const sessionToken = generateSessionToken();
  await db.update(usersTable).set({ sessionToken }).where(eq(usersTable.id, user.id));
  const token = signToken(user.id, sessionToken);
  res.json(LoginWithEmailResponse.parse({ user: { ...user, email: user.email ?? null, provider: user.provider ?? null }, token }));
});

// ── Admin login ──────────────────────────────────────────────────────────────
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
    const sessionToken = generateSessionToken();
    await db.update(usersTable).set({ sessionToken }).where(eq(usersTable.id, user.id));
    const token = signToken(user.id, sessionToken);
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
  const sessionToken = generateSessionToken();
  await db.update(usersTable).set({ sessionToken }).where(eq(usersTable.id, adminUser.id));
  const token = signToken(adminUser.id, sessionToken);
  res.json(LoginAsAdminResponse.parse({ user: { ...adminUser, email: adminUser.email ?? null, provider: adminUser.provider ?? null }, token }));
});

// ── Get current user ─────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json(GetCurrentUserResponse.parse({ ...user, email: user.email ?? null, provider: user.provider ?? null }));
});

// ── Logout ───────────────────────────────────────────────────────────────────
router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db.update(usersTable).set({ sessionToken: null }).where(eq(usersTable.id, user.id));
  res.json(LogoutResponse.parse({ success: true }));
});

// ── Update profile (name) ────────────────────────────────────────────────────
const UpdateProfileBody = z.object({ name: z.string().min(2).max(60) });

router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "الاسم يجب أن يكون بين 2 و 60 حرف" });
    return;
  }
  const user = (req as any).user;
  const [updated] = await db
    .update(usersTable)
    .set({ name: parsed.data.name })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ ...updated, email: updated.email ?? null, provider: updated.provider ?? null });
});

// ── Forgot password ──────────────────────────────────────────────────────────
const ForgotPasswordBody = z.object({ email: z.string().email() });

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    return;
  }
  const { email } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || user.provider !== "email") {
    res.json({ message: "إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق" });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.update(usersTable)
    .set({ resetToken: rawToken, resetTokenExpiresAt: expiresAt })
    .where(eq(usersTable.id, user.id));

  const replitDomains = process.env.REPLIT_DOMAINS;
  const productionDomain = replitDomains ? replitDomains.split(",")[0].trim() : null;
  const siteUrl = process.env.SITE_URL
    || (productionDomain ? `https://${productionDomain}` : null)
    || `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const resetLink = `${siteUrl}/reset-password?token=${rawToken}`;

  const result = await sendPasswordResetEmail(email, user.name, resetLink);

  if (result.sent) {
    res.json({ message: "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني" });
  } else {
    res.json({
      message: "تم توليد رابط إعادة التعيين",
      resetLink: result.devLink,
    });
  }
});

// ── Reset password ───────────────────────────────────────────────────────────
const ResetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات غير صالحة" });
    return;
  }
  const { token, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, token));

  if (!user || !user.resetTokenExpiresAt) {
    res.status(400).json({ error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" });
    return;
  }
  if (new Date() > user.resetTokenExpiresAt) {
    res.status(400).json({ error: "انتهت صلاحية رابط إعادة التعيين، يرجى طلب رابط جديد" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const sessionToken = generateSessionToken();
  await db.update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null, sessionToken })
    .where(eq(usersTable.id, user.id));

  const newToken = signToken(user.id, sessionToken);
  res.json({ success: true, token: newToken, user: { ...user, passwordHash: null, resetToken: null, resetTokenExpiresAt: null } });
});

export default router;
