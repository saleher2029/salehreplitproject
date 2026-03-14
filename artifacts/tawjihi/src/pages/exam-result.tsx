import { useGetResult } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function ExamResult({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const resultId = parseInt(params.id);
  const { data: result, isLoading } = useGetResult(resultId, {
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  if (!result) return <div className="text-center p-8 text-destructive">النتيجة غير موجودة</div>;

  const isPass = result.percentage >= 50;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-serif">النتيجة والتصحيح</h1>
        <Link href="/my-exams">
          <Button variant="outline" className="rounded-xl font-bold">
            <ArrowRight className="ml-2 w-4 h-4" />
            امتحاناتي
          </Button>
        </Link>
      </div>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className={`p-8 rounded-3xl border-2 text-center relative overflow-hidden ${isPass ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-bl-full -z-10"></div>
          
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isPass ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
            <Trophy className="w-10 h-10" />
          </div>
          
          <h2 className="text-3xl font-bold font-serif mb-2">{result.examTitle}</h2>
          <p className="text-muted-foreground font-medium mb-6">{new Date(result.completedAt).toLocaleString('ar-EG')}</p>
          
          <div className="flex flex-wrap justify-center gap-8 items-center">
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground mb-1">الدرجة</p>
              <p className={`text-4xl font-black ${isPass ? 'text-primary' : 'text-destructive'}`}>
                {result.score} <span className="text-2xl text-muted-foreground">/ {result.totalQuestions}</span>
              </p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block"></div>
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground mb-1">النسبة</p>
              <p className={`text-4xl font-black ${isPass ? 'text-primary' : 'text-destructive'}`}>
                {result.percentage}%
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="space-y-6 mt-12">
        <h3 className="text-2xl font-bold font-serif border-b border-border pb-4">مراجعة الإجابات</h3>
        
        {result.answers.map((ans, idx) => (
          <Card key={ans.questionId} className={`p-6 rounded-2xl border-l-8 ${ans.isCorrect ? 'border-l-primary' : 'border-l-destructive'}`}>
            <div className="flex gap-4">
              <div className="mt-1">
                {ans.isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-4">{idx + 1}. {ans.questionText}</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const text = ans[`option${opt}` as keyof typeof ans];
                    const isSelected = ans.selectedOption === opt;
                    const isCorrectOption = ans.correctOption === opt;
                    
                    let bgClass = "bg-background border-border";
                    if (isCorrectOption) bgClass = "bg-primary/10 border-primary text-primary font-bold";
                    else if (isSelected && !isCorrectOption) bgClass = "bg-destructive/10 border-destructive text-destructive font-bold";

                    return (
                      <div key={opt} className={`p-3 rounded-xl border-2 flex items-center justify-between ${bgClass}`}>
                        <span>{text as string}</span>
                        {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        {isSelected && !isCorrectOption && <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
