import { useGetUnits } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Bookmark, ChevronLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function Units({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const subjectId = parseInt(params.id);
  const { data, isLoading } = useGetUnits({ subjectId }, {
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-serif text-foreground">اختر الوحدة</h1>
          <p className="text-muted-foreground font-medium">الوحدات الدراسية ضمن هذه المادة</p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold" onClick={() => window.history.back()}>
          <ArrowRight className="ml-2 w-4 h-4" />
          العودة للمواد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data?.map((unit, i) => (
          <Link key={unit.id} href={`/unit/${unit.id}?subjectId=${subjectId}`} className="block group">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5 border border-border/60 hover:border-primary shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl bg-card flex items-center justify-between group-hover:bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-background border border-border rounded-xl flex items-center justify-center shrink-0 group-hover:border-primary group-hover:text-primary transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold font-serif">{unit.name}</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </Card>
            </motion.div>
          </Link>
        ))}
        {data?.length === 0 && (
          <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
            <p className="text-lg font-bold text-muted-foreground">لم يتم إضافة وحدات لهذه المادة بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}
