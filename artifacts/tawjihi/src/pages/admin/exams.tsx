import { useState } from "react";
import { useGetExams, useGetUnits, useCreateExam, useUpdateExam, useDeleteExam } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminExams() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const options = { request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} } };
  
  const { data: exams, isLoading } = useGetExams({}, options);
  const { data: units } = useGetUnits({}, options);
  
  const createMut = useCreateExam(options);
  const updateMut = useUpdateExam(options);
  const deleteMut = useDeleteExam(options);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [unitId, setUnitId] = useState("");

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setTitle(item.title);
      setUnitId(item.unitId.toString());
    } else {
      setEditingId(null);
      setTitle("");
      setUnitId("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !unitId) return;
    const data = { title, unitId: parseInt(unitId) };
    
    if (editingId) {
      updateMut.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
          setIsOpen(false);
        }
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/exams'] })
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
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "تعديل امتحان" : "إنشاء امتحان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">عنوان الامتحان</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">الوحدة</label>
              <select 
                value={unitId} 
                onChange={e => setUnitId(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">اختر الوحدة...</option>
                {units?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="w-full h-12 rounded-xl font-bold mt-2">
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <table className="w-full text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">الرقم</th>
              <th className="px-6 py-4 border-b">العنوان</th>
              <th className="px-6 py-4 border-b">الوحدة</th>
              <th className="px-6 py-4 border-b text-center">الأسئلة</th>
              <th className="px-6 py-4 border-b w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center">جاري التحميل...</td></tr>
            ) : exams?.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-6 py-4 font-mono">{item.id}</td>
                <td className="px-6 py-4 font-bold">{item.title}</td>
                <td className="px-6 py-4">{units?.find(u => u.id === item.unitId)?.name || item.unitId}</td>
                <td className="px-6 py-4 text-center font-bold">{item.questionCount}</td>
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
