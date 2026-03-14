import { useGetSpecializations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Layers, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Specializations() {
  const { token } = useAuth();
  const { data, isLoading } = useGetSpecializations({
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-10 py-8">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-primary">ما هو تخصصك؟</h1>
        <p className="text-muted-foreground text-lg md:text-xl font-medium">اختر تخصصك لعرض المواد والامتحانات الخاصة بك</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {data?.map((spec, i) => (
          <Link key={spec.id} href={`/specialization/${spec.id}`} className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="relative overflow-hidden p-8 text-center border-2 border-transparent hover:border-primary/50 shadow-md hover:shadow-2xl transition-all duration-300 rounded-3xl bg-card hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 text-primary rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner">
                  <Layers className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold font-serif text-foreground group-hover:text-primary transition-colors">{spec.name}</h3>
                
                <div className="mt-6 flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                  عرض المواد
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </div>
              </Card>
            </motion.div>
          </Link>
        ))}
        {data?.length === 0 && (
          <div className="col-span-full text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
            <p className="text-xl font-bold text-muted-foreground">لا توجد تخصصات متاحة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
}
