import { useState, useRef } from "react";
import {
  useGetExams, useGetSpecializations, useGetSubjects, useGetUnits,
  useCreateExam, useUpdateExam, useDeleteExam,
  useCreateQuestion, useUpdateQuestion, useDeleteQuestion,
  useGetAllExamTargetUnits,
  fetchExamDetail, appendExamToSpecs, toggleExamPublish,
} from "@/lib/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Edit2, Trash2, Clock, BookOpen, ChevronRight,
  ImagePlus, X, CheckCircle, CheckCircle2, ArrowLeft, Copy, Check, Share2,
  Eye, EyeOff,
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
  const queryClient = useQueryClient();

  const { data: exams, isLoading } = useGetExams();
  const { data: specializations } = useGetSpecializations();
  const { data: allSubjects } = useGetSubjects();
  const { data: allUnits } = useGetUnits();
  const { data: examTargetLinks } = useGetAllExamTargetUnits();

  const createExamMut = useCreateExam();
  const updateExamMut = useUpdateExam();
  const deleteExamMut = useDeleteExam();
  const createQMut = useCreateQuestion();
  const updateQMut = useUpdateQuestion();
  const deleteQMut = useDeleteQuestion();

  const [phase, setPhase] = useState<"exam" | "questions">("exam");
  const [isOpen, setIsOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectedSpecIds, setSelectedSpecIds] = useState<number[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questionLimit, setQuestionLimit] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<string | null>(null);

  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [qText, setQText] = useState("");
  const [qImageUrl, setQImageUrl] = useState<string | null>(null);
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qOptionImages, setQOptionImages] = useState<(string | null)[]>([null, null, null, null]);
  const [qCorrect, setQCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const normName = (n: string) =>
    n.trim().replace(/\s+/g, " ")
      .replace(/آ|أ|إ|ٱ/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/َ|ُ|ِ|ّ|ْ|ٌ|ً|ٍ/g, "");
  const nameMatches = (a: string, b: string) => {
    const na = normName(a), nb = normName(b);
    return na === nb || na.startsWith(nb) || nb.startsWith(na);
  };

  const availableSubjects = (() => {
    if (!allSubjects || selectedSpecIds.length === 0) return [];
    return allSubjects.filter(s => selectedSpecIds.includes(s.specializationId));
  })();

  const getSpecName = (specId: number) => specializations?.find(sp => sp.id === specId)?.name ?? "";

  const filteredUnits = (() => {
    if (!allUnits || selectedSubjectIds.length === 0) return [];
    const orderedSubs = selectedSubjectIds
      .map(id => allSubjects?.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);
    if (orderedSubs.length === 0) return [];
    const firstSub = orderedSubs[0];
    const firstSubUnits = allUnits.filter(u => u.subjectId === firstSub.id);
    if (orderedSubs.length === 1) return firstSubUnits;
    return firstSubUnits.filter(pu => {
      return orderedSubs.slice(1).every(otherSub => {
        const otherUnits = allUnits.filter(u => u.subjectId === otherSub.id);
        return otherUnits.some(ou => nameMatches(ou.name, pu.name));
      });
    });
  })();

  const primarySpecId = (() => {
    if (unitId && allUnits && allSubjects) {
      const u = allUnits.find(u => u.id === parseInt(unitId));
      if (u) {
        const s = allSubjects.find(s => s.id === u.subjectId);
        if (s) return s.specializationId;
      }
    }
    if (selectedSubjectIds.length > 0 && allSubjects) {
      const firstSub = allSubjects.find(s => s.id === selectedSubjectIds[0]);
      if (firstSub) return firstSub.specializationId;
    }
    return selectedSpecIds[0] ?? null;
  })();

  const { data: activeExam, refetch: refetchExam } = useQuery({
    queryKey: ["/api/exams", String(activeExamId)],
    queryFn: () => fetchExamDetail(activeExamId!),
    enabled: !!activeExamId,
  });

  const openCreate = () => {
    setEditingExamId(null);
    setActiveExamId(null);
    setSelectedSpecIds([]); setSelectedSubjectIds([]); setUnitId(""); setTitle(""); setTimeLimit(""); setQuestionLimit("");
    setSaveError(null);
    setDuplicateStatus(null);
    setPhase("exam");
    setIsOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingExamId(item.id);
    setActiveExamId(item.id);
    setTitle(item.title);
    setTimeLimit(item.timeLimit?.toString() ?? "");
    setQuestionLimit(item.questionLimit?.toString() ?? "");
    const unit = allUnits?.find(u => u.id === item.unitId);
    const sub = allSubjects?.find(s => s.id === unit?.subjectId);
    setUnitId(item.unitId?.toString() ?? "");

    const specIds: number[] = [];
    const subjectIds: number[] = [];
    if (sub) {
      specIds.push(sub.specializationId);
      subjectIds.push(sub.id);
    }
    const linkedUnitIds = examTargetLinks?.[item.id] ?? [];
    for (const luid of linkedUnitIds) {
      const lu = allUnits?.find(u => u.id === luid);
      if (!lu) continue;
      const ls = allSubjects?.find(s => s.id === lu.subjectId);
      if (ls) {
        if (!specIds.includes(ls.specializationId)) specIds.push(ls.specializationId);
        if (!subjectIds.includes(ls.id)) subjectIds.push(ls.id);
      }
    }
    setSelectedSpecIds(specIds);
    setSelectedSubjectIds(subjectIds);

    setSaveError(null);
    setDuplicateStatus(null);
    setPhase("exam");
    setIsOpen(true);
  };

  const openQuestionsFor = (item: any) => {
    setActiveExamId(item.id);
    setEditingExamId(null);
    resetQForm();
    setPhase("questions");
    setIsOpen(true);
  };

  const [isDuplicating, setIsDuplicating] = useState(false);
  const [publishExam, setPublishExam] = useState<any>(null);
  const [publishSpecIds, setPublishSpecIds] = useState<number[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);

  const getExamSpecNames = (exam: any): string[] => {
    if (!exam || !allUnits || !allSubjects || !specializations) return [];
    const specNames: string[] = [];
    const unit = allUnits.find(u => u.id === exam.unitId);
    if (unit) {
      const subject = allSubjects.find(s => s.id === unit.subjectId);
      if (subject) {
        const spec = specializations.find(sp => sp.id === subject.specializationId);
        if (spec) specNames.push(spec.name);
      }
    }
    const linkedUnitIds = examTargetLinks?.[exam.id] ?? [];
    for (const linkedUnitId of linkedUnitIds) {
      const linkedUnit = allUnits.find(u => u.id === linkedUnitId);
      if (!linkedUnit) continue;
      const linkedSub = allSubjects.find(s => s.id === linkedUnit.subjectId);
      if (!linkedSub) continue;
      const linkedSpec = specializations.find(sp => sp.id === linkedSub.specializationId);
      if (linkedSpec && !specNames.includes(linkedSpec.name)) specNames.push(linkedSpec.name);
    }
    return specNames;
  };

  const getPublishableSpecs = (exam: any) => {
    if (!exam || !allUnits || !allSubjects || !specializations) return [];
    const unit = allUnits.find(u => u.id === exam.unitId);
    if (!unit) return [];
    const subject = allSubjects.find(s => s.id === unit.subjectId);
    if (!subject) return [];
    const examSpecId = subject.specializationId;
    const unitNN = normName(unit.name);
    const linkedUnitIds = new Set(examTargetLinks?.[exam.id] ?? []);
    return specializations.filter(spec => {
      if (spec.id === examSpecId) return false;
      const matchingSubs = allSubjects.filter(s => s.specializationId === spec.id && nameMatches(s.name, subject.name));
      if (matchingSubs.length === 0) return false;
      const matchingUnits = matchingSubs.flatMap(ms => allUnits!.filter(u => u.subjectId === ms.id && normName(u.name) === unitNN));
      if (matchingUnits.length === 0) return false;
      const alreadyLinked = matchingUnits.some(mu => linkedUnitIds.has(mu.id));
      return !alreadyLinked;
    });
  };

  const openPublishDialog = (exam: any) => {
    setPublishExam(exam);
    setPublishSpecIds([]);
    setPublishResult(null);
  };

  const handlePublish = async () => {
    if (!publishExam || publishSpecIds.length === 0 || !allUnits || !allSubjects) return;
    setIsPublishing(true);
    setPublishResult(null);
    try {
      const results = await appendExamToSpecs({
        examId: publishExam.id,
        specIds: publishSpecIds,
        examUnitId: publishExam.unitId,
        allUnits: allUnits,
        allSubjects: allSubjects,
      });
      const successCount = results.filter(r => r.unitId !== null).length;
      const failedResults = results.filter(r => r.unitId === null);
      let msg = `✓ تم ربط الاختبار بـ ${successCount} تخصص بنجاح`;
      if (failedResults.length > 0) {
        const specNames = failedResults.map(r => {
          const spec = specializations?.find(s => s.id === r.specId);
          return `${spec?.name || r.specId}: لم يتم العثور على وحدة مطابقة`;
        });
        msg += ` | ⚠ ${specNames.join("، ")}`;
      }
      setPublishResult(msg);
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["exam-target-links"] });
      setPublishSpecIds([]);
    } catch (e: any) {
      setPublishResult(`⚠ ${e.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const derivedSpecIds = (() => {
    if (!allSubjects) return [];
    const specIds = new Set<number>();
    for (const sid of selectedSubjectIds) {
      const sub = allSubjects.find(s => s.id === sid);
      if (sub) specIds.add(sub.specializationId);
    }
    return [...specIds];
  })();

  const linkToOtherSpecs = async (examId: number, examUnitId: number) => {
    if (derivedSpecIds.length <= 1 || !primarySpecId || !allUnits || !allSubjects) return;
    const otherSpecIds = derivedSpecIds.filter(id => id !== primarySpecId);
    const alreadyLinkedSpecIds = new Set<number>();
    const linkedUnitIds = examTargetLinks?.[examId] ?? [];
    for (const luid of linkedUnitIds) {
      const lu = allUnits?.find(u => u.id === luid);
      if (!lu) continue;
      const ls = allSubjects?.find(s => s.id === lu.subjectId);
      if (ls) alreadyLinkedSpecIds.add(ls.specializationId);
    }
    const newSpecIds = otherSpecIds.filter(id => !alreadyLinkedSpecIds.has(id));
    if (newSpecIds.length > 0) {
      try {
        const results = await appendExamToSpecs({
          examId,
          specIds: newSpecIds,
          examUnitId,
          allUnits: allUnits!,
          allSubjects: allSubjects!,
        });
        const successCount = results.filter(r => r.unitId !== null).length;
        if (successCount > 0) setDuplicateStatus(`✓ تم ربط الاختبار بـ ${successCount} مادة إضافية`);
        queryClient.invalidateQueries({ queryKey: ["exam-target-links"] });
      } catch {}
    }
  };

  const handleSaveExam = () => {
    if (!title.trim() || !unitId) return;
    setSaveError(null);
    const examUnitId = parseInt(unitId);
    const data = {
      title,
      unitId: examUnitId,
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      questionLimit: questionLimit ? parseInt(questionLimit) : null,
    };

    if (editingExamId) {
      updateExamMut.mutate({ id: editingExamId, data }, {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
          await linkToOtherSpecs(editingExamId, examUnitId);
          setPhase("questions");
          resetQForm();
        },
        onError: (err: any) => {
          setSaveError(err?.message || "فشل حفظ الاختبار — تحقق من صلاحياتك أو حاول مجدداً");
        },
      });
    } else {
      createExamMut.mutate({ data }, {
        onSuccess: async (created) => {
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
          setActiveExamId(created.id);
          setEditingExamId(created.id);
          await linkToOtherSpecs(created.id, examUnitId);
          setPhase("questions");
          resetQForm();
        },
        onError: (err: any) => {
          setSaveError(err?.message || "فشل إنشاء الاختبار — تحقق من صلاحياتك أو حاول مجدداً");
        },
      });
    }
  };

  const handleDeleteExam = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الامتحان وجميع أسئلته؟")) {
      deleteExamMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/exams"] }),
      });
    }
  };

  const handleFinishExam = async () => {
    if (activeExamId && derivedSpecIds.length > 1 && primarySpecId && allUnits && allSubjects) {
      const otherSpecIds = derivedSpecIds.filter(id => id !== primarySpecId);
      setIsDuplicating(true);
      try {
        const examUnitId = (parseInt(unitId) || allUnits.find(u => u.id === (activeExam as any)?.unitId)?.id) ?? 0;
        const results = await appendExamToSpecs({
          examId: activeExamId,
          specIds: otherSpecIds,
          examUnitId,
          allUnits: allUnits!,
          allSubjects: allSubjects!,
        });
        const successCount = results.filter(r => r.unitId !== null).length;
        const failedResults = results.filter(r => r.unitId === null);
        let msg = `✓ تم ربط الاختبار بـ ${successCount} مادة إضافية بنجاح`;
        if (failedResults.length > 0) {
          const specNames = failedResults.map(r => {
            const spec = specializations?.find(s => s.id === r.specId);
            return `${spec?.name || r.specId}: لم يتم العثور على وحدة مطابقة`;
          });
          msg += `\n⚠ تعذر الربط: ${specNames.join("، ")}`;
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
    queryClient.invalidateQueries({ queryKey: ["exam-target-links"] });
  };

  const closeDialog = () => {
    setIsOpen(false);
    setActiveExamId(null);
    setEditingExamId(null);
    setDuplicateStatus(null);
    queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    queryClient.invalidateQueries({ queryKey: ["exam-target-links"] });
  };

  const handleTogglePublish = async (examId: number, currentlyPublished: boolean) => {
    try {
      await toggleExamPublish(examId, !currentlyPublished);
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    } catch {}
  };

  const resetQForm = () => {
    setEditingQId(null);
    setQText(""); setQImageUrl(null);
    setQOptions(["", "", "", ""]);
    setQOptionImages([null, null, null, null]);
    setQCorrect("A");
    if (fileInputRef.current) fileInputRef.current.value = "";
    optionFileRefs.current.forEach(r => { if (r) r.value = ""; });
  };

  const openEditQuestion = (q: any) => {
    setEditingQId(q.id);
    setQText(q.text ?? "");
    setQImageUrl(q.imageUrl ?? null);
    setQOptions([q.optionA, q.optionB, q.optionC, q.optionD]);
    setQOptionImages([q.optionAImage ?? null, q.optionBImage ?? null, q.optionCImage ?? null, q.optionDImage ?? null]);
    setQCorrect(q.correctOption);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setQImageUrl(await imageToBase64(file)); }
    catch { alert("فشل تحميل الصورة"); }
  };

  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageToBase64(file);
      setQOptionImages(prev => { const next = [...prev]; next[idx] = base64; return next; });
    } catch { alert("فشل تحميل الصورة"); }
  };

  const handleSaveQuestion = () => {
    if (!activeExamId) return;
    if (!qText.trim() && !qImageUrl) return;
    const hasEmptyTextOption = qOptions.some((o, i) => !o.trim() && !qOptionImages[i]);
    if (hasEmptyTextOption) return;

    const data = {
      examId: activeExamId,
      text: qText.trim() || " ",
      imageUrl: qImageUrl ?? null,
      optionA: qOptions[0] || " ", optionAImage: qOptionImages[0] ?? null,
      optionB: qOptions[1] || " ", optionBImage: qOptionImages[1] ?? null,
      optionC: qOptions[2] || " ", optionCImage: qOptionImages[2] ?? null,
      optionD: qOptions[3] || " ", optionDImage: qOptionImages[3] ?? null,
      correctOption: qCorrect,
      orderIndex: editingQId
        ? (activeExam?.questions?.find((q: any) => q.id === editingQId)?.orderIndex ?? 0)
        : (activeExam?.questions?.length ?? 0),
    };

    const afterSave = () => { refetchExam(); resetQForm(); };

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
  const canSaveQ = (!!qText.trim() || !!qImageUrl) && qOptions.every((o, i) => o.trim() || !!qOptionImages[i]);

  return (
    <div className="space-y-6">
      {duplicateStatus && (
        <div className="p-4 rounded-xl bg-primary/10 text-primary text-sm font-medium border border-primary/20 whitespace-pre-line flex items-start justify-between gap-3">
          <span>{duplicateStatus}</span>
          <button onClick={() => setDuplicateStatus(null)} className="shrink-0 p-1 rounded hover:bg-primary/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة الامتحانات</h1>
        <Button onClick={openCreate} className="rounded-xl font-bold">
          <Plus className="w-4 h-4 ml-2" /> إنشاء اختبار
        </Button>
      </div>

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
                : `إضافة أسئلة — ${(activeExam as any)?.title ?? "..."}`}
            </DialogTitle>
          </DialogHeader>

          {phase === "exam" && (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">التخصصات</label>
                <p className="text-xs text-muted-foreground">اختر تخصصاً أو أكثر — عند اختيار عدة تخصصات تظهر فقط المواد المشتركة بينها</p>
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
                            setSelectedSubjectIds(prev => prev.filter(sid => {
                              const sub = allSubjects?.find(ss => ss.id === sid);
                              return sub ? sub.specializationId !== s.id : true;
                            }));
                          } else {
                            setSelectedSpecIds([...selectedSpecIds, s.id]);
                          }
                          setUnitId("");
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">المواد</label>
                <p className="text-xs text-muted-foreground">اختر مادة أو أكثر لنشر الاختبار فيها — عند اختيار عدة مواد تظهر الوحدات المشتركة</p>
                {selectedSpecIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 border border-dashed border-border rounded-xl text-center">اختر تخصصاً أولاً</p>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 border border-input rounded-xl bg-background max-h-48 overflow-y-auto">
                    {availableSubjects.map(s => {
                      const isSelected = selectedSubjectIds.includes(s.id);
                      const specName = getSpecName(s.specializationId);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSubjectIds(prev => prev.filter(id => id !== s.id));
                            } else {
                              setSelectedSubjectIds(prev => [...prev, s.id]);
                            }
                            setUnitId("");
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                            isSelected
                              ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-secondary hover:text-secondary"
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                          {s.name}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? "bg-secondary-foreground/20" : "bg-muted"}`}>
                            {specName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedSubjectIds.length > 1 && (
                  <p className="text-xs text-secondary font-medium flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    سيتم نشر الاختبار في {selectedSubjectIds.length} مادة — الوحدات المشتركة فقط
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">الوحدة</label>
                <select value={unitId} onChange={e => setUnitId(e.target.value)}
                  disabled={selectedSubjectIds.length === 0}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
                  <option value="">اختر الوحدة...</option>
                  {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                {selectedSubjectIds.length > 1 && filteredUnits.length === 0 && (
                  <p className="text-xs text-destructive">لا توجد وحدات مشتركة بين المواد المختارة</p>
                )}
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

          {phase === "questions" && (
            <div className="py-4 space-y-6">
              {((activeExam as any)?.questions?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-muted-foreground">
                    الأسئلة المضافة ({(activeExam as any)?.questions?.length})
                  </h3>
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {(activeExam as any)?.questions?.map((q: any, i: number) => (
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

              <div className="space-y-4 bg-muted/20 rounded-2xl p-4 border border-border">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  {editingQId ? "تعديل السؤال" : "إضافة سؤال جديد"}
                </h3>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">نص السؤال</label>
                  <Textarea value={qText} onChange={e => setQText(e.target.value)}
                    placeholder="اكتب السؤال هنا... (أو أرفق صورة فقط)"
                    className="rounded-xl resize-none text-sm" rows={2} />
                </div>

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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">
                    الخيارات الأربعة — انقر الدائرة لتعيين الإجابة الصحيحة
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OPTION_KEYS.map((key, i) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center gap-2">
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
                          <button type="button"
                            onClick={() => optionFileRefs.current[i]?.click()}
                            className="shrink-0 w-8 h-8 rounded-lg border border-dashed border-border hover:border-primary flex items-center justify-center transition-colors"
                            title="إضافة صورة للخيار"
                          >
                            <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <input ref={el => { optionFileRefs.current[i] = el; }} type="file" accept="image/*" className="hidden"
                            onChange={e => handleOptionImageUpload(e, i)} />
                        </div>
                        {qOptionImages[i] && (
                          <div className="relative mr-9">
                            <img src={qOptionImages[i]!} alt={`صورة الخيار ${OPTION_LABELS[i]}`}
                              className="h-16 rounded-lg border border-border object-contain" />
                            <button type="button"
                              onClick={() => setQOptionImages(prev => { const n = [...prev]; n[i] = null; return n; })}
                              className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

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

              <div className="space-y-3 pt-2 border-t border-border">
                {derivedSpecIds.length > 1 && (
                  <div className="p-3 rounded-xl bg-secondary/10 text-secondary text-sm font-medium border border-secondary/20 flex items-center gap-2">
                    <Copy className="w-4 h-4 shrink-0" />
                    عند الانتهاء، سيتم ربط الاختبار بـ {selectedSubjectIds.length - 1} مادة إضافية
                  </div>
                )}
                <Button
                  onClick={handleFinishExam}
                  disabled={isDuplicating}
                  className="w-full h-11 rounded-xl font-bold"
                >
                  {isDuplicating ? (
                    <>جاري ربط الاختبار بالمواد الأخرى...</>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      {derivedSpecIds.length > 1 ? `إنهاء وربط الاختبار بـ ${selectedSubjectIds.length - 1} مادة أخرى` : "انتهيت من الاختبار"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">#</th>
              <th className="px-6 py-4 border-b">الاختبار</th>
              <th className="px-6 py-4 border-b text-center">الحالة</th>
              <th className="px-6 py-4 border-b">الوحدة</th>
              <th className="px-6 py-4 border-b">التخصصات</th>
              <th className="px-6 py-4 border-b text-center">الوقت</th>
              <th className="px-6 py-4 border-b text-center">الأسئلة</th>
              <th className="px-6 py-4 border-b text-center">العشوائي</th>
              <th className="px-6 py-4 border-b w-40">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : exams?.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
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
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleTogglePublish(item.id, item.isPublished)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      item.isPublished
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                    title={item.isPublished ? "اضغط لإلغاء النشر" : "اضغط للنشر"}
                  >
                    {item.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {item.isPublished ? "منشور" : "مسودة"}
                  </button>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-sm">{allUnits?.find(u => u.id === item.unitId)?.name ?? "—"}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {getExamSpecNames(item).map((sn, i) => (
                      <span key={i} className="inline-block bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {sn}
                      </span>
                    ))}
                  </div>
                </td>
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
                    {getPublishableSpecs(item).length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => openPublishDialog(item)}
                        className="h-8 px-2 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg" title="نشر في تخصصات أخرى">
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Dialog open={!!publishExam} onOpenChange={(open) => { if (!open) setPublishExam(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">نشر الاختبار في تخصصات أخرى</DialogTitle>
          </DialogHeader>
          {publishExam && (() => {
            const availableSpecs = getPublishableSpecs(publishExam);
            return (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-bold">{publishExam.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {allUnits?.find(u => u.id === publishExam.unitId)?.name ?? ""}
                  </p>
                </div>

                {availableSpecs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد تخصصات أخرى متاحة للنشر</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground">اختر التخصصات للنشر فيها</label>
                      <div className="flex flex-wrap gap-2">
                        {availableSpecs.map(spec => {
                          const isSelected = publishSpecIds.includes(spec.id);
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => {
                                setPublishSpecIds(prev =>
                                  isSelected ? prev.filter(id => id !== spec.id) : [...prev, spec.id]
                                );
                              }}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              {spec.name}
                            </button>
                          );
                        })}
                      </div>
                      {availableSpecs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPublishSpecIds(
                            publishSpecIds.length === availableSpecs.length ? [] : availableSpecs.map(s => s.id)
                          )}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          {publishSpecIds.length === availableSpecs.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                        </button>
                      )}
                    </div>

                    <Button
                      onClick={handlePublish}
                      disabled={publishSpecIds.length === 0 || isPublishing}
                      className="w-full h-11 rounded-xl font-bold"
                    >
                      {isPublishing ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          جاري النشر...
                        </span>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 ml-2" />
                          نشر في {publishSpecIds.length || "..."} تخصص
                        </>
                      )}
                    </Button>
                  </>
                )}

                {publishResult && (
                  <div className={`p-3 rounded-xl text-sm font-medium border ${
                    publishResult.startsWith("✓")
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}>
                    {publishResult}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
