import { useState, useRef } from "react";
import { useGetExams, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, getExam } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, ImagePlus, X, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GRADE_OPTIONS = ["أ", "ب", "ج", "د"];
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminQuestions() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const opts = { request: { headers } };

  const { data: exams } = useGetExams({}, opts);
  const [selectedExamId, setSelectedExamId] = useState("");

  const { data: examDetail, isLoading } = useQuery({
    queryKey: ["/api/exams", selectedExamId],
    queryFn: () => getExam(parseInt(selectedExamId), opts.request),
    enabled: !!selectedExamId,
  });

  const createMut = useCreateQuestion(opts);
  const updateMut = useUpdateQuestion(opts);
  const deleteMut = useDeleteQuestion(opts);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<"A" | "B" | "C" | "D">("A");
  const [orderIndex, setOrderIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setText(item.text ?? "");
      setImageUrl(item.imageUrl ?? null);
      setOptions([item.optionA, item.optionB, item.optionC, item.optionD]);
      setCorrectOption(item.correctOption);
      setOrderIndex(item.orderIndex);
    } else {
      setEditingId(null);
      setText("");
      setImageUrl(null);
      setOptions(["", "", "", ""]);
      setCorrectOption("A");
      setOrderIndex(examDetail?.questions?.length ?? 0);
    }
    setIsOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await imageToBase64(file);
      setImageUrl(base64);
    } catch {
      alert("فشل تحميل الصورة");
    }
  };

  const handleSave = () => {
    if (!selectedExamId || !options[0] || !options[1] || !options[2] || !options[3]) return;
    if (!text && !imageUrl) return;

    const data = {
      examId: parseInt(selectedExamId),
      text: text || " ",
      imageUrl: imageUrl ?? null,
      optionA: options[0],
      optionB: options[1],
      optionC: options[2],
      optionD: options[3],
      correctOption,
      orderIndex,
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", selectedExamId] });
      setIsOpen(false);
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data }, { onSuccess: invalidate });
    } else {
      createMut.mutate({ data }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/exams", selectedExamId] }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold font-serif">إدارة الأسئلة</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
            className="flex h-10 min-w-[220px] rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">اختر امتحاناً لعرض أسئلته...</option>
            {exams?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <Button onClick={() => handleOpen()} disabled={!selectedExamId} className="rounded-xl font-bold shrink-0">
            <Plus className="w-4 h-4 ml-2" /> إضافة سؤال
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{editingId ? "تعديل سؤال" : "إضافة سؤال جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">نص السؤال</label>
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="اكتب نص السؤال هنا... (أو أرفق صورة فقط)"
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                صورة السؤال (اختياري)
              </label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl} alt="صورة السؤال" className="max-h-48 rounded-xl border border-border object-contain" />
                  <button
                    onClick={() => { setImageUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full justify-center"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-sm font-medium">انقر لرفع صورة السؤال</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold">الخيارات الأربعة</label>
              <div className="grid grid-cols-1 gap-3">
                {OPTION_KEYS.map((key, i) => (
                  <div key={key} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCorrectOption(key)}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                        correctOption === key
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                      title="انقر لتعيين كإجابة صحيحة"
                    >
                      {correctOption === key ? <CheckCircle className="w-4 h-4" /> : GRADE_OPTIONS[i]}
                    </button>
                    <Input
                      value={options[i]}
                      onChange={e => {
                        const updated = [...options];
                        updated[i] = e.target.value;
                        setOptions(updated);
                      }}
                      placeholder={`الخيار ${GRADE_OPTIONS[i]}`}
                      className="h-10 rounded-xl flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" />
                انقر على الدائرة لتعيين الإجابة الصحيحة (المحددة حالياً: الخيار {GRADE_OPTIONS[OPTION_KEYS.indexOf(correctOption)]})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">الترتيب</label>
              <Input
                type="number"
                value={orderIndex}
                onChange={e => setOrderIndex(parseInt(e.target.value))}
                className="h-10 rounded-xl w-32"
                min={0}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={
                (!text && !imageUrl) ||
                options.some(o => !o.trim()) ||
                createMut.isPending || updateMut.isPending
              }
              className="w-full h-12 rounded-xl font-bold"
            >
              {createMut.isPending || updateMut.isPending ? "جاري الحفظ..." : "حفظ السؤال"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!selectedExamId ? (
        <div className="bg-muted/30 border border-dashed rounded-3xl p-16 text-center">
          <p className="text-muted-foreground font-bold text-lg">اختر امتحاناً لعرض وإدارة أسئلته</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-background">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4 border-b w-16">#</th>
                <th className="px-6 py-4 border-b">السؤال</th>
                <th className="px-6 py-4 border-b text-center">صورة</th>
                <th className="px-6 py-4 border-b text-center">الإجابة الصحيحة</th>
                <th className="px-6 py-4 border-b w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : examDetail?.questions?.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-mono text-center text-muted-foreground">{item.orderIndex + 1}</td>
                  <td className="px-6 py-4 font-bold max-w-xs truncate">{item.text?.trim() || "—"}</td>
                  <td className="px-6 py-4 text-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="سؤال" className="w-10 h-10 rounded object-cover mx-auto border" />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center mx-auto">
                      {GRADE_OPTIONS[OPTION_KEYS.indexOf(item.correctOption as any)] ?? item.correctOption}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(item)} className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {examDetail?.questions?.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center font-bold text-muted-foreground">لا توجد أسئلة في هذا الامتحان بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
