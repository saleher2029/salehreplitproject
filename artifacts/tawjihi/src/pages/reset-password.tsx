import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock, CheckCircle, BookOpen, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-bold font-serif">رابط غير صالح</h2>
          <p className="text-muted-foreground text-sm">هذا الرابط غير صالح أو منتهي الصلاحية.</p>
          <Button onClick={() => setLocation("/forgot-password")} className="rounded-xl font-bold">
            طلب رابط جديد
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");
      setSuccess(true);
      if (data.token && data.user) {
        setAuth(data.user, data.token);
        setTimeout(() => setLocation("/"), 2500);
      }
    } catch (e: any) {
      setError(e.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-primary-foreground mb-5 shadow-xl shadow-primary/30">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold font-serif">Tawjihi-Exams</h1>
          <p className="text-xs text-muted-foreground font-medium">By S&amp;S</p>
        </div>

        <Card className="p-8 rounded-3xl shadow-xl border-border/50">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif mb-2">تم تحديث كلمة المرور!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  تم تعيين كلمة مرورك الجديدة بنجاح. جاري تسجيل دخولك...
                </p>
              </div>
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <Lock className="mx-auto w-10 h-10 text-primary mb-3" />
                <h2 className="text-xl font-bold font-serif">تعيين كلمة مرور جديدة</h2>
                <p className="text-muted-foreground text-sm mt-2">أدخل كلمة المرور الجديدة</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">كلمة المرور الجديدة</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="h-12 rounded-xl"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">تأكيد كلمة المرور</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="h-12 rounded-xl"
                  dir="ltr"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-bold text-center border border-destructive/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full h-12 text-base font-bold rounded-xl"
              >
                {loading ? "جاري الحفظ..." : "تعيين كلمة المرور"}
                <Lock className="mr-2 w-4 h-4" />
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
