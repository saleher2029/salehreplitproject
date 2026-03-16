import { useState } from "react";
import { useGetSubjects, useGetSpecializations, useCreateSubject, useUpdateSubject, useDeleteSubject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminSubjects() {
  const queryClient = useQueryClient();
  const options = useApiOpts();
  
  const { data: subjects, isLoading } = useGetSubjects({}, options);
  const { data: specializations } = useGetSpecializations(options);
  
  const createMut = useCreateSubject(options);
  const updateMut = useUpdateSubject(options);
  const deleteMut = useDeleteSubject(options);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [specializationId, setSpecializationId] = useState("");

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setName(item.name);
      setSpecializationId(item.specializationId.toString());
    } else {
      setEditingId(null);
      setName("");
      setSpecializationId("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !specializationId) return;
    const data = { name, specializationId: parseInt(specializationId) };
    
    if (editingId) {
      updateMut.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
          setIsOpen(false);
        }
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/subjects'] })
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة المواد</h1>
        <Button onClick={() => handleOpen()} className="rounded-xl font-bold">
          <Plus className="w-4 h-4 ml-2" /> إضافة مادة
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "تعديل مادة" : "إضافة مادة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">اسم المادة</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">التخصص</label>
              <select 
                value={specializationId} 
                onChange={e => setSpecializationId(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">اختر التخصص...</option>
                {specializations?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="w-full h-12 rounded-xl font-bold mt-2">
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">الرقم</th>
              <th className="px-6 py-4 border-b">اسم المادة</th>
              <th className="px-6 py-4 border-b">التخصص</th>
              <th className="px-6 py-4 border-b w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center">جاري التحميل...</td></tr>
            ) : subjects?.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-6 py-4 font-mono">{item.id}</td>
                <td className="px-6 py-4 font-bold">{item.name}</td>
                <td className="px-6 py-4">{specializations?.find(s => s.id === item.specializationId)?.name || item.specializationId}</td>
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
    </div>
  );
}
