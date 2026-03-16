import { useState } from "react";
import { useLocation } from "wouter";
import { useLoginAsGuest, useLoginAsAdmin, useRegisterWithEmail, useLoginWithEmail } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldAlert, LogIn, BookOpen, User, Mail, Lock, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "main" | "login" | "register" | "admin";

export default function Login() {
  const [mode, setMode] = useState<Mode>("main");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { setAuth } = useAuth();
  const [, setLocation] = useLocation();

  const guestMutation = useLoginAsGuest();
  const adminMutation = useLoginAsAdmin();
  const registerMutation = useRegisterWithEmail();
  const loginMutation = useLoginWithEmail();

  const handleGuestLogin = () => {
    setErrorMsg("");
    guestMutation.mutate(undefined, {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        setLocation("/");
      },
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        setLocation("/");
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
      },
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (password.length < 6) {
      setErrorMsg("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    registerMutation.mutate({ data: { name, email, password } }, {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        setLocation("/");
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.error || "حدث خطأ، يرجى المحاولة مرة أخرى");
      },
    });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    adminMutation.mutate({ data: { username: adminUsername, password: adminPassword } }, {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        setLocation("/admin");
      },
      onError: () => {
        setErrorMsg("بيانات الدخول غير صحيحة");
      },
    });
  };

  const resetForm = (newMode: Mode) => {
    setErrorMsg("");
    setName(""); setEmail(""); setPassword("");
    setMode(newMode);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Background"
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-6 shadow-xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-300">
            <BookOpen className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-extrabold font-serif tracking-tight text-foreground">امتحانات توجيهي</h1>
          <p className="text-muted-foreground mt-3 text-lg font-medium">منصتك الأولى للاستعداد لامتحانات الثانوية العامة</p>
        </div>

        <Card className="p-8 shadow-2xl shadow-primary/5 border-border/50 bg-card/95 backdrop-blur-md rounded-3xl">
          <AnimatePresence mode="wait">

            {/* Main screen */}
            {mode === "main" && (
              <motion.div key="main" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <Button
                  onClick={handleGuestLogin}
                  disabled={guestMutation.isPending}
                  className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <User className="ml-2 w-5 h-5" />
                  {guestMutation.isPending ? "جاري الدخول..." : "الدخول كضيف"}
                </Button>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
                    <span className="bg-card px-3 text-muted-foreground">أو بحساب</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => resetForm("login")}
                  className="w-full h-12 rounded-xl font-bold text-base"
                >
                  <Mail className="ml-2 w-5 h-5" />
                  تسجيل الدخول بالبريد الإلكتروني
                </Button>

                <Button
                  variant="outline"
                  onClick={() => resetForm("register")}
                  className="w-full h-12 rounded-xl font-bold text-base border-primary/30 text-primary hover:bg-primary/5"
                >
                  <UserPlus className="ml-2 w-5 h-5" />
                  إنشاء حساب جديد
                </Button>

                <div className="mt-6 text-center pt-4 border-t border-border/50">
                  <button
                    onClick={() => resetForm("admin")}
                    className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center w-full gap-1"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    دخول الإدارة
                  </button>
                </div>
              </motion.div>
            )}

            {/* Login with email */}
            {mode === "login" && (
              <motion.form key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleLogin} className="space-y-5">
                <div className="text-center mb-4">
                  <Mail className="mx-auto w-10 h-10 text-primary mb-2" />
                  <h2 className="text-xl font-bold font-serif">تسجيل الدخول</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">البريد الإلكتروني</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="h-12 rounded-xl" dir="ltr" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">كلمة المرور</label>
                  <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" className="h-12 rounded-xl" dir="ltr" required />
                </div>
                {errorMsg && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-bold text-center border border-destructive/20">{errorMsg}</div>
                )}
                <Button type="submit" disabled={loginMutation.isPending} className="w-full h-12 text-base font-bold rounded-xl">
                  {loginMutation.isPending ? "جاري الدخول..." : "دخول"}
                  <LogIn className="mr-2 w-5 h-5" />
                </Button>
                <div className="text-center space-y-2 pt-2">
                  <button type="button" onClick={() => resetForm("register")} className="text-sm text-primary font-semibold hover:underline block w-full">
                    ليس لديك حساب؟ أنشئ حساباً جديداً
                  </button>
                  <a href={`${import.meta.env.BASE_URL}forgot-password`} className="text-sm text-muted-foreground font-semibold hover:text-primary transition-colors block w-full">
                    نسيت كلمة المرور؟
                  </a>
                  <button type="button" onClick={() => resetForm("main")} className="text-sm text-muted-foreground font-semibold hover:text-foreground">
                    العودة
                  </button>
                </div>
              </motion.form>
            )}

            {/* Register */}
            {mode === "register" && (
              <motion.form key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleRegister} className="space-y-4">
                <div className="text-center mb-4">
                  <UserPlus className="mx-auto w-10 h-10 text-primary mb-2" />
                  <h2 className="text-xl font-bold font-serif">إنشاء حساب جديد</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">الاسم الكامل</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك" className="h-12 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">البريد الإلكتروني</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="h-12 rounded-xl" dir="ltr" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">كلمة المرور</label>
                  <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="6 أحرف على الأقل" className="h-12 rounded-xl" dir="ltr" required />
                </div>
                {errorMsg && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-bold text-center border border-destructive/20">{errorMsg}</div>
                )}
                <Button type="submit" disabled={registerMutation.isPending} className="w-full h-12 text-base font-bold rounded-xl">
                  {registerMutation.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
                  <UserPlus className="mr-2 w-5 h-5" />
                </Button>
                <div className="text-center space-y-2 pt-2">
                  <button type="button" onClick={() => resetForm("login")} className="text-sm text-primary font-semibold hover:underline block w-full">
                    لديك حساب بالفعل؟ سجّل الدخول
                  </button>
                  <button type="button" onClick={() => resetForm("main")} className="text-sm text-muted-foreground font-semibold hover:text-foreground">
                    العودة
                  </button>
                </div>
              </motion.form>
            )}

            {/* Admin login */}
            {mode === "admin" && (
              <motion.form key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleAdminLogin} className="space-y-5">
                <div className="text-center mb-4">
                  <div className="mx-auto w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-3">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold font-serif">تسجيل دخول الإدارة</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">اسم المستخدم</label>
                  <Input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} className="h-12 rounded-xl" dir="ltr" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">كلمة المرور</label>
                  <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="h-12 rounded-xl" dir="ltr" required />
                </div>
                {errorMsg && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-bold text-center border border-destructive/20">{errorMsg}</div>
                )}
                <Button type="submit" disabled={adminMutation.isPending} className="w-full h-12 text-lg font-bold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  {adminMutation.isPending ? "جاري الدخول..." : "دخول"}
                  <Lock className="mr-2 w-5 h-5" />
                </Button>
                <div className="text-center mt-4">
                  <button type="button" onClick={() => resetForm("main")} className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                    العودة لتسجيل دخول الطلاب
                  </button>
                </div>
              </motion.form>
            )}

          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
