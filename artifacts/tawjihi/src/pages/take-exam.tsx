import { useState } from "react";
import { useGetExam, useSubmitExam } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TakeExam({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const examId = parseInt(params.id);
  const { data: exam, isLoading } = useGetExam(examId, {
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });
  const submitMutation = useSubmitExam({
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });
  const [, setLocation] = useLocation();

  const [answers, setAnswers] = useState<Record<number, string>>({});

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground font-medium">جاري تجهيز الامتحان...</p>
    </div>
  );
  if (!exam) return <div className="text-center p-8 text-destructive font-bold text-xl">الامتحان غير موجود</div>;

  const handleSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: parseInt(qId),
      selectedOption: val as any
    }));

    submitMutation.mutate({
      data: { examId, answers: formattedAnswers }
    }, {
      onSuccess: (res) => {
        setLocation(`/result/${res.id}`);
      }
    });
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === exam.questionCount;
  const progress = (answeredCount / exam.questionCount) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header Sticky Progress */}
      <div className="bg-card p-6 rounded-3xl shadow-sm border border-border sticky top-20 z-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-primary">{exam.title}</h1>
            <p className="text-muted-foreground text-sm font-medium mt-1">تأكد من الإجابة على جميع الأسئلة قبل التسليم</p>
          </div>
          <div className="bg-muted px-4 py-2 rounded-xl text-center">
            <span className="text-2xl font-black">{answeredCount}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-lg font-bold">{exam.questionCount}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-6">
        {exam.questions.map((q, index) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`p-6 md:p-8 rounded-3xl border-2 transition-colors ${answers[q.id] ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${answers[q.id] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {index + 1}
                </div>
                <h3 className="text-xl font-bold leading-relaxed pt-1">{q.text}</h3>
              </div>
              
              <RadioGroup 
                value={answers[q.id]} 
                onValueChange={(val) => setAnswers(prev => ({...prev, [q.id]: val}))}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const text = q[`option${opt}` as keyof typeof q];
                  const isSelected = answers[q.id] === opt;
                  return (
                    <Label 
                      key={opt}
                      htmlFor={`q${q.id}-${opt}`} 
                      className={`relative flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-primary bg-background shadow-md' 
                          : 'border-border bg-background hover:bg-muted hover:border-border/80'
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} className="sr-only" />
                      <div className={`w-6 h-6 rounded-full border-2 ml-3 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                      </div>
                      <span className="text-base font-semibold">{text as string}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <span className="text-primary font-bold flex items-center gap-1"><CheckCircle2 className="w-5 h-5"/> مكتمل</span>
            ) : (
              <span className="text-secondary font-bold flex items-center gap-1"><AlertCircle className="w-5 h-5"/> غير مكتمل</span>
            )}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!isComplete || submitMutation.isPending}
            size="lg"
            className="rounded-xl px-8 h-12 text-lg font-bold shadow-lg"
          >
            {submitMutation.isPending ? "جاري التسليم..." : "تسليم الامتحان"}
          </Button>
        </div>
      </div>
    </div>
  );
}
