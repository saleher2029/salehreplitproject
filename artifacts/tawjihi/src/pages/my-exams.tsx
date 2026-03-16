import { useGetMyResults, getGetMyResultsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Calendar, LogIn, AlertCircle, RefreshCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

function getGradeColor(pct: number) {
  if (pct >= 85) return { bar: "bg-primary",    badge: "bg-primary/10 text-primary" };
  if (pct >= 65) return { bar: "bg-secondary",  badge: "bg-secondary/10 text-secondary" };
  if (pct >= 50) return { bar: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
  return             { bar: "bg-destructive",   badge: "bg-destructive/10 text-destructive" };
}

export default function MyExams() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();

  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetMyResults(
    {
      request: { headers },
      query: {
        queryKey: getGetMyResultsQueryKey(),
        // لا تعيد المحاولة عند أخطاء المصادقة — تفادياً لانتظار طويل
        retry: (failureCount, error: any) => {
          if (error?.status === 401 || error?.status === 403) return false;
          return failureCount < 2;
        },
        retryDelay: 800,
        staleTime: 30_000,
        enabled: !!token,
      },
    },
  );

  // ── المستخدم غير مسجل ────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <LogIn className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-serif mb-2">سجّل دخولك أولاً</h2>
          <p className="text-muted-foreground font-medium">يجب تسجيل الدخول لعرض سجل امتحاناتك</p>
        </div>
        <Button onClick={() => setLocation("/")} className="h-12 px-8 rounded-xl font-bold">
          الذهاب لتسجيل الدخول
        </Button>
      </div>
    );
  }

  // ── جاري التحميل ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground font-medium">جاري تحميل امتحاناتك...</p>
      </div>
    );
  }

  // ── خطأ في التحميل ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <div>
          <p className="text-lg font-bold text-destructive">تعذّر تحميل الامتحانات</p>
          <p className="text-sm text-muted-foreground mt-1">تحقق من اتصالك بالإنترنت وحاول مجدداً</p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          className="h-11 px-6 rounded-xl font-bold"
        >
          <RefreshCcw className={`w-4 h-4 ml-2 ${isFetching ? "animate-spin" : ""}`} />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  // ── لا توجد امتحانات بعد ────────────────────────────────────────────────
  if (!data || data.length === 0) {
    return (
      <div className="space-y-8 py-6 max-w-5xl mx-auto">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border border-dashed gap-4 text-center px-4">
          <Trophy className="w-16 h-16 text-muted-foreground/30" />
          <p className="text-xl font-bold text-muted-foreground">لم تقدّم أي امتحانات بعد</p>
          <p className="text-sm text-muted-foreground">اختر امتحاناً وابدأ التدريب الآن</p>
          <Link href="/">
            <Button className="mt-2 rounded-xl h-11 px-6 font-bold">تصفح الامتحانات المتاحة</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── قائمة الامتحانات ─────────────────────────────────────────────────────
  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      <PageHeader />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "امتحان مقدَّم", value: data.length, color: "text-primary" },
          {
            label: "أعلى نتيجة",
            value: `${Math.max(...data.map(r => r.percentage))}%`,
            color: "text-secondary",
          },
          {
            label: "متوسط النتائج",
            value: `${Math.round(data.reduce((a, r) => a + r.percentage, 0) / data.length)}%`,
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map(s => (
          <Card key={s.label} className="p-4 rounded-2xl text-center border-border/50">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...data].reverse().map((result, i) => {
          const gc = getGradeColor(result.percentage);
          return (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-0 overflow-hidden rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
                {/* Progress bar top */}
                <div className="h-1.5 w-full bg-muted">
                  <div
                    className={`h-full ${gc.bar} transition-all duration-700`}
                    style={{ width: `${result.percentage}%` }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <h3 className="text-base font-bold font-serif leading-snug flex-1 line-clamp-2">
                      {result.examTitle}
                    </h3>
                    <span className={`shrink-0 px-3 py-1 rounded-xl font-black text-lg ${gc.badge}`}>
                      {result.percentage}%
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium mb-5">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      {result.score} / {result.totalQuestions} صحيح
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(result.completedAt).toLocaleDateString("ar-EG")}
                    </span>
                  </div>

                  <Link href={`/result/${result.id}`}>
                    <Button variant="outline" className="w-full rounded-xl font-bold h-10 hover:bg-muted">
                      عرض التصحيح
                      <ArrowLeft className="mr-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="space-y-1 border-b border-border pb-5">
      <h1 className="text-3xl font-bold font-serif text-foreground flex items-center gap-3">
        <Trophy className="w-8 h-8 text-secondary" />
        امتحاناتي
      </h1>
      <p className="text-muted-foreground font-medium">سجل الامتحانات التي قدّمتها ونتائجك فيها</p>
    </div>
  );
}
