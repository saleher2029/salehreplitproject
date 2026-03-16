import { useState } from "react";
import { useGetUnits, useGetSubjects, useGetSpecializations, useCreateUnit, useUpdateUnit, useDeleteUnit } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminUnits() {
  const queryClient = useQueryClient();
  const options = useApiOpts();

  const { data: units, isLoading } = useGetUnits({}, options);
  const { data: subjects } = useGetSubjects({}, options);
  const { data: specializations } = useGetSpecializations(options);

  const createMut = useCreateUnit(options);
  const updateMut = useUpdateUnit(options);
  const deleteMut = useDeleteUnit(options);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const getSpecName = (subjectId: number) => {
    const subject = subjects?.find(s => s.id === subjectId);
    if (!subject) return null;
    return specializations?.find(sp => sp.id === subject.specializationId)?.name ?? null;
  };

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setName(item.name);
      setSubjectId(item.subjectId.toString());
    } else {
      setEditingId(null);
      setName("");
      setSubjectId("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !subjectId) return;
    const data = { name, subjectId: parseInt(subjectId) };

    if (editingId) {
      updateMut.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/units"] });
          setIsOpen(false);
        }
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/units"] });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/units"] })
      });
    }
  };

  // Group subjects by specialization for the dropdown
  const subjectsBySpec = specializations?.map(spec => ({
    spec,
    subjects: subjects?.filter(s => s.specializationId === spec.id) ?? [],
  })).filter(g => g.subjects.length > 0) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة الوحدات</h1>
        <Button onClick={() => handleOpen()} className="rounded-xl font-bold">
          <Plus className="w-4 h-4 ml-2" /> إضافة وحدة
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "تعديل وحدة" : "إضافة وحدة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">اسم الوحدة</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: المعادلات التربيعية"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">المادة</label>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">اختر المادة...</option>
                {subjectsBySpec.map(({ spec, subjects: subs }) => (
                  <optgroup key={spec.id} label={`— ${spec.name} —`}>
                    {subs.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Preview of selected subject's specialization */}
              {subjectId && (() => {
                const selSubject = subjects?.find(s => s.id === parseInt(subjectId));
                const selSpec = selSubject
                  ? specializations?.find(sp => sp.id === selSubject.specializationId)
                  : null;
                return selSpec ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{selSpec.name}</span>
                    <span>← فرع المادة المختارة</span>
                  </p>
                ) : null;
              })()}
            </div>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending || !name.trim() || !subjectId}
              className="w-full h-12 rounded-xl font-bold mt-2"
            >
              {createMut.isPending || updateMut.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">#</th>
              <th className="px-6 py-4 border-b">اسم الوحدة</th>
              <th className="px-6 py-4 border-b">المادة</th>
              <th className="px-6 py-4 border-b">الفرع</th>
              <th className="px-6 py-4 border-b w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : units?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">لا توجد وحدات بعد</td></tr>
            ) : units?.map(item => {
              const subject = subjects?.find(s => s.id === item.subjectId);
              const specName = getSpecName(item.subjectId);
              return (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-muted-foreground">{item.id}</td>
                  <td className="px-6 py-4 font-bold">{item.name}</td>
                  <td className="px-6 py-4">{subject?.name ?? item.subjectId}</td>
                  <td className="px-6 py-4">
                    {specName ? (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                        {specName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
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
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
