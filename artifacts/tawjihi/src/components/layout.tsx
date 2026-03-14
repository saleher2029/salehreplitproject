import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetSettings } from "@workspace/api-client-react";
import { LogOut, User as UserIcon, Settings, MessageCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth, token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: settings } = useGetSettings({
    request: { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
  });

  const handleLogout = () => {
    clearAuth();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col" dir="rtl">
      {settings?.whatsappNumber && (
        <div className="bg-primary text-primary-foreground py-2 px-4 flex justify-center sm:justify-between items-center text-sm shadow-md z-10 relative flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-center">{settings.subscriptionInfo || "اشترك الآن للوصول إلى كافة الامتحانات!"}</span>
          </div>
          <a 
            href={`https://wa.me/${settings.whatsappNumber}`} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors font-bold"
          >
            <MessageCircle className="w-4 h-4" />
            تواصل عبر واتساب
          </a>
        </div>
      )}
      
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-1.5 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif">امتحانات توجيهي</h1>
          </Link>
          
          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/my-exams" className="text-sm font-semibold hover:text-primary transition-colors hidden sm:block">
                امتحاناتي
              </Link>
              {(user.role === 'admin' || user.role === 'supervisor') && (
                <Link href="/admin" className="text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors flex items-center gap-1 bg-secondary/10 px-3 py-1.5 rounded-lg hidden sm:flex">
                  <Settings className="w-4 h-4" />
                  لوحة التحكم
                </Link>
              )}
              <div className="h-6 w-px bg-border mx-1 sm:mx-2 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium hidden md:block">{user.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
