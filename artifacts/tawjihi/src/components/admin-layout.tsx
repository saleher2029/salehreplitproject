import { Link, useLocation } from "wouter";
import { Layout } from "./layout";
import { Book, Layers, FileText, Users, Settings, Grid } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const links = [
    { href: "/admin", label: "الرئيسية", icon: Grid },
    { href: "/admin/specializations", label: "التخصصات", icon: Layers },
    { href: "/admin/subjects", label: "المواد", icon: Book },
    { href: "/admin/units", label: "الوحدات", icon: Book },
    { href: "/admin/exams", label: "الامتحانات والأسئلة", icon: FileText },
    { href: "/admin/users", label: "المستخدمين", icon: Users },
    { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden sticky top-24">
            <div className="p-5 bg-muted/30 border-b border-border">
              <h2 className="font-bold font-serif text-xl text-primary">إدارة النظام</h2>
            </div>
            <nav className="p-3 flex flex-col gap-1.5">
              {links.map(link => {
                const active = location === link.href;
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                      active 
                        ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20' 
                        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-primary-foreground' : ''}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="flex-1 min-w-0 bg-card rounded-2xl border border-border shadow-sm p-4 md:p-6">
          {children}
        </div>
      </div>
    </Layout>
  );
}
