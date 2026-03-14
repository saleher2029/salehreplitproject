import { useState } from "react";
import {
  useGetExams, useGetSpecializations, useGetSubjects, useGetUnits,
  useCreateExam, useUpdateExam, useDeleteExam
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Clock, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminExams() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const opts = { request: { headers: token ? { Authorization: `Bearer ${token}` } : {} } };

  const { data: exams, isLoading } = useGetExams({}, opts);
  const { data: specializations } = useGetSpecializations({}, opts);
  const { data: allSubjects } = useGetSubjects({}, opts);
  const { data: allUnits } = useGetUnits({}, opts);

  const createMut = useCreateExam(opts);
  const updateMut = useUpdateExam(opts);
  const deleteMut = useDeleteExam(opts);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [specId, setSpecId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("");

  const filteredSubjects = allSubjects?.filter(s => !specId || s.specializationId === parseInt(specId)) ?? [];
  const filteredUnits = allUnits?.filter(u => !subjectId || u.subjectId === parseInt(subjectId)) ?? [];

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setTitle(item.title);
      setTimeLimit(item.timeLimit?.toString() ?? "");
      setUnitId(item.unitId?.toString() ?? "");
      const unit = allUnits?.find(u => u.id === item.unitId);
      const sub = allSubjects?.find(s => s.id === unit?.subjectId);
      setSubjectId(unit?.subjectId?.toString() ?? "");
      setSpecId(sub?.specializationId?.toString() ?? "");
    } else {
      setEditingId(null);
      setTitle("");
      setTimeLimit("");
      setSpecId("");
      setSubjectId("");
      setUnitId("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !unitId) return;
    const data = {
      title,
      unitId: parseInt(unitId),
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
          setIsOpen(false);
        },
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
          setIsOpen(false);
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الامتحان؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/exams"] }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة الامتحانات</h1>
        <Button onClick={() => handleOpen()} className="rounded-xl font-bold">
          <Plus className="w-4 h-4 ml-2" /> إنشاء امتحان
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{editingId ? "تعديل امتحان" : "إنشاء امتحان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">التخصص</label>
              <select
                value={specId}
                onChange={e => { setSpecId(e.target.value); setSubjectId(""); setUnitId(""); }}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">اختر التخصص...</option>
                {specializations?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">المادة</label>
              <select
                value={subjectId}
                onChange={e => { setSubjectId(e.target.value); setUnitId(""); }}
                disabled={!specId}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                <option value="">اختر المادة...</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">الوحدة</label>
              <select
                value={unitId}
                onChange={e => setUnitId(e.target.value)}
                disabled={!subjectId}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                <option value="">اختر الوحدة...</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">اسم الامتحان</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: اختبار الفصل الأول"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                مدة الامتحان (بالدقائق)
              </label>
              <Input
                type="number"
                value={timeLimit}
                onChange={e => setTimeLimit(e.target.value)}
                placeholder="مثال: 60 دقيقة (اتركه فارغاً لامتحان بلا وقت محدد)"
                className="h-12 rounded-xl"
                min={1}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!title.trim() || !unitId || createMut.isPending || updateMut.isPending}
              className="w-full h-12 rounded-xl font-bold mt-2"
            >
              {createMut.isPending || updateMut.isPending ? "جاري الحفظ..." : "حفظ الامتحان"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <table className="w-full text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">الرقم</th>
              <th className="px-6 py-4 border-b">الامتحان</th>
              <th className="px-6 py-4 border-b">الوحدة</th>
              <th className="px-6 py-4 border-b text-center">الوقت</th>
              <th className="px-6 py-4 border-b text-center">الأسئلة</th>
              <th className="px-6 py-4 border-b w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : exams?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-bold">لا توجد امتحانات بعد</td></tr>
            ) : exams?.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-6 py-4 font-mono text-muted-foreground">{item.id}</td>
                <td className="px-6 py-4 font-bold">{item.title}</td>
                <td className="px-6 py-4 text-muted-foreground">{allUnits?.find(u => u.id === item.unitId)?.name ?? "—"}</td>
                <td className="px-6 py-4 text-center">
                  {item.timeLimit ? (
                    <span className="inline-flex items-center gap-1 text-secondary font-bold">
                      <Clock className="w-3 h-3" />{item.timeLimit} د
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">غير محدد</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <BookOpen className="w-3 h-3 text-primary" />{item.questionCount}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
