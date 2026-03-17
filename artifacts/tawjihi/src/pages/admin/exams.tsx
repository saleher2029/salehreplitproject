import { useState, useRef } from "react";
import {
  useGetExams, useGetSpecializations, useGetSubjects, useGetUnits,
  useCreateExam, useUpdateExam, useDeleteExam,
  useCreateQuestion, useUpdateQuestion, useDeleteQuestion, getExam,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Edit2, Trash2, Clock, BookOpen, ChevronRight,
  ImagePlus, X, CheckCircle, CheckCircle2, ArrowLeft, Copy, Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
const OPTION_LABELS = ["أ", "ب", "ج", "د"];

function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminExams() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const opts = { request: { headers } };

  const { data: exams, isLoading } = useGetExams({}, opts);
  const { data: specializations } = useGetSpecializations(opts);
  const { data: allSubjects } = useGetSubjects({}, opts);
  const { data: allUnits } = useGetUnits({}, opts);

  const createExamMut = useCreateExam(opts);
  const updateExamMut = useUpdateExam(opts);
  const deleteExamMut = useDeleteExam(opts);
  const createQMut = useCreateQuestion(opts);
  const updateQMut = useUpdateQuestion(opts);
  const deleteQMut = useDeleteQuestion(opts);

  // Dialog phase: "exam" = filling exam info, "questions" = adding questions
  const [phase, setPhase] = useState<"exam" | "questions">("exam");
  const [isOpen, setIsOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [activeExamId, setActiveExamId] = useState<number | null>(null); // exam we're adding questions to
  const [saveError, setSaveError] = useState<string | null>(null);

  // Exam form state
  const [selectedSpecIds, setSelectedSpecIds] = useState<number[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questionLimit, setQuestionLimit] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<string | null>(null);

  // Question form state
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [qText, setQText] = useState("");
  const [qImageUrl, setQImageUrl] = useState<string | null>(null);
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const primarySpecId = selectedSpecIds.length > 0 ? selectedSpecIds[0] : null;
  const filteredSubjects = allSubjects?.filter(s => !primarySpecId || s.specializationId === primarySpecId) ?? [];
  const filteredUnits = allUnits?.filter(u => !subjectId || u.subjectId === parseInt(subjectId)) ?? [];

  // Fetch questions for active exam
  const { data: activeExam, refetch: refetchExam } = useQuery({
    queryKey: ["/api/exams", String(activeExamId)],
    queryFn: () => getExam(activeExamId!, opts.request),
    enabled: !!activeExamId,
  });

  // ─── Open exam create dialog ────────────────────────────────────────────────
  const openCreate = () => {
    setEditingExamId(null);
    setActiveExamId(null);
    setSelectedSpecIds([]); setSubjectId(""); setUnitId(""); setTitle(""); setTimeLimit(""); setQuestionLimit("");
    setSaveError(null);
    setDuplicateStatus(null);
    setPhase("exam");
    setIsOpen(true);
  };

  // ─── Open exam edit dialog (stays in exam phase) ────────────────────────────
  const openEdit = (item: any) => {
    setEditingExamId(item.id);
    setActiveExamId(item.id);
    setTitle(item.title);
    setTimeLimit(item.timeLimit?.toString() ?? "");
    setQuestionLimit(item.questionLimit?.toString() ?? "");
    const unit = allUnits?.find(u => u.id === item.unitId);
    const sub = allSubjects?.find(s => s.id === unit?.subjectId);
    setSubjectId(unit?.subjectId?.toString() ?? "");
    setSelectedSpecIds(sub ? [sub.specializationId] : []);
    setUnitId(item.unitId?.toString() ?? "");
    setSaveError(null);
    setDuplicateStatus(null);
    setPhase("exam");
    setIsOpen(true);
  };

  // ─── Open question management for existing exam directly ────────────────────
  const openQuestionsFor = (item: any) => {
    setActiveExamId(item.id);
    setEditingExamId(null);
    resetQForm();
    setPhase("questions");
    setIsOpen(true);
  };

  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleFinishExam = async () => {
    if (activeExamId && selectedSpecIds.length > 1 && primarySpecId) {
      const otherSpecIds = selectedSpecIds.filter(id => id !== primarySpecId);
      setIsDuplicating(true);
      try {
        const res = await fetch(`/api/exams/${activeExamId}/duplicate-to-specs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ specializationIds: otherSpecIds }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل النسخ");
        const successCount = data.results?.filter((r: any) => r.examId).length ?? 0;
        const failedResults = data.results?.filter((r: any) => !r.examId) ?? [];
        let msg = `✓ تم نسخ الاختبار إلى ${successCount} تخصص بنجاح`;
        if (failedResults.length > 0) {
          const specNames = failedResults.map((r: any) => {
            const spec = specializations?.find(s => s.id === r.specId);
            return `${spec?.name || r.specId}: ${r.status}`;
          });
          msg += `\n⚠ تعذر النسخ: ${specNames.join("، ")}`;
        }
        setDuplicateStatus(msg);
      } catch (e: any) {
        setDuplicateStatus(`⚠ ${e.message}`);
      } finally {
        setIsDuplicating(false);
      }
    }
    setIsOpen(false);
    setActiveExamId(null);
    setEditingExamId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
  };

  const closeDialog = () => {
    setIsOpen(false);
    setActiveExamId(null);
    setEditingExamId(null);
    setDuplicateStatus(null);
    queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
  };

  // ─── Save exam (create or edit) ─────────────────────────────────────────────
  const handleSaveExam = () => {
    if (!title.trim() || !unitId) return;
    setSaveError(null);
    const data = {
      title,
      unitId: parseInt(unitId),
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      questionLimit: questionLimit ? parseInt(questionLimit) : null,
    };

    if (editingExamId) {
      updateExamMut.mutate({ id: editingExamId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
          setPhase("questions");
          resetQForm();
        },
        onError: (err: any) => {
          setSaveError(err?.message || "فشل حفظ الاختبار — تحقق من صلاحياتك أو حاول مجدداً");
        },
      });
    } else {
      createExamMut.mutate({ data }, {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
          setActiveExamId(created.id);
          setEditingExamId(created.id);
          setPhase("questions");
          resetQForm();
        },
        onError: (err: any) => {
          setSaveError(err?.message || "فشل إنشاء الاختبار — تحقق من صلاحياتك أو حاول مجدداً");
        },
      });
    }
  };

  // ─── Delete exam ─────────────────────────────────────────────────────────────
  const handleDeleteExam = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الامتحان وجميع أسئلته؟")) {
      deleteExamMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/exams"] }),
      });
    }
  };

  // ─── Question form helpers ───────────────────────────────────────────────────
  const resetQForm = () => {
    setEditingQId(null);
    setQText(""); setQImageUrl(null);
    setQOptions(["", "", "", ""]);
    setQCorrect("A");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditQuestion = (q: any) => {
    setEditingQId(q.id);
    setQText(q.text ?? "");
    setQImageUrl(q.imageUrl ?? null);
    setQOptions([q.optionA, q.optionB, q.optionC, q.optionD]);
    setQCorrect(q.correctOption);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setQImageUrl(await imageToBase64(file)); }
    catch { alert("فشل تحميل الصورة"); }
  };

  const handleSaveQuestion = () => {
    if (!activeExamId) return;
    if (!qText.trim() && !qImageUrl) return;
    if (qOptions.some(o => !o.trim())) return;

    const data = {
      examId: activeExamId,
      text: qText.trim() || " ",
      imageUrl: qImageUrl ?? null,
      optionA: qOptions[0], optionB: qOptions[1],
      optionC: qOptions[2], optionD: qOptions[3],
      correctOption: qCorrect,
      orderIndex: editingQId
        ? (activeExam?.questions?.find(q => q.id === editingQId)?.orderIndex ?? 0)
        : (activeExam?.questions?.length ?? 0),
    };

    const afterSave = () => {
      refetchExam();
      resetQForm();
    };

    if (editingQId) {
      updateQMut.mutate({ id: editingQId, data }, { onSuccess: afterSave });
    } else {
      createQMut.mutate({ data }, { onSuccess: afterSave });
    }
  };

  const handleDeleteQuestion = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
      deleteQMut.mutate({ id }, { onSuccess: () => refetchExam() });
    }
  };

  const isSavingQ = createQMut.isPending || updateQMut.isPending;
  const canSaveQ = (!!qText.trim() || !!qImageUrl) && qOptions.every(o => o.trim());

  return (
    <div className="space-y-6">
      {/* Duplicate status banner */}
      {duplicateStatus && (
        <div className="p-4 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20 whitespace-pre-line flex items-start justify-between gap-3">
          <span>{duplicateStatus}</span>
          <button onClick={() => setDuplicateStatus(null)} className="shrink-0 p-1 rounded hover:bg-primary/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة الامتحانات</h1>
        <Button onClick={openCreate} className="rounded-xl font-bold">
          <Plus className="w-4 h-4 ml-2" /> إنشاء اختبار
        </Button>
      </div>

      {/* ── Dialog ─────────────────────────────────────────────────────────── */}
      <Dialog open={isOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent
          className={`${phase === "questions" ? "sm:max-w-[780px]" : "sm:max-w-[500px]"} max-h-[90vh] overflow-y-auto transition-all duration-300`}
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              {phase === "questions" && (
                <button onClick={() => setPhase("exam")} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {phase === "exam"
                ? (editingExamId ? "تعديل بيانات الاختبار" : "إنشاء اختبار جديد")
                : `إضافة أسئلة — ${activeExam?.title ?? "..."}`}
            </DialogTitle>
          </DialogHeader>

          {/* ── Phase 1: Exam Info ───────────────────────────────────────────── */}
          {phase === "exam" && (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">التخصصات</label>
                <p className="text-xs text-muted-foreground">اختر تخصصاً أو أكثر — التخصص الأول يحدد المادة والوحدة، والباقي يتم نسخ الاختبار إليها تلقائياً</p>
                <div className="flex flex-wrap gap-2 p-3 border border-input rounded-xl bg-background">
                  {specializations?.map(s => {
                    const isSelected = selectedSpecIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            const newIds = selectedSpecIds.filter(id => id !== s.id);
                            setSelectedSpecIds(newIds);
                            if (newIds.length === 0 || selectedSpecIds[0] === s.id) {
                              setSubjectId(""); setUnitId("");
                            }
                          } else {
                            setSelectedSpecIds([...selectedSpecIds, s.id]);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        {s.name}
                        {selectedSpecIds[0] === s.id && selectedSpecIds.length > 1 && (
                          <span className="text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded">الرئيسي</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedSpecIds.length > 1 && (
                  <p className="text-xs text-secondary font-medium flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    سيتم نسخ الاختبار تلقائياً إلى {selectedSpecIds.length - 1} تخصص إضافي (نفس المادة والوحدة)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">المادة</label>
                <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setUnitId(""); }}
                  disabled={selectedSpecIds.length === 0}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
                  <option value="">اختر المادة...</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">الوحدة</label>
                <select value={unitId} onChange={e => setUnitId(e.target.value)}
                  disabled={!subjectId}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
                  <option value="">اختر الوحدة...</option>
                  {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">اسم الاختبار</label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: اختبار الفصل الأول" className="h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  مدة الاختبار (بالدقائق)
                </label>
                <Input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)}
                  placeholder="اتركه فارغاً للاختبار بلا وقت محدد"
                  className="h-12 rounded-xl" min={1} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-secondary" />
                  عدد الأسئلة المعروضة للطالب (عشوائي)
                </label>
                <Input
                  type="number"
                  value={questionLimit}
                  onChange={e => setQuestionLimit(e.target.value)}
                  placeholder="مثال: 30 — اتركه فارغاً لعرض جميع الأسئلة"
                  className="h-12 rounded-xl"
                  min={1}
                />
                {questionLimit && (
                  <p className="text-xs text-secondary font-medium">
                    ✦ سيختار النظام {questionLimit} سؤالاً عشوائياً من مجموع أسئلة الاختبار عند بدء كل طالب
                  </p>
                )}
              </div>

              {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                  <span className="text-base">⚠</span>
                  {saveError}
                </div>
              )}

              <Button
                onClick={handleSaveExam}
                disabled={!title.trim() || !unitId || createExamMut.isPending || updateExamMut.isPending}
                className="w-full h-12 rounded-xl font-bold mt-2"
              >
                {createExamMut.isPending || updateExamMut.isPending
                  ? "جاري الحفظ..."
                  : editingExamId ? "حفظ التعديلات والمتابعة لإضافة الأسئلة" : "إنشاء الاختبار وإضافة الأسئلة"}
                <ChevronRight className="w-4 h-4 mr-2" />
              </Button>
            </div>
          )}

          {/* ── Phase 2: Questions ───────────────────────────────────────────── */}
          {phase === "questions" && (
            <div className="py-4 space-y-6">
              {/* Questions list */}
              {(activeExam?.questions?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-muted-foreground">
                    الأسئلة المضافة ({activeExam?.questions?.length})
                  </h3>
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {activeExam?.questions?.map((q, i) => (
                      <div key={q.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${editingQId === q.id ? "bg-primary/5 border-r-2 border-r-primary" : ""}`}>
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        {q.imageUrl && (
                          <img src={q.imageUrl} alt="" className="w-8 h-8 rounded object-cover border shrink-0" />
                        )}
                        <p className="flex-1 text-sm font-medium truncate">{q.text?.trim() || "(صورة)"}</p>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditQuestion(q)}
                            className="p-1.5 rounded-lg text-secondary hover:bg-secondary/10 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question form */}
              <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-border">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  {editingQId ? "تعديل السؤال" : "إضافة سؤال جديد"}
                </h3>

                {/* Question text */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">نص السؤال</label>
                  <Textarea value={qText} onChange={e => setQText(e.target.value)}
                    placeholder="اكتب السؤال هنا... (أو أرفق صورة فقط)"
                    className="rounded-xl resize-none text-sm" rows={2} />
                </div>

                {/* Image upload */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <ImagePlus className="w-3 h-3" /> صورة السؤال (اختياري)
                  </label>
                  {qImageUrl ? (
                    <div className="relative inline-block">
                      <img src={qImageUrl} alt="صورة السؤال" className="max-h-32 rounded-xl border object-contain" />
                      <button onClick={() => { setQImageUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center shadow">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors text-xs font-medium">
                      <ImagePlus className="w-4 h-4" /> رفع صورة
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>

                {/* Options */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    الخيارات الأربعة — انقر الدائرة لتعيين الإجابة الصحيحة
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OPTION_KEYS.map((key, i) => (
                      <div key={key} className="flex items-center gap-2">
                        <button type="button" onClick={() => setQCorrect(key)}
                          className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                            qCorrect === key
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary"
                          }`}>
                          {qCorrect === key ? <CheckCircle className="w-3.5 h-3.5" /> : OPTION_LABELS[i]}
                        </button>
                        <Input value={qOptions[i]}
                          onChange={e => { const u = [...qOptions]; u[i] = e.target.value; setQOptions(u); }}
                          placeholder={`الخيار ${OPTION_LABELS[i]}`}
                          className="h-9 rounded-xl text-sm flex-1" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveQuestion} disabled={!canSaveQ || isSavingQ}
                    className="flex-1 h-10 rounded-xl font-bold text-sm">
                    {isSavingQ ? "جاري الحفظ..." : editingQId ? "حفظ التعديل" : "إضافة السؤال"}
                  </Button>
                  {editingQId && (
                    <Button variant="outline" onClick={resetQForm} className="h-10 rounded-xl font-bold text-sm px-4">
                      إلغاء
                    </Button>
                  )}
                </div>
              </div>

              {/* Done button */}
              <div className="space-y-3 pt-2 border-t border-border">
                {selectedSpecIds.length > 1 && (
                  <div className="p-3 rounded-xl bg-secondary/10 text-secondary text-sm font-medium border border-secondary/20 flex items-center gap-2">
                    <Copy className="w-4 h-4 shrink-0" />
                    عند الانتهاء، سيتم نسخ الاختبار تلقائياً إلى {selectedSpecIds.length - 1} تخصص إضافي
                  </div>
                )}
                <Button
                  onClick={handleFinishExam}
                  disabled={isDuplicating}
                  className="w-full h-11 rounded-xl font-bold"
                >
                  {isDuplicating ? (
                    <>جاري نسخ الاختبار إلى التخصصات الأخرى...</>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      {selectedSpecIds.length > 1 ? "إنهاء ونسخ الاختبار إلى التخصصات الأخرى" : "انتهيت من الاختبار"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Exams Table ─────────────────────────────────────────────────────── */}
      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">#</th>
              <th className="px-6 py-4 border-b">الاختبار</th>
              <th className="px-6 py-4 border-b">الوحدة</th>
              <th className="px-6 py-4 border-b text-center">الوقت</th>
              <th className="px-6 py-4 border-b text-center">الأسئلة</th>
              <th className="px-6 py-4 border-b text-center">العشوائي</th>
              <th className="px-6 py-4 border-b w-40">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : exams?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="space-y-3">
                    <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="font-bold text-muted-foreground">لا توجد اختبارات بعد</p>
                    <p className="text-xs text-muted-foreground">اضغط "إنشاء اختبار" للبدء</p>
                  </div>
                </td>
              </tr>
            ) : exams?.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{item.id}</td>
                <td className="px-6 py-4 font-bold">{item.title}</td>
                <td className="px-6 py-4 text-muted-foreground text-sm">{allUnits?.find(u => u.id === item.unitId)?.name ?? "—"}</td>
                <td className="px-6 py-4 text-center">
                  {item.timeLimit ? (
                    <span className="inline-flex items-center gap-1 text-secondary font-bold text-sm">
                      <Clock className="w-3 h-3" />{item.timeLimit} د
                    </span>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => openQuestionsFor(item)}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                    <BookOpen className="w-3 h-3" />{item.questionCount} سؤال
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.questionLimit ? (
                    <span className="inline-flex items-center gap-1 text-secondary font-bold text-sm bg-secondary/10 px-2 py-0.5 rounded-lg">
                      🎲 {item.questionLimit}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">الكل</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openQuestionsFor(item)}
                      className="h-8 px-3 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">
                      + أسئلة
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}
                      className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/10">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteExam(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
