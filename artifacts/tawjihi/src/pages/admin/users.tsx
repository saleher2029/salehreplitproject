import { useState } from "react";
import {
  useGetUsers,
  useUpdateUser,
  useDeleteUser,
  useGetExams,
  useGetUserExamAccess,
  useUpdateUserSubscription,
  useSetUserExamAccess,
  useUnlockAllExamsForUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldAlert, Users, UserX, Lock, Unlock, Crown, KeyRound, ChevronDown } from "lucide-react";
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

function AccessModal({
  user,
  onClose,
  options,
}: {
  user: { id: number; name: string; subscriptionStatus?: boolean };
  onClose: () => void;
  options: ReturnType<typeof useApiOpts>;
}) {
  const queryClient = useQueryClient();
  const { data: allExams, isLoading: examsLoading } = useGetExams({}, options);
  const { data: accessList, isLoading: accessLoading } = useGetUserExamAccess(user.id, options);
  const subscriptionMut = useUpdateUserSubscription(options);
  const examAccessMut = useSetUserExamAccess(options);
  const unlockAllMut = useUnlockAllExamsForUser(options);

  const isSubscribed = user.subscriptionStatus ?? false;

  const accessMap = new Map<number, boolean>(
    (accessList ?? []).map((a: { examId: number; isUnlocked: boolean }) => [a.examId, a.isUnlocked])
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/exam-access`] });
  };

  const toggleSubscription = () => {
    subscriptionMut.mutate(
      { id: user.id, data: { subscriptionStatus: !isSubscribed } },
      { onSuccess: invalidate }
    );
  };

  const handleUnlockAll = () => {
    unlockAllMut.mutate(
      { id: user.id },
      { onSuccess: invalidate }
    );
  };

  const toggleExamAccess = (examId: number, current: boolean) => {
    examAccessMut.mutate(
      { id: user.id, examId, data: { isUnlocked: !current } },
      { onSuccess: invalidate }
    );
  };

  const isLoading = examsLoading || accessLoading;

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 font-serif">
            <KeyRound className="w-5 h-5 text-primary" />
            إدارة وصول: {user.name}
          </DialogTitle>
          <DialogDescription className="text-right">
            تحكم في الاشتراك والوصول لكل امتحان على حدة
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pb-2">
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-bold text-sm">الاشتراك الكامل</p>
                  <p className="text-xs text-muted-foreground">يفتح جميع الامتحانات تلقائياً</p>
                </div>
              </div>
              <button
                onClick={toggleSubscription}
                disabled={subscriptionMut.isPending}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                  isSubscribed ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                    isSubscribed ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl font-bold text-sm h-9 border-primary/30 text-primary hover:bg-primary hover:text-white"
              onClick={handleUnlockAll}
              disabled={unlockAllMut.isPending}
            >
              {unlockAllMut.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                  جاري الفتح...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Unlock className="w-4 h-4" />
                  فتح الكل (تفعيل الاشتراك)
                </span>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-bold text-foreground">التحكم في امتحانات فردية</p>
              <span className="text-xs text-muted-foreground">
                {isSubscribed ? "مفعّل بالاشتراك" : `${Array.from(accessMap.values()).filter(Boolean).length} مفتوح`}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : allExams?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">لا توجد امتحانات</p>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {allExams?.map(exam => {
                  const isUnlocked = isSubscribed || (accessMap.get(exam.id) ?? false);
                  return (
                    <div key={exam.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-sm font-medium truncate">{exam.title}</span>
                      </div>
                      {isSubscribed ? (
                        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          مشترك
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleExamAccess(exam.id, accessMap.get(exam.id) ?? false)}
                          disabled={examAccessMut.isPending}
                          className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 focus:outline-none ${
                            (accessMap.get(exam.id) ?? false) ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                              (accessMap.get(exam.id) ?? false) ? "right-0.5" : "left-0.5"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-2 border-t border-border">
          <Button variant="outline" className="w-full rounded-xl font-bold" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const options = useApiOpts();

  const { data: users, isLoading } = useGetUsers(options);
  const updateMut = useUpdateUser(options);
  const deleteMut = useDeleteUser(options);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [accessTarget, setAccessTarget] = useState<{ id: number; name: string; subscriptionStatus?: boolean } | null>(null);

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

      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground font-bold">
              <tr>
                <th className="px-5 py-4 border-b">#</th>
                <th className="px-5 py-4 border-b">الاسم</th>
                <th className="px-5 py-4 border-b">البريد الإلكتروني</th>
                <th className="px-5 py-4 border-b">طريقة الدخول</th>
                <th className="px-5 py-4 border-b">تاريخ الانضمام</th>
                <th className="px-5 py-4 border-b">الاشتراك</th>
                <th className="px-5 py-4 border-b">الصلاحية</th>
                <th className="px-5 py-4 border-b w-28 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
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
                      {(user as any).subscriptionStatus ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                          <Crown className="w-3 h-3" />
                          مشترك
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          غير مشترك
                        </span>
                      )}
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
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAccessTarget({ id: user.id, name: user.name, subscriptionStatus: (user as any).subscriptionStatus })}
                          className="h-8 w-8 text-primary hover:text-white hover:bg-primary transition-colors"
                          title="إدارة الوصول"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                          className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive transition-colors"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {accessTarget && (
        <AccessModal
          user={accessTarget}
          onClose={() => setAccessTarget(null)}
          options={options}
        />
      )}

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
