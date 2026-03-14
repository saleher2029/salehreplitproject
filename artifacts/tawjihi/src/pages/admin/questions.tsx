import { useState } from "react";
import { useGetExams, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, getGetExamQueryOptions, getExam } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminQuestions() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const options = { request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} } };
  
  const { data: exams } = useGetExams({}, options);
  
  const [selectedExamId, setSelectedExamId] = useState("");
  
  // Fetch questions for selected exam
  const { data: examDetail, isLoading } = useQuery({
    queryKey: ['/api/exams', selectedExamId],
    queryFn: () => getExam(parseInt(selectedExamId), options.request),
    enabled: !!selectedExamId
  });

  const createMut = useCreateQuestion(options);
  const updateMut = useUpdateQuestion(options);
  const deleteMut = useDeleteQuestion(options);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [text, setText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState<any>("A");
  const [orderIndex, setOrderIndex] = useState(0);

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setText(item.text);
      setOptionA(item.optionA);
      setOptionB(item.optionB);
      setOptionC(item.optionC);
      setOptionD(item.optionD);
      setCorrectOption(item.correctOption);
      setOrderIndex(item.orderIndex);
    } else {
      setEditingId(null);
      setText("");
      setOptionA(""); setOptionB(""); setOptionC(""); setOptionD("");
      setCorrectOption("A");
      setOrderIndex(examDetail?.questions?.length || 0);
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!selectedExamId || !text || !optionA || !optionB || !optionC || !optionD) return;
    
    const data = {
      examId: parseInt(selectedExamId),
      text, optionA, optionB, optionC, optionD, correctOption, orderIndex
    };
    
    if (editingId) {
      updateMut.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
          setIsOpen(false);
        }
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/exams'] })
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold font-serif">إدارة الأسئلة</h1>
        
        <div className="flex items-center gap-4">
          <select 
            value={selectedExamId} 
            onChange={e => setSelectedExamId(e.target.value)}
            className="flex h-10 min-w-[200px] rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">اختر امتحاناً لعرض الأسئلة...</option>
            {exams?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          
          <Button onClick={() => handleOpen()} disabled={!selectedExamId} className="rounded-xl font-bold shrink-0">
            <Plus className="w-4 h-4 ml-2" /> إضافة سؤال
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "تعديل سؤال" : "إضافة سؤال جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">نص السؤال</label>
              <Textarea value={text} onChange={e => setText(e.target.value)} className="rounded-xl resize-none" rows={3} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">الخيار A</label>
                <Input value={optionA} onChange={e => setOptionA(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">الخيار B</label>
                <Input value={optionB} onChange={e => setOptionB(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">الخيار C</label>
                <Input value={optionC} onChange={e => setOptionC(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">الخيار D</label>
                <Input value={optionD} onChange={e => setOptionD(e.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-primary">الإجابة الصحيحة</label>
                <select 
                  value={correctOption} 
                  onChange={e => setCorrectOption(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="A">الخيار A</option>
                  <option value="B">الخيار B</option>
                  <option value="C">الخيار C</option>
                  <option value="D">الخيار D</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الترتيب</label>
                <Input type="number" value={orderIndex} onChange={e => setOrderIndex(parseInt(e.target.value))} className="h-10 rounded-xl" />
              </div>
            </div>

            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="w-full h-12 rounded-xl font-bold mt-4">
              حفظ السؤال
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!selectedExamId ? (
        <div className="bg-muted/30 border border-dashed rounded-3xl p-12 text-center">
          <p className="text-muted-foreground font-bold">الرجاء اختيار امتحان لعرض أسئلته</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-background">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground font-bold">
              <tr>
                <th className="px-6 py-4 border-b w-16">الترتيب</th>
                <th className="px-6 py-4 border-b">نص السؤال</th>
                <th className="px-6 py-4 border-b text-center">الخيار الصحيح</th>
                <th className="px-6 py-4 border-b w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center">جاري التحميل...</td></tr>
              ) : examDetail?.questions?.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-mono text-center">{item.orderIndex}</td>
                  <td className="px-6 py-4 font-bold">{item.text}</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">{item.correctOption}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(item)} className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {examDetail?.questions?.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center font-bold text-muted-foreground">لا توجد أسئلة في هذا الامتحان</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
