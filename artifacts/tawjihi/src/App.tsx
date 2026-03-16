import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

// Layouts
import { Layout } from "@/components/layout";
import { AdminLayout } from "@/components/admin-layout";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Specializations from "@/pages/specializations";
import Subjects from "@/pages/subjects";
import Units from "@/pages/units";
import Exams from "@/pages/exams";
import TakeExam from "@/pages/take-exam";
import ExamResult from "@/pages/exam-result";
import MyExams from "@/pages/my-exams";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminSpecializations from "@/pages/admin/specializations";
import AdminSubjects from "@/pages/admin/subjects";
import AdminUnits from "@/pages/admin/units";
import AdminExams from "@/pages/admin/exams";
import AdminQuestions from "@/pages/admin/questions";
import AdminUsers from "@/pages/admin/users";
import AdminNotes from "@/pages/admin/notes";
import AdminSettings from "@/pages/admin/settings";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false, layout: Wrapper = Layout, ...rest }: any) {
  return (
    <Route {...rest}>
      {params => {
        const { user, isLoading } = useAuth();
        if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" /></div>;
        if (!user) return <Redirect to="/login" />;
        if (adminOnly && user.role !== "admin" && user.role !== "supervisor") return <Redirect to="/" />;
        return <Wrapper><Component params={params} /></Wrapper>;
      }}
    </Route>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {isLoading ? null : user ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Student Routes */}
      <ProtectedRoute path="/" component={Specializations} />
      <ProtectedRoute path="/specialization/:id" component={Subjects} />
      <ProtectedRoute path="/subject/:id" component={Units} />
      <ProtectedRoute path="/unit/:id" component={Exams} />
      <ProtectedRoute path="/exam/:id" component={TakeExam} />
      <ProtectedRoute path="/result/:id" component={ExamResult} />
      <ProtectedRoute path="/my-exams" component={MyExams} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/specializations" component={AdminSpecializations} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/subjects" component={AdminSubjects} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/units" component={AdminUnits} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/exams" component={AdminExams} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/questions" component={AdminQuestions} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/notes" component={AdminNotes} adminOnly layout={AdminLayout} />
      <ProtectedRoute path="/admin/settings" component={AdminSettings} adminOnly layout={AdminLayout} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
