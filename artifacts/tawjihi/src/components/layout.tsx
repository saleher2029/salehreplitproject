import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetSettings } from "@workspace/api-client-react";
import { MessageCircle, BookOpen, Settings, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "@/components/settings-drawer";
import { OnboardingModal } from "@/components/onboarding-modal";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, token, clearAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.BASE_URL}api/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    clearAuth();
    setLocation("/login");
  };

  const { data: settings } = useGetSettings({
    request: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col" dir="rtl">

      {/* ── شريط الاشتراك ────────────────────────────────────────────────── */}
      {settings?.whatsappNumber && (
        <div className="bg-primary text-primary-foreground py-2 px-4 flex justify-center sm:justify-between items-center text-sm shadow-md z-10 relative flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-center">
              {settings.subscriptionInfo || "اشترك الآن للوصول إلى كافة الامتحانات!"}
            </span>
          </div>
          <a
            href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("مرحباً، أريد الاشتراك في منصة امتحانات توجيهي")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors font-bold"
          >
            <MessageCircle className="w-4 h-4" />
            تواصل عبر واتساب
          </a>
        </div>
      )}

      {/* ── الشريط العلوي ────────────────────────────────────────────────── */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-1.5 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif">امتحانات توجيهي</h1>
          </Link>

          {/* Navigation + User */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/my-exams"
                className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5" />
                امتحاناتي
              </Link>

              {(user.role === "admin" || user.role === "supervisor") && (
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors flex items-center gap-1 bg-secondary/10 px-3 py-1.5 rounded-lg hidden sm:flex"
                >
                  <Settings className="w-4 h-4" />
                  لوحة التحكم
                </Link>
              )}

              <div className="h-6 w-px bg-border hidden sm:block" />

              {/* Settings button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 bg-muted/50 hover:bg-muted px-3 py-2 rounded-xl transition-colors group"
                title="الإعدادات"
              >
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm font-semibold hidden md:block max-w-[120px] truncate">
                  {user.name}
                </span>
                <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-bold"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">خروج</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── المحتوى ──────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>

      {/* ── درج الإعدادات ────────────────────────────────────────────────── */}
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* ── نافذة الترحيب (تظهر مرة واحدة بعد تسجيل الدخول) ─────────────── */}
      <OnboardingModal />
    </div>
  );
}
