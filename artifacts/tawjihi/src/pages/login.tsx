import { useState } from "react";
import { useLocation } from "wouter";
import { useLoginAsGuest, useLoginAsAdmin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GraduationCap, User, ShieldAlert, LogIn, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setAuth } = useAuth();
  const [, setLocation] = useLocation();

  const guestMutation = useLoginAsGuest();
  const adminMutation = useLoginAsAdmin();

  const handleGuestLogin = () => {
    guestMutation.mutate(undefined, {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        setLocation("/");
      }
    });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    adminMutation.mutate({ data: { username, password } }, {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        setLocation("/admin");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Background" 
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-6 shadow-xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-300">
            <BookOpen className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-extrabold font-serif tracking-tight text-foreground">امتحانات توجيهي</h1>
          <p className="text-muted-foreground mt-3 text-lg font-medium">منصتك الأولى للاستعداد لامتحانات الثانوية العامة</p>
        </div>

        <Card className="p-8 shadow-2xl shadow-primary/5 border-border/50 bg-card/95 backdrop-blur-md rounded-3xl">
          {!isAdminMode ? (
            <div className="space-y-4">
              <Button 
                onClick={handleGuestLogin} 
                disabled={guestMutation.isPending}
                className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                <User className="ml-2 w-5 h-5" />
                {guestMutation.isPending ? "جاري الدخول..." : "تسجيل الدخول كضيف"}
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground">أو باستخدام</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="h-12 rounded-xl border-border bg-background hover:bg-muted" disabled>
                  <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  تسجيل الدخول بجوجل (قريباً)
                </Button>
                <Button variant="outline" className="h-12 rounded-xl border-border bg-background hover:bg-muted text-blue-600" disabled>
                  <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  تسجيل الدخول بفيسبوك (قريباً)
                </Button>
              </div>

              <div className="mt-8 text-center pt-4 border-t border-border/50">
                <button 
                  onClick={() => setIsAdminMode(true)}
                  className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center w-full gap-1"
                >
                  <ShieldAlert className="w-4 h-4" />
                  دخول الإدارة
                </button>
              </div>
            </div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={handleAdminLogin} 
              className="space-y-5"
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold font-serif">تسجيل دخول الإدارة</h2>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-bold text-foreground">اسم المستخدم</label>
                <Input 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="h-12 rounded-xl bg-background border-2 focus-visible:ring-primary focus-visible:border-primary" 
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-bold text-foreground">كلمة المرور</label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="h-12 rounded-xl bg-background border-2 focus-visible:ring-primary focus-visible:border-primary" 
                  dir="ltr"
                  required
                />
              </div>
              {adminMutation.isError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-bold text-center border border-destructive/20">
                  بيانات الدخول غير صحيحة
                </div>
              )}
              <Button 
                type="submit" 
                disabled={adminMutation.isPending}
                className="w-full h-12 text-lg font-bold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg hover:shadow-xl transition-all"
              >
                {adminMutation.isPending ? "جاري الدخول..." : "دخول"}
                <LogIn className="mr-2 w-5 h-5" />
              </Button>
              <div className="text-center mt-6">
                <button 
                  type="button"
                  onClick={() => setIsAdminMode(false)}
                  className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  العودة لتسجيل دخول الطلاب
                </button>
              </div>
            </motion.form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
