import { Card } from "@/components/ui/card";
import { Layers, Book, FileText, Users } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { title: "إجمالي التخصصات", value: "...", icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "إجمالي المواد", value: "...", icon: Book, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "إجمالي الامتحانات", value: "...", icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "المستخدمين النشطين", value: "...", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
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
              <p className="text-2xl font-black mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-muted/30 border border-dashed rounded-3xl p-12 text-center mt-8">
        <h3 className="text-xl font-bold text-muted-foreground">اختر قسماً من القائمة الجانبية لإدارته</h3>
      </div>
    </div>
  );
}
