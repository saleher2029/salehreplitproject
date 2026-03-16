import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGetExam, useSubmitExam } from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useAntiScreenshot } from "@/hooks/use-anti-screenshot";
import {
  CheckCircle2, Clock, BookOpen, ArrowRight,
  ChevronRight, ChevronLeft, Flag, Send, Star, ZoomIn, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Fisher-Yates shuffle ───────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const OPTION_LABELS = ["أ", "ب", "ج", "د"];

// ── localStorage helpers ─────────────────────────────────────────────────────
function progressKey(userId: number, examId: number) {
  return `tawjihi_exam_${userId}_${examId}`;
}

function saveProgress(key: string, data: object) {
  try { localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
}

function loadProgress(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearProgress(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export default function TakeExam({ params }: { params: { id: string } }) {
  const { token, user } = useAuth();
  const examId = parseInt(params.id);
  const search = useSearch();
  const _sp = new URLSearchParams(search);
  const navSubjectId = _sp.get("subjectId");
  const navSpecializationId = _sp.get("specializationId");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const reqOpts = { request: { headers } };

  const { data: exam, isLoading } = useGetExam(examId, reqOpts);
  const submitMutation = useSubmitExam(reqOpts);
  const [, setLocation] = useLocation();

  // Anti-screenshot: active for entire exam page, only for students & guests (not admins/supervisors)
  const isAdmin = user?.role === "admin" || user?.role === "supervisor";
  const watermark = user ? `${user.name}` : "ضيف";
  const [phase, setPhase] = useState<"confirm" | "exam" | "submitting">("confirm");
  useAntiScreenshot(!isAdmin, watermark);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pKey = user ? progressKey(user.id, examId) : "";

  // ── Restore saved progress ──────────────────────────────────────────────
  useEffect(() => {
    if (!pKey || !exam) return;
    const saved = loadProgress(pKey);
    if (!saved) return;
    if (saved.answers) setAnswers(saved.answers);
    if (saved.flagged) setFlagged(new Set(saved.flagged));
    if (saved.bookmarked) setBookmarked(new Set(saved.bookmarked));
    if (typeof saved.currentIdx === "number") setCurrentIdx(saved.currentIdx);
  }, [pKey, exam]);

  // ── Auto-save progress whenever state changes ───────────────────────────
  useEffect(() => {
    if (phase !== "exam" || !pKey) return;
    saveProgress(pKey, {
      answers,
      flagged: [...flagged],
      bookmarked: [...bookmarked],
      currentIdx,
    });
  }, [answers, flagged, bookmarked, currentIdx, phase, pKey]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: parseInt(qId),
      selectedOption: val as any,
    }));
    submitMutation.mutate(
      { data: { examId, answers: formattedAnswers, bookmarkedQuestionIds: [...bookmarked] } },
      {
        onSuccess: (res) => {
          clearProgress(pKey);
          setLocation(`/result/${res.id}`);
        },
      },
    );
  }, [answers, examId, bookmarked, pKey]);

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

  // ── Randomize questions if questionLimit is set ─────────────────────────
  // Must be before early returns to respect hooks rules
  const questions = useMemo(() => {
    const all = exam?.questions ?? [];
    const limit = exam?.questionLimit;
    if (limit && limit > 0 && limit < all.length) {
      return shuffleArray(all).slice(0, limit);
    }
    return all;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id]); // re-shuffle only when exam changes

  if (!exam && isLoading) return (
    <div className="flex flex-col justify-center items-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <p className="text-muted-foreground font-medium">جاري تجهيز الامتحان...</p>
    </div>
  );
  if (!exam) return <div className="text-center p-8 text-destructive font-bold text-xl">الامتحان غير موجود</div>;
  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === totalCount;
  const isTimeLow = timeLeft !== null && timeLeft <= 60;
  const currentQ = questions[currentIdx];

  // ── Confirm screen ──────────────────────────────────────────────────────
  if (phase === "confirm") {
    const hasSavedProgress = pKey ? !!loadProgress(pKey) : false;
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
            {hasSavedProgress && (
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-sm font-semibold text-primary">
                💾 يوجد تقدم محفوظ — سيتم استعادة إجاباتك تلقائياً
              </div>
            )}
            <div className="flex justify-center gap-10 py-2">
              <div className="text-center">
                <div className="flex items-center gap-1 text-primary font-black text-3xl justify-center">
                  <BookOpen className="w-5 h-5" />
                  {exam.questionLimit && exam.questionLimit < exam.questionCount
                    ? exam.questionLimit
                    : exam.questionCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  سؤال
                  {exam.questionLimit && exam.questionLimit < exam.questionCount && (
                    <span className="block text-secondary font-semibold mt-0.5">
                      عشوائي من {exam.questionCount}
                    </span>
                  )}
                </p>
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
              <Button variant="outline" onClick={() => window.history.back()} className="h-12 rounded-xl font-bold">
                <ArrowRight className="w-4 h-4 ml-2" /> العودة
              </Button>
              <Button onClick={() => { setPhase("exam"); setCurrentIdx(0); }} className="h-12 rounded-xl font-bold">
                {hasSavedProgress ? "متابعة الامتحان" : "دخول الامتحان"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Exam screen ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-28" dir="rtl">

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-20 z-20 bg-card border border-border rounded-2xl shadow-sm p-4 mb-4 space-y-3">
        <div className="flex justify-between items-center gap-3">
          <h1 className="text-base font-bold font-serif text-primary truncate">{exam.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">{answeredCount}/{totalCount} مجاب</span>
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
            const isBookmarkedQ = bookmarked.has(q.id);
            const isCurrent = i === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-all duration-150 flex items-center justify-center relative
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
                {isBookmarkedQ && (
                  <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-orange-400 rounded-full border border-background" />
                )}
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
            <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> مهم
          </span>
        </div>
      </div>

      {/* ── Current question ────────────────────────────────────────────────── */}
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
                  {/* Question number circle */}
                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                    answers[currentQ.id] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {currentIdx + 1}
                  </div>
                  <div className="flex-1 space-y-4 pt-1">
                    {currentQ.text?.trim() && (
                      <h3 className="text-xl font-bold leading-relaxed">{currentQ.text}</h3>
                    )}
                    {/* ── Enlarged image with zoom ──────────────────────── */}
                    {currentQ.imageUrl && (
                      <div className="relative group">
                        <img
                          src={currentQ.imageUrl}
                          alt={`سؤال ${currentIdx + 1}`}
                          className="rounded-2xl border border-border w-full max-h-96 object-contain cursor-zoom-in shadow-md hover:shadow-lg transition-shadow"
                          onClick={() => setZoomedImage(currentQ.imageUrl!)}
                        />
                        <button
                          onClick={() => setZoomedImage(currentQ.imageUrl!)}
                          className="absolute top-2 left-2 bg-black/60 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="تكبير الصورة"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons (review flag + star bookmark) */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* Review flag */}
                  <button
                    onClick={() => setFlagged(prev => {
                      const next = new Set(prev);
                      if (next.has(currentQ.id)) next.delete(currentQ.id);
                      else next.add(currentQ.id);
                      return next;
                    })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      flagged.has(currentQ.id)
                        ? "border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        : "border-border text-muted-foreground hover:border-yellow-400 hover:text-yellow-600"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    مراجعة
                  </button>
                  {/* Star bookmark (important) */}
                  <button
                    onClick={() => setBookmarked(prev => {
                      const next = new Set(prev);
                      if (next.has(currentQ.id)) next.delete(currentQ.id);
                      else next.add(currentQ.id);
                      return next;
                    })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      bookmarked.has(currentQ.id)
                        ? "border-orange-400 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300"
                        : "border-border text-muted-foreground hover:border-orange-400 hover:text-orange-500"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${bookmarked.has(currentQ.id) ? "fill-orange-400" : ""}`} />
                    مهم
                  </button>
                </div>
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

      {/* ── Bottom nav ────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (currentIdx === 0) {
                const unitId = exam?.unitId;
                const qs = new URLSearchParams();
                if (navSubjectId) qs.set("subjectId", navSubjectId);
                if (navSpecializationId) qs.set("specializationId", navSpecializationId);
                const query = qs.toString();
                setLocation(`/unit/${unitId}${query ? `?${query}` : ""}`);
              } else {
                setCurrentIdx(i => i - 1);
              }
            }}
            className="h-11 px-4 rounded-xl font-bold flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>

          <div className="flex-1 text-center">
            <span className="text-sm font-bold text-muted-foreground">{currentIdx + 1} / {totalCount}</span>
            <div className="h-1.5 w-full bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentIdx + 1) / totalCount) * 100}%` }} />
            </div>
          </div>

          {currentIdx < totalCount - 1 ? (
            <Button onClick={() => setCurrentIdx(i => Math.min(totalCount - 1, i + 1))} className="h-11 px-4 rounded-xl font-bold flex items-center gap-1">
              التالي <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={phase === "submitting"}
              className={`h-11 px-5 rounded-xl font-bold flex items-center gap-1 ${isComplete ? "bg-primary shadow-lg" : "bg-orange-500 hover:bg-orange-600"}`}
            >
              {phase === "submitting" ? (
                <span className="flex items-center gap-1"><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> إرسال...</span>
              ) : (
                <><Send className="w-4 h-4 ml-1" /> تسليم</>
              )}
            </Button>
          )}
        </div>
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

      {/* ── Image zoom overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-5xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={zoomedImage}
                alt="صورة السؤال"
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
