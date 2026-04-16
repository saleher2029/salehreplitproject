import { useState } from "react";
import { useGetAdminNotes } from "@/lib/db";
import { MessageSquare, Star, User, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const DIFFICULTY_MAP: Record<string, { label: string; emoji: string; cls: string }> = {
  easy:   { label: "سهل",   emoji: "😊", cls: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-400" },
  medium: { label: "متوسط", emoji: "😐", cls: "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-400" },
  hard:   { label: "صعب",   emoji: "😤", cls: "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-400" },
};

export default function AdminNotes() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useGetAdminNotes();

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const diffCount = { easy: 0, medium: 0, hard: 0 };
  data?.forEach((r: any) => { if (r.difficulty) diffCount[r.difficulty as keyof typeof diffCount]++; });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            ملاحظات الطلبة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            الملاحظات والتقييمات التي كتبها الطلبة بعد الامتحانات
          </p>
        </div>
        {data && (
          <div className="text-sm font-bold bg-primary/10 text-primary px-4 py-2 rounded-xl">
            {data.length} ملاحظة
          </div>
        )}
      </div>

      {data && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["easy", "medium", "hard"] as const).map(d => {
            const info = DIFFICULTY_MAP[d];
            return (
              <div key={d} className={`rounded-2xl border-2 p-4 text-center ${info.cls}`}>
                <div className="text-2xl mb-1">{info.emoji}</div>
                <p className="text-2xl font-black">{diffCount[d]}</p>
                <p className="text-xs font-bold mt-0.5">{info.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data?.length ? (
        <div className="text-center py-16 space-y-3">
          <MessageSquare className="w-14 h-14 text-muted-foreground/40 mx-auto" />
          <p className="text-lg font-bold text-muted-foreground">لا توجد ملاحظات بعد</p>
          <p className="text-sm text-muted-foreground/70">ستظهر ملاحظات الطلبة هنا بعد انتهائهم من الامتحانات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((row: any) => {
            const diff = row.difficulty ? DIFFICULTY_MAP[row.difficulty] : null;
            const isExpanded = expanded.has(row.id);
            return (
              <Card key={row.id} className="rounded-2xl border overflow-hidden">
                <button
                  onClick={() => toggleExpand(row.id)}
                  className="w-full p-5 flex items-center gap-4 text-right hover:bg-muted/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {row.studentName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{row.studentName}</span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {row.examTitle}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {row.notes?.substring(0, 80)}{(row.notes?.length ?? 0) > 80 ? "..." : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-primary">{row.percentage}%</span>
                    {diff && (
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${diff.cls}`}>
                        {diff.emoji} {diff.label}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(row.completedAt).toLocaleDateString("ar-EG")}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-border space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "الطالب", value: row.studentName, icon: <User className="w-3.5 h-3.5" /> },
                        { label: "الامتحان", value: row.examTitle, icon: <BookOpen className="w-3.5 h-3.5" /> },
                        { label: "الدرجة", value: `${row.score} / ${row.totalQuestions}`, icon: <Star className="w-3.5 h-3.5" /> },
                        { label: "التاريخ", value: new Date(row.completedAt).toLocaleString("ar-EG"), icon: null },
                      ].map(item => (
                        <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-1">
                            {item.icon}{item.label}
                          </p>
                          <p className="text-sm font-bold truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {row.notes && (
                      <div className="bg-muted/30 rounded-xl p-4 border border-border">
                        <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> نص الملاحظة
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{row.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
