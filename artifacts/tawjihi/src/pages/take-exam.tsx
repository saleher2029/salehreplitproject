import { useState, useEffect, useRef, useCallback } from "react";
import { useGetExam, useSubmitExam } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  CheckCircle2, Clock, BookOpen, ArrowRight, LogIn,
  ChevronRight, ChevronLeft, Flag, Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const OPTION_LABELS = ["أ", "ب", "ج", "د"];

export default function TakeExam({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const examId = parseInt(params.id);
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const reqOpts = { request: { headers } };

  const { data: exam, isLoading } = useGetExam(examId, reqOpts);
  const submitMutation = useSubmitExam(reqOpts);
  const [, setLocation] = useLocation();

  const [phase, setPhase] = useState<"confirm" | "exam" | "submitting">("confirm");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set()); // question IDs marked for review
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-submit when time runs out
  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: parseInt(qId),
      selectedOption: val as any,
    }));
    submitMutation.mutate({ data: { examId, answers: formattedAnswers } }, {
      onSuccess: (res) => setLocation(`/result/${res.id}`),
    });
  }, [answers, examId]);

  useEffect(() => {
    if (phase === "exam" && exam?.timeLimit) {
      setTimeLeft(exam.timeLimit * 60);
    }
  }, [phase, exam?.timeLimit]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => (t !== null ? t - 1 : null));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft]);

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <p className="text-muted-foreground font-medium">جاري تجهيز الامتحان...</p>
    </div>
  );
  if (!exam) return <div className="text-center p-8 text-destructive font-bold text-xl">الامتحان غير موجود</div>;

  const questions = exam.questions;
  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === totalCount;
  const isTimeLow = timeLeft !== null && timeLeft <= 60;
  const currentQ = questions[currentIdx];

  // ── Confirm screen ───────────────────────────────────────────────────────────
  if (phase === "confirm") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <Card className="p-8 rounded-3xl border-2 border-border text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif mb-2">{exam.title}</h2>
              <p className="text-muted-foreground text-sm">تأكد من استعدادك قبل البدء</p>
            </div>
            <div className="flex justify-center gap-10 py-2">
              <div className="text-center">
                <div className="flex items-center gap-1 text-primary font-black text-3xl justify-center">
                  <BookOpen className="w-5 h-5" /> {exam.questionCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">سؤال</p>
              </div>
              {exam.timeLimit && (
                <div className="text-center">
                  <div className="flex items-center gap-1 text-secondary font-black text-3xl justify-center">
                    <Clock className="w-5 h-5" /> {exam.timeLimit}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">دقيقة</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" onClick={() => setLocation(-1 as any)} className="h-12 rounded-xl font-bold">
                <ArrowRight className="w-4 h-4 ml-2" /> العودة
              </Button>
              <Button onClick={() => { setPhase("exam"); setCurrentIdx(0); }} className="h-12 rounded-xl font-bold">
                <LogIn className="w-4 h-4 ml-2" /> دخول الامتحان
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Exam screen ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-28" dir="rtl">

      {/* ── Sticky top bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-20 z-20 bg-card border border-border rounded-2xl shadow-sm p-4 mb-4 space-y-3">
        {/* Title + timer */}
        <div className="flex justify-between items-center gap-3">
          <h1 className="text-base font-bold font-serif text-primary truncate">{exam.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">
              {answeredCount}/{totalCount} مجاب
            </span>
            {timeLeft !== null && (
              <div className={`px-3 py-1.5 rounded-xl font-black text-sm flex items-center gap-1 transition-colors ${
                isTimeLow ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-secondary/15 text-secondary"
              }`}>
                <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Question number grid */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const answered = !!answers[q.id];
            const isFlagged = flagged.has(q.id);
            const isCurrent = i === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-all duration-150 flex items-center justify-center
                  ${isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-md scale-110"
                    : isFlagged
                      ? "border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      : answered
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded border-2 border-primary bg-primary/10 inline-block" /> مجاب
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 inline-block" /> للمراجعة
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded border-2 border-primary bg-primary inline-block" /> الحالي
          </span>
        </div>
      </div>

      {/* ── Current question ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {currentQ && (
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <Card className={`p-6 md:p-8 rounded-3xl border-2 transition-colors ${
              answers[currentQ.id] ? "border-primary/30 bg-primary/5" : "border-border bg-card"
            }`}>
              {/* Question header */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                    answers[currentQ.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {currentIdx + 1}
                  </div>
                  <div className="flex-1 space-y-3 pt-1">
                    {currentQ.text?.trim() && (
                      <h3 className="text-xl font-bold leading-relaxed">{currentQ.text}</h3>
                    )}
                    {currentQ.imageUrl && (
                      <img
                        src={currentQ.imageUrl}
                        alt={`سؤال ${currentIdx + 1}`}
                        className="rounded-xl border border-border max-w-full max-h-72 object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Review flag button */}
                <button
                  onClick={() => setFlagged(prev => {
                    const next = new Set(prev);
                    if (next.has(currentQ.id)) next.delete(currentQ.id);
                    else next.add(currentQ.id);
                    return next;
                  })}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    flagged.has(currentQ.id)
                      ? "border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      : "border-border text-muted-foreground hover:border-yellow-400 hover:text-yellow-600"
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  مراجعة
                </button>
              </div>

              {/* Options */}
              <RadioGroup
                value={answers[currentQ.id] ?? ""}
                onValueChange={val => setAnswers(prev => ({ ...prev, [currentQ.id]: val }))}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {(["A", "B", "C", "D"] as const).map((opt, oi) => {
                  const optText = currentQ[`option${opt}` as keyof typeof currentQ];
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <Label
                      key={opt}
                      htmlFor={`q${currentQ.id}-${opt}`}
                      className={`relative flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "border-primary bg-background shadow-md"
                          : "border-border bg-background hover:bg-muted/60 hover:border-primary/40"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`q${currentQ.id}-${opt}`} className="sr-only" />
                      <div className={`w-8 h-8 rounded-full border-2 ml-3 flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"
                      }`}>
                        {OPTION_LABELS[oi]}
                      </div>
                      <span className="text-base font-semibold leading-snug">{optText as string}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom navigation bar ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Previous */}
          <Button
            variant="outline"
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="h-11 px-4 rounded-xl font-bold flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>

          {/* Progress indicator */}
          <div className="flex-1 text-center">
            <span className="text-sm font-bold text-muted-foreground">
              {currentIdx + 1} / {totalCount}
            </span>
            <div className="h-1.5 w-full bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Next OR Submit */}
          {currentIdx < totalCount - 1 ? (
            <Button
              onClick={() => setCurrentIdx(i => Math.min(totalCount - 1, i + 1))}
              className="h-11 px-4 rounded-xl font-bold flex items-center gap-1"
            >
              التالي <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || phase === "submitting"}
              className={`h-11 px-5 rounded-xl font-bold flex items-center gap-1 ${
                isComplete ? "bg-primary shadow-lg" : "opacity-60"
              }`}
            >
              {phase === "submitting" ? (
                <span className="flex items-center gap-1"><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> إرسال...</span>
              ) : (
                <><Send className="w-4 h-4 ml-1" /> تسليم</>
              )}
            </Button>
          )}
        </div>

        {/* Unanswered warning */}
        {currentIdx === totalCount - 1 && !isComplete && (
          <div className="text-center pb-2 text-xs text-secondary font-bold">
            ⚠️ تبقى {totalCount - answeredCount} سؤال بدون إجابة — يمكنك التسليم أو العودة للإجابة
          </div>
        )}
        {currentIdx === totalCount - 1 && isComplete && (
          <div className="text-center pb-2 text-xs text-primary font-bold flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> أجبت على جميع الأسئلة — جاهز للتسليم
          </div>
        )}
      </div>
    </div>
  );
}
