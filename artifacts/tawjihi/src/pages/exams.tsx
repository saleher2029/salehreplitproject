import { useGetExams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Play, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function Exams({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const unitId = parseInt(params.id);
  const { data, isLoading } = useGetExams({ unitId }, {
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
          <h1 className="text-3xl font-bold font-serif text-foreground">الامتحانات المتاحة</h1>
          <p className="text-muted-foreground font-medium">اختر امتحاناً للبدء</p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold" onClick={() => window.history.back()}>
          <ArrowRight className="ml-2 w-4 h-4" />
          العودة للوحدات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.map((exam, i) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-6 border-2 border-border hover:border-primary shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-card">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold font-serif mb-2">{exam.title}</h3>
                  <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-6">
                    <span className="bg-muted px-2.5 py-1 rounded-md">
                      {exam.questionCount} أسئلة
                    </span>
                    <span>
                      {new Date(exam.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <Link href={`/exam/${exam.id}`}>
                    <Button className="w-full sm:w-auto rounded-xl font-bold group">
                      <Play className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" />
                      بدء الامتحان
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
        {data?.length === 0 && (
          <div className="col-span-full text-center py-16 bg-muted/30 rounded-3xl border border-dashed">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-muted-foreground">لم يتم إضافة امتحانات لهذه الوحدة بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}
