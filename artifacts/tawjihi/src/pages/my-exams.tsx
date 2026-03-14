import { useGetMyResults } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function MyExams() {
  const { token } = useAuth();
  const { data, isLoading } = useGetMyResults({
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold font-serif text-foreground flex items-center gap-3">
          <Trophy className="w-8 h-8 text-secondary" />
          امتحاناتي
        </h1>
        <p className="text-muted-foreground font-medium">سجل الامتحانات التي قمت بتقديمها ونتائجك فيها</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data?.map((result, i) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-0 overflow-hidden rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className={`h-2 w-full ${result.percentage >= 50 ? 'bg-primary' : 'bg-destructive'}`}></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold font-serif line-clamp-2 flex-1 ml-4">{result.examTitle}</h3>
                  <div className={`px-3 py-1 rounded-lg font-black text-lg ${result.percentage >= 50 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    {result.percentage}%
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground font-medium mb-6 gap-4">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    {result.score} من {result.totalQuestions}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(result.completedAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>

                <Link href={`/result/${result.id}`}>
                  <Button variant="outline" className="w-full rounded-xl font-bold hover:bg-muted">
                    عرض التصحيح
                    <ArrowLeft className="mr-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
        {data?.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted/30 rounded-3xl border border-dashed">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl font-bold text-muted-foreground">لم تقم بتقديم أي امتحانات بعد</p>
            <Link href="/">
              <Button className="mt-6 rounded-xl">تصفح الامتحانات المتاحة</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
