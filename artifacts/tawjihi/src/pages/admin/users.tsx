import { useState } from "react";
import { useGetUsers, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldAlert, Users, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  supervisor: "مشرف",
  student: "طالب",
  guest: "ضيف",
};

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-destructive/10 text-destructive",
  supervisor: "bg-secondary/10 text-secondary",
  student:    "bg-primary/10 text-primary",
  guest:      "bg-muted text-muted-foreground",
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const options = useApiOpts();

  const { data: users, isLoading } = useGetUsers(options);
  const updateMut = useUpdateUser(options);
  const deleteMut = useDeleteUser(options);

  // ── حالة نافذة تأكيد الحذف ──────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setDeleteTarget(null);
        },
        onError: () => setDeleteTarget(null),
      },
    );
  };

  const handleRoleChange = (id: number, role: string) => {
    updateMut.mutate(
      { id, data: { role: role as any } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }) },
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-serif">إدارة المستخدمين</h1>
          {users && (
            <p className="text-sm text-muted-foreground mt-1">
              إجمالي: <span className="font-bold text-foreground">{users.length}</span> مستخدم
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {users?.filter(u => u.role === "student").length ?? 0} طالب مسجل
          </span>
        </div>
      </div>

      {/* ── جدول المستخدمين ───────────────────────────────────────────────── */}
      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <table className="w-full text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-bold">
            <tr>
              <th className="px-5 py-4 border-b">#</th>
              <th className="px-5 py-4 border-b">الاسم</th>
              <th className="px-5 py-4 border-b">البريد الإلكتروني</th>
              <th className="px-5 py-4 border-b">طريقة الدخول</th>
              <th className="px-5 py-4 border-b">تاريخ الانضمام</th>
              <th className="px-5 py-4 border-b">الصلاحية</th>
              <th className="px-5 py-4 border-b w-20 text-center">حذف</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    جاري التحميل...
                  </div>
                </td>
              </tr>
            ) : users?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                  لا يوجد مستخدمون بعد
                </td>
              </tr>
            ) : (
              users?.map(user => (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {user.id}
                  </td>
                  <td className="px-5 py-3.5 font-bold">{user.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {user.email ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-muted px-2 py-0.5 rounded-md text-xs font-medium">
                      {user.provider === "guest"
                        ? "ضيف"
                        : user.provider === "email"
                          ? "بريد"
                          : user.provider ?? "مباشر"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      disabled={updateMut.isPending}
                      className={`h-8 px-2 rounded-lg text-xs font-bold border-none outline-none cursor-pointer ${ROLE_COLORS[user.role] ?? ""}`}
                    >
                      <option value="admin">مدير (Admin)</option>
                      <option value="supervisor">مشرف (Supervisor)</option>
                      <option value="student">طالب (Student)</option>
                      <option value="guest">ضيف (Guest)</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                      className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive transition-colors"
                      title="حذف المستخدم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── نافذة تأكيد الحذف ─────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-serif">
              <ShieldAlert className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription className="text-right pt-1">
              هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <UserX className="w-10 h-10 text-destructive shrink-0" />
              <div>
                <p className="font-bold text-base">{deleteTarget?.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  سيتم حذف هذا المستخدم وجميع بياناته نهائياً
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMut.isPending}
                className="h-11 rounded-xl font-bold"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMut.isPending}
                className="h-11 rounded-xl font-bold"
              >
                {deleteMut.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    جاري الحذف...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    حذف نهائياً
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
