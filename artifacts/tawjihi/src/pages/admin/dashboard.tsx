import { Card } from "@/components/ui/card";
import { Layers, Book, FileText, Users } from "lucide-react";
import { useGetSpecializations, useGetSubjects, useGetExams, getUsers } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const { token } = useAuth();
  const opts = { request: { headers: token ? { Authorization: `Bearer ${token}` } : {} } };

  const { data: specs } = useGetSpecializations({}, opts);
  const { data: subjects } = useGetSubjects({}, opts);
  const { data: exams } = useGetExams({}, opts);
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => getUsers(opts.request),
    enabled: !!token,
  });

  const stats = [
    {
      title: "إجمالي التخصصات",
      value: specs?.length ?? "—",
      icon: Layers,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "إجمالي المواد",
      value: subjects?.length ?? "—",
      icon: Book,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "إجمالي الامتحانات",
      value: exams?.length ?? "—",
      icon: FileText,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "المستخدمين النشطين",
      value: users?.length ?? "—",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">لوحة التحكم</h1>
        <p className="text-muted-foreground">مرحباً بك في لوحة تحكم الإدارة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6 rounded-2xl border-border/50 shadow-sm flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">{stat.title}</p>
              <p className="text-3xl font-black mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick summary */}
      {exams && exams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 rounded-2xl border-border/50">
            <h3 className="font-bold font-serif mb-4 text-lg">آخر الامتحانات المضافة</h3>
            <div className="space-y-3">
              {exams.slice(-5).reverse().map(exam => (
                <div key={exam.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="font-medium text-sm">{exam.title}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg font-bold">
                    {exam.questionCount} سؤال
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-border/50">
            <h3 className="font-bold font-serif mb-4 text-lg">إحصائيات سريعة</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">مجموع الأسئلة في الامتحانات</span>
                <span className="font-black text-primary">
                  {exams.reduce((acc, e) => acc + e.questionCount, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">متوسط الأسئلة لكل امتحان</span>
                <span className="font-black text-secondary">
                  {exams.length > 0 ? Math.round(exams.reduce((a, e) => a + e.questionCount, 0) / exams.length) : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">امتحانات محددة الوقت</span>
                <span className="font-black text-amber-500">
                  {exams.filter(e => e.timeLimit).length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {(!exams || exams.length === 0) && (
        <div className="bg-muted/30 border border-dashed rounded-3xl p-12 text-center mt-4">
          <h3 className="text-xl font-bold text-muted-foreground">اختر قسماً من القائمة الجانبية لإدارته</h3>
        </div>
      )}
    </div>
  );
}
