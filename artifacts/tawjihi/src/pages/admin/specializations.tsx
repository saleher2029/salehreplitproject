import { useState } from "react";
import { useGetSpecializations, useCreateSpecialization, useUpdateSpecialization, useDeleteSpecialization } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminSpecializations() {
  const queryClient = useQueryClient();
  const options = useApiOpts();
  
  const { data, isLoading } = useGetSpecializations(options);
  const createMut = useCreateSpecialization(options);
  const updateMut = useUpdateSpecialization(options);
  const deleteMut = useDeleteSpecialization(options);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");

  const handleOpen = (spec?: {id: number, name: string}) => {
    if (spec) {
      setEditingId(spec.id);
      setName(spec.name);
    } else {
      setEditingId(null);
      setName("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateMut.mutate({ id: editingId, data: { name } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/specializations'] });
          setIsOpen(false);
        }
      });
    } else {
      createMut.mutate({ data: { name } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/specializations'] });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/specializations'] })
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة التخصصات</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()} className="rounded-xl font-bold">
              <Plus className="w-4 h-4 ml-2" />
              إضافة تخصص
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-serif">{editingId ? "تعديل تخصص" : "إضافة تخصص جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">اسم التخصص</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" placeholder="مثال: علمي" />
              </div>
              <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="w-full h-12 rounded-xl font-bold">
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">الرقم</th>
              <th className="px-6 py-4 border-b">اسم التخصص</th>
              <th className="px-6 py-4 border-b w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center">جاري التحميل...</td></tr>
            ) : data?.map(spec => (
              <tr key={spec.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-6 py-4 font-mono">{spec.id}</td>
                <td className="px-6 py-4 font-bold">{spec.name}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(spec)} className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/10">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(spec.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
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
