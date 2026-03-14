import { useState, useEffect, useRef } from "react";
import { useGetExam, useSubmitExam } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle2, AlertCircle, Clock, BookOpen, ArrowRight, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeExam({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const examId = parseInt(params.id);
  const reqOpts = { request: { headers: token ? { Authorization: `Bearer ${token}` } : {} } };

  const { data: exam, isLoading } = useGetExam(examId, reqOpts);
  const submitMutation = useSubmitExam(reqOpts);
  const [, setLocation] = useLocation();

  const [phase, setPhase] = useState<"confirm" | "exam" | "submitting">("confirm");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "exam" && exam?.timeLimit) {
      setTimeLeft(exam.timeLimit * 60);
    }
  }, [phase, exam?.timeLimit]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => (t !== null ? t - 1 : null));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft]);

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: parseInt(qId),
      selectedOption: val as any,
    }));
    submitMutation.mutate({ data: { examId, answers: formattedAnswers } }, {
      onSuccess: (res) => setLocation(`/result/${res.id}`),
    });
  };

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <p className="text-muted-foreground font-medium">جاري تجهيز الامتحان...</p>
    </div>
  );
  if (!exam) return <div className="text-center p-8 text-destructive font-bold text-xl">الامتحان غير موجود</div>;

  const answeredCount = Object.keys(answers).length;
  const totalCount = exam.questionCount;
  const isComplete = answeredCount === totalCount;
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
  const isTimeLow = timeLeft !== null && timeLeft <= 60;

  if (phase === "confirm") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 rounded-3xl border-2 border-border text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif mb-2">{exam.title}</h2>
              <p className="text-muted-foreground text-sm">تأكد من استعدادك قبل البدء</p>
            </div>
            <div className="flex justify-center gap-8 py-2">
              <div className="text-center">
                <div className="flex items-center gap-1 text-primary font-black text-3xl justify-center">
                  <BookOpen className="w-5 h-5" />
                  {exam.questionCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">سؤال</p>
              </div>
              {exam.timeLimit && (
                <div className="text-center">
                  <div className="flex items-center gap-1 text-secondary font-black text-3xl justify-center">
                    <Clock className="w-5 h-5" />
                    {exam.timeLimit}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">دقيقة</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setLocation(-1 as any)}
                className="h-12 rounded-xl font-bold"
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة
              </Button>
              <Button
                onClick={() => setPhase("exam")}
                className="h-12 rounded-xl font-bold"
              >
                <LogIn className="w-4 h-4 ml-2" />
                دخول الامتحان
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="bg-card p-5 rounded-3xl shadow-sm border border-border sticky top-20 z-10">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-3">
          <h1 className="text-xl font-bold font-serif text-primary leading-tight">{exam.title}</h1>
          <div className="flex items-center gap-3">
            <div className="bg-muted px-4 py-2 rounded-xl text-center">
              <span className="text-xl font-black">{answeredCount}</span>
              <span className="text-muted-foreground mx-1 text-sm">/</span>
              <span className="font-bold text-muted-foreground">{totalCount}</span>
              <span className="text-xs text-muted-foreground mr-1">سؤال</span>
            </div>
            {timeLeft !== null && (
              <div className={`px-4 py-2 rounded-xl text-center font-black text-xl flex items-center gap-1 transition-colors ${
                isTimeLow ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-secondary/15 text-secondary"
              }`}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {exam.questions.map((q, index) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className={`p-6 md:p-8 rounded-3xl border-2 transition-colors ${answers[q.id] ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${answers[q.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {index + 1}
                </div>
                <div className="flex-1 pt-1 space-y-3">
                  {q.text?.trim() && <h3 className="text-xl font-bold leading-relaxed">{q.text}</h3>}
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt={`سؤال ${index + 1}`}
                      className="rounded-xl border border-border max-w-full max-h-64 object-contain"
                    />
                  )}
                </div>
              </div>

              <RadioGroup
                value={answers[q.id]}
                onValueChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {(["A", "B", "C", "D"] as const).map((opt, oi) => {
                  const optText = q[`option${opt}` as keyof typeof q];
                  const isSelected = answers[q.id] === opt;
                  const labels = ["أ", "ب", "ج", "د"];
                  return (
                    <Label
                      key={opt}
                      htmlFor={`q${q.id}-${opt}`}
                      className={`relative flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-background shadow-md"
                          : "border-border bg-background hover:bg-muted hover:border-border/80"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} className="sr-only" />
                      <div className={`w-8 h-8 rounded-full border-2 ml-3 flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"
                      }`}>
                        {labels[oi]}
                      </div>
                      <span className="text-base font-semibold">{optText as string}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <span className="text-primary font-bold flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5" /> جاهز للتسليم
              </span>
            ) : (
              <span className="text-muted-foreground font-medium flex items-center gap-1 text-sm">
                <AlertCircle className="w-4 h-4 text-secondary" />
                تبقى {totalCount - answeredCount} سؤال
              </span>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || phase === "submitting"}
            size="lg"
            className="rounded-xl px-8 h-12 text-lg font-bold shadow-lg"
          >
            {phase === "submitting" ? "جاري التسليم..." : "تسليم الامتحان"}
          </Button>
        </div>
      </div>
    </div>
  );
}
