import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, ArrowRight, CheckCircle, BookOpen, ExternalLink } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");
      setSent(true);
      if (data.resetLink) setResetLink(data.resetLink);
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
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif mb-2">تم إنشاء رابط إعادة التعيين</h2>
                {resetLink ? (
                  <div className="space-y-3 text-right">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      اضغط على الزر أدناه لإعادة تعيين كلمة مرورك. الرابط صالح لمدة ساعة واحدة.
                    </p>
                    <a
                      href={resetLink}
                      className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      إعادة تعيين كلمة المرور
                    </a>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    تحقق من بريدك الإلكتروني وانقر على زر إعادة تعيين كلمة المرور.
                    الرابط صالح لمدة ساعة واحدة.
                  </p>
                )}
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11 rounded-xl font-bold">
                  العودة لتسجيل الدخول
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <Mail className="mx-auto w-10 h-10 text-primary mb-3" />
                <h2 className="text-xl font-bold font-serif">نسيت كلمة المرور؟</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">البريد الإلكتروني</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
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

              <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold rounded-xl">
                {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                <Mail className="mr-2 w-4 h-4" />
              </Button>

              <Link href="/login" className="block text-center">
                <button type="button" className="text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 w-full mt-2">
                  <ArrowRight className="w-4 h-4" />
                  العودة لتسجيل الدخول
                </button>
              </Link>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
