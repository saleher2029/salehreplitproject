import { useGetUsers, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const options = useApiOpts();
  
  const { data: users, isLoading } = useGetUsers(options);
  const updateMut = useUpdateUser(options);
  const deleteMut = useDeleteUser(options);

  const handleRoleChange = (id: number, role: any) => {
    updateMut.mutate({ id, data: { role } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/users'] })
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      });
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive",
    supervisor: "bg-secondary/10 text-secondary",
    student: "bg-primary/10 text-primary",
    guest: "bg-muted text-muted-foreground"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">إدارة المستخدمين</h1>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <table className="w-full text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-6 py-4 border-b">الرقم</th>
              <th className="px-6 py-4 border-b">الاسم</th>
              <th className="px-6 py-4 border-b">طريقة الدخول</th>
              <th className="px-6 py-4 border-b">تاريخ الانضمام</th>
              <th className="px-6 py-4 border-b">الصلاحية</th>
              <th className="px-6 py-4 border-b w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">جاري التحميل...</td></tr>
            ) : users?.map(user => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-6 py-4 font-mono">{user.id}</td>
                <td className="px-6 py-4 font-bold">{user.name}</td>
                <td className="px-6 py-4 capitalize">{user.provider || "مباشر"}</td>
                <td className="px-6 py-4">{new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
                <td className="px-6 py-4">
                  <select 
                    value={user.role} 
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    disabled={updateMut.isPending}
                    className={`h-8 px-2 rounded-lg text-xs font-bold border-none outline-none cursor-pointer ${roleColors[user.role]}`}
                  >
                    <option value="admin">مدير (Admin)</option>
                    <option value="supervisor">مشرف (Supervisor)</option>
                    <option value="student">طالب (Student)</option>
                    <option value="guest">ضيف (Guest)</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
