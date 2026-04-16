import { useGetSubjects } from "@/lib/db";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Book, ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Subjects({ params }: { params: { id: string } }) {
  const specializationId = parseInt(params.id);
  const { data, isLoading } = useGetSubjects({ specializationId });

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-serif text-foreground">اختر المادة</h1>
          <p className="text-muted-foreground font-medium">المواد الدراسية المقررة لهذا التخصص</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="rounded-xl font-bold">
            <ArrowRight className="ml-2 w-4 h-4" />
            تغيير التخصص
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {data?.map((subject, i) => (
          <Link key={subject.id} href={`/subject/${subject.id}?specializationId=${specializationId}`} className="block group">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-6 border border-border/60 hover:border-secondary shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-card hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                    <Book className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold font-serif leading-tight mb-2 group-hover:text-secondary transition-colors">{subject.name}</h3>
                    <div className="flex items-center text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                      دخول للوحدات
                      <ChevronLeft className="w-3 h-3 mr-1" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </Link>
        ))}
        {data?.length === 0 && (
          <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
            <p className="text-lg font-bold text-muted-foreground">لم يتم إضافة مواد لهذا التخصص بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}
