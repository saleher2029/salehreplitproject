import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiOpts } from "@/hooks/use-api-opts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, Save } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const options = useApiOpts();

  const { data: settings, isLoading } = useGetSettings(options);
  const updateMut = useUpdateSettings(options);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [subscriptionInfo, setSubscriptionInfo] = useState("");

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsappNumber);
      setTelegramUsername(settings.telegramUsername ?? "");
      setSubscriptionInfo(settings.subscriptionInfo);
    }
  }, [settings]);

  const handleSave = () => {
    updateMut.mutate({ data: { whatsappNumber, telegramUsername, subscriptionInfo } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/settings'] })
    });
  };

  if (isLoading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-serif">إعدادات الموقع</h1>
        <p className="text-muted-foreground mt-1">تحكم في نصوص الموقع وقنوات التواصل</p>
      </div>

      <Card className="p-6 md:p-8 rounded-3xl border-border shadow-sm">
        <div className="space-y-6">

          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-500" />
              رقم الواتساب
            </label>
            <Input
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              className="h-12 rounded-xl text-left"
              dir="ltr"
              placeholder="مثال: +970591234567"
            />
            <p className="text-xs text-muted-foreground">اكتب الرقم مع رمز الدولة وبدون مسافات.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" />
              معرّف تيلجرام
            </label>
            <Input
              value={telegramUsername}
              onChange={e => setTelegramUsername(e.target.value)}
              className="h-12 rounded-xl text-left"
              dir="ltr"
              placeholder="مثال: tawjihi_support"
            />
            <p className="text-xs text-muted-foreground">اكتب المعرّف بدون علامة @ ، سيظهر زر التيلجرام في شريط التواصل.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold">رسالة شريط الاشتراك</label>
            <Input
              value={subscriptionInfo}
              onChange={e => setSubscriptionInfo(e.target.value)}
              className="h-12 rounded-xl"
              placeholder="مثال: اشترك الآن للوصول إلى كافة الامتحانات!"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={updateMut.isPending}
              className="w-full sm:w-auto h-12 rounded-xl font-bold px-8"
            >
              <Save className="w-4 h-4 ml-2" />
              {updateMut.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            {updateMut.isSuccess && <span className="text-primary text-sm font-bold mr-4">تم الحفظ بنجاح ✓</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
