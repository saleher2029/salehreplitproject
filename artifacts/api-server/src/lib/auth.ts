import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "tawjihi-secret-key-2024";

export function signToken(userId: number, sessionToken: string): string {
  return jwt.sign({ userId, sessionToken }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number; sessionToken?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; sessionToken?: string };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "رمز غير صالح" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(401).json({ error: "المستخدم غير موجود" });
    return;
  }

  // ── Single device: reject if session was superseded ──────────────────────
  if (
    payload.sessionToken &&
    user.sessionToken &&
    payload.sessionToken !== user.sessionToken
  ) {
    res.status(401).json({ error: "تم تسجيل الدخول من جهاز آخر، يرجى تسجيل الدخول مجدداً" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    next();
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
  if (user) {
    if (payload.sessionToken && user.sessionToken && payload.sessionToken !== user.sessionToken) {
      next();
      return;
    }
    (req as any).user = user;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "supervisor") {
      res.status(403).json({ error: "غير مصرح، يلزم صلاحيات المشرف" });
      return;
    }
    next();
  });
}
