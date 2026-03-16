import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Sparkles } from "lucide-react";

function safeGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}

export function OnboardingModal() {
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const storageKey = `tawjihi_welcomed_${user.id}`;
  const alreadyWelcomed = safeGet(storageKey) === "done";
  if (alreadyWelcomed) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      updateUser({ name: updated.name });
      safeSet(storageKey, "done");
    } catch {
      setError("حدث خطأ، يرجى المحاولة مرة أخرى");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    safeSet(storageKey, "done");
    updateUser({});
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 24 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-center text-primary-foreground">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-4 mx-auto">
              <BookOpen className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold font-serif">أهلاً بك في امتحانات توجيهي!</h1>
            <p className="text-primary-foreground/80 mt-2 text-sm">
              منصتك الأولى للاستعداد لامتحانات الثانوية العامة
            </p>
          </div>

          {/* Body */}
          <form onSubmit={handleSave} className="p-7 space-y-5">
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-foreground/80">
                اختر الاسم الذي تريد أن يظهر لك في الموقع — يمكنك تغييره لاحقاً من الإعدادات.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">اسم العرض</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`مثال: ${user.name.startsWith("ضيف_") ? "أحمد محمد" : user.name}`}
                className="h-12 rounded-xl text-base"
                maxLength={60}
                autoFocus
              />
              {error && (
                <p className="text-destructive text-xs font-semibold">{error}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="h-11 rounded-xl font-bold"
                disabled={loading}
              >
                تخطي الآن
              </Button>
              <Button
                type="submit"
                disabled={loading || name.trim().length < 2}
                className="h-11 rounded-xl font-bold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    جاري الحفظ...
                  </span>
                ) : "حفظ الاسم"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
