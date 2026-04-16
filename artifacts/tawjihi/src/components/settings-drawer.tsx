import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetSettings } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  User as UserIcon,
  MessageCircle,
  Lock,
  LogOut,
  Settings,
  Pencil,
  X,
  CheckCircle,
} from "lucide-react";
import { useLocation } from "wouter";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function SettingsDrawer({ open, onOpenChange }: Props) {
  const { user, clearAuth, updateUser } = useAuth();
  const [, setLocation] = useLocation();

  const { data: settings } = useGetSettings();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  const startEditName = () => {
    setNameInput(user?.name ?? "");
    setEditingName(true);
    setNameSuccess(false);
    setNameError("");
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) { setNameError("الاسم يجب أن يكون حرفين على الأقل"); return; }
    setNameSaving(true); setNameError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: trimmed })
        .eq("id", user?.id);
      if (error) throw error;
      updateUser({ name: trimmed });
      setEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch {
      setNameError("حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setNameSaving(false);
    }
  };

  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setResetLoading(true); setResetError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (e: any) {
      setResetError(e.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuth();
    onOpenChange(false);
    setLocation("/login");
  };

  if (!user) return null;

  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة في منصة امتحانات توجيهي")}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-bl from-primary/5 to-background">
          <SheetTitle className="font-serif text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            الإعدادات
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── بطاقة الحساب ─────────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">حسابي</h3>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                <UserIcon className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email ?? "ضيف"}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-bold
                  ${user.role === "admin" ? "bg-destructive/10 text-destructive"
                  : user.role === "supervisor" ? "bg-secondary/10 text-secondary"
                  : "bg-primary/10 text-primary"}`}>
                  {user.role === "admin" ? "مدير" : user.role === "supervisor" ? "مشرف" : "طالب"}
                </span>
              </div>
            </div>

            {/* تعديل الاسم */}
            {nameSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                تم تحديث اسمك بنجاح
              </div>
            )}

            {editingName ? (
              <div className="space-y-2">
                <label className="text-xs font-bold">اسم العرض الجديد</label>
                <Input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  maxLength={60}
                  autoFocus
                />
                {nameError && <p className="text-destructive text-xs font-semibold">{nameError}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingName(false)} disabled={nameSaving} className="rounded-xl">
                    <X className="w-3.5 h-3.5 ml-1" /> إلغاء
                  </Button>
                  <Button size="sm" onClick={saveName} disabled={nameSaving || nameInput.trim().length < 2} className="rounded-xl">
                    {nameSaving ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditName} className="w-full rounded-xl font-bold text-sm h-9">
                <Pencil className="w-3.5 h-3.5 ml-2" />
                تعديل الاسم
              </Button>
            )}
          </div>

          {/* ── إعادة تعيين كلمة المرور ──────────────────────────────── */}
          {user.email && user.provider === "email" && (
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">الأمان</h3>
              {resetSent ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    سنرسل رابط إعادة تعيين كلمة المرور إلى: <span className="font-semibold text-foreground">{user.email}</span>
                  </p>
                  {resetError && <p className="text-destructive text-xs font-semibold">{resetError}</p>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="w-full rounded-xl font-bold text-sm h-9 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Lock className="w-3.5 h-3.5 ml-2" />
                    {resetLoading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── التواصل معنا ──────────────────────────────────────────── */}
          {whatsappUrl && (
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">الدعم الفني</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                هل تواجه مشكلة أو لديك استفسار؟ تواصل معنا مباشرة عبر واتساب وسنرد عليك في أقرب وقت.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                تواصل معنا عبر واتساب
              </a>
            </div>
          )}
        </div>

        {/* ── تسجيل الخروج ──────────────────────────────────────────── */}
        <div className="p-5 border-t bg-background">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-11 rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive/60"
          >
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
