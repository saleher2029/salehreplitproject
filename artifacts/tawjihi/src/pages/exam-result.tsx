import { useGetResult } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trophy, ArrowRight, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

function getGrade(pct: number): { label: string; color: string; bg: string; border: string } {
  if (pct >= 95) return { label: "متميز",   color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-400" };
  if (pct >= 85) return { label: "ممتاز",    color: "text-primary", bg: "bg-primary/5", border: "border-primary" };
  if (pct >= 75) return { label: "جيد جداً", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-400" };
  if (pct >= 65) return { label: "جيد",      color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary" };
  if (pct >= 50) return { label: "مقبول",    color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400" };
  return             { label: "راسب",       color: "text-destructive", bg: "bg-destructive/5", border: "border-destructive" };
}

const GRADE_LABELS = ["أ", "ب", "ج", "د"];
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function ExamResult({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const resultId = parseInt(params.id);
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const { data: result, isLoading } = useGetResult(resultId, {
    request: { headers },
  });

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
  if (!result) return <div className="text-center p-8 text-destructive font-bold">النتيجة غير موجودة</div>;

  const grade = getGrade(result.percentage);
  const wrongAnswers = result.answers.filter(a => !a.isCorrect);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">النتيجة والتصحيح</h1>
        <Link href="/my-exams">
          <Button variant="outline" className="rounded-xl font-bold">
            <ArrowRight className="ml-2 w-4 h-4" />
            امتحاناتي
          </Button>
        </Link>
      </div>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className={`p-8 rounded-3xl border-2 text-center relative overflow-hidden ${grade.bg} ${grade.border}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-bl-full -z-10" />

          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${grade.bg} border-2 ${grade.border}`}>
            <Trophy className={`w-10 h-10 ${grade.color}`} />
          </div>

          <h2 className="text-2xl font-bold font-serif mb-1">{result.examTitle}</h2>
          <p className="text-muted-foreground font-medium mb-6 text-sm">{new Date(result.completedAt).toLocaleString("ar-EG")}</p>

          <div className="flex flex-wrap justify-center gap-8 items-center mb-6">
            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground mb-1">الدرجة</p>
              <p className={`text-4xl font-black ${grade.color}`}>
                {result.score} <span className="text-2xl text-muted-foreground">/ {result.totalQuestions}</span>
              </p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground mb-1">النسبة المئوية</p>
              <p className={`text-4xl font-black ${grade.color}`}>{result.percentage}%</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block" />
            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground mb-1">التقدير</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${grade.border} ${grade.bg}`}>
                <Star className={`w-4 h-4 ${grade.color}`} />
                <span className={`text-xl font-black ${grade.color}`}>{grade.label}</span>
              </div>
            </div>
          </div>

          <div className="w-full bg-border/30 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                result.percentage >= 95 ? "bg-purple-500" :
                result.percentage >= 85 ? "bg-primary" :
                result.percentage >= 75 ? "bg-blue-500" :
                result.percentage >= 65 ? "bg-secondary" :
                result.percentage >= 50 ? "bg-orange-500" : "bg-destructive"
              }`}
              style={{ width: `${result.percentage}%` }}
            />
          </div>
        </Card>
      </motion.div>

      <div className="rounded-3xl border border-border overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border text-center py-4 bg-muted/30">
          {[
            { label: "إجمالي الأسئلة", value: result.totalQuestions, cls: "text-foreground" },
            { label: "إجابات صحيحة", value: result.score, cls: "text-primary" },
            { label: "إجابات خاطئة", value: wrongAnswers.length, cls: "text-destructive" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="px-4">
              <p className={`text-2xl font-black ${cls}`}>{value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {wrongAnswers.length > 0 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold font-serif flex items-center gap-2 border-b border-border pb-4">
            <XCircle className="w-5 h-5 text-destructive" />
            الإجابات الخاطئة والتصحيح ({wrongAnswers.length})
          </h3>
          {wrongAnswers.map((ans, idx) => (
            <motion.div
              key={ans.questionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-6 rounded-2xl border-2 border-destructive/30 bg-destructive/5">
                <div className="flex gap-4">
                  <XCircle className="w-6 h-6 text-destructive shrink-0 mt-1" />
                  <div className="flex-1 space-y-3">
                    {ans.questionText?.trim() && (
                      <h4 className="text-base font-bold">{idx + 1}. {ans.questionText}</h4>
                    )}
                    {(ans as any).questionImage && (
                      <img
                        src={(ans as any).questionImage}
                        alt="سؤال"
                        className="rounded-xl border max-h-48 object-contain"
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OPTION_KEYS.map((opt, oi) => {
                        const text = ans[`option${opt}` as keyof typeof ans];
                        const isSelected = ans.selectedOption === opt;
                        const isCorrect = ans.correctOption === opt;
                        let cls = "bg-background border-border text-foreground";
                        if (isCorrect) cls = "bg-primary/10 border-primary text-primary font-bold";
                        else if (isSelected) cls = "bg-destructive/10 border-destructive text-destructive line-through";
                        return (
                          <div key={opt} className={`p-3 rounded-xl border-2 flex items-center justify-between gap-2 ${cls}`}>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0">
                                {GRADE_LABELS[oi]}
                              </span>
                              <span className="text-sm">{text as string}</span>
                            </div>
                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-primary font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      الإجابة الصحيحة: الخيار {GRADE_LABELS[OPTION_KEYS.indexOf(ans.correctOption as any)]}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {wrongAnswers.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <p className="text-lg font-bold text-primary">أجبت على جميع الأسئلة بشكل صحيح!</p>
          <p className="text-muted-foreground text-sm">إنجاز رائع، استمر في التفوق</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Link href={`/exam/${result.examId}`} className="flex-1">
          <Button variant="outline" className="w-full h-12 rounded-xl font-bold">إعادة الامتحان</Button>
        </Link>
        <Link href="/my-exams" className="flex-1">
          <Button className="w-full h-12 rounded-xl font-bold">امتحاناتي</Button>
        </Link>
      </div>
    </div>
  );
}
