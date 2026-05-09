import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import ChangePassword from "@/pages/auth/ChangePassword";
import AdminRegister from "@/pages/auth/AdminRegister";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import SettingsPage from "@/pages/SettingsPage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminSheets from "@/pages/admin/AdminSheets";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminFaculties from "@/pages/admin/AdminFaculties";
import AdminGroups from "@/pages/admin/AdminGroups";
import AdminAdmins from "@/pages/admin/AdminAdmins";
import AdminSecurity from "@/pages/admin/AdminSecurity";

import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultyGroups from "@/pages/faculty/FacultyGroups";
import FacultyDomains from "@/pages/faculty/FacultyDomains";
import FacultyAttendance from "@/pages/faculty/FacultyAttendance";
import FacultyEmail from "@/pages/faculty/FacultyEmail";
import FacultyPerformance from "@/pages/faculty/FacultyPerformance";
import FacultyNotifications from "@/pages/faculty/FacultyNotifications";

import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentGroup from "@/pages/student/StudentGroup";
import StudentNotifications from "@/pages/student/StudentNotifications";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentPerformance from "@/pages/student/StudentPerformance";

import SuperadminPortal from "@/pages/superadmin/SuperadminPortal";
import SuperadminDashboard from "@/pages/superadmin/SuperadminDashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login/student">{() => <Login role="student" />}</Route>
      <Route path="/login/faculty">{() => <Login role="faculty" />}</Route>
      <Route path="/login/admin">{() => <Login role="admin" />}</Route>
      <Route path="/register/admin" component={AdminRegister} />

      <Route path="/superadmin" component={SuperadminPortal} />
      <Route path="/superadmin/dashboard" component={SuperadminDashboard} />

      <Route path="/change-password">
        <AuthGuard><ChangePassword /></AuthGuard>
      </Route>

      <Route path="/admin" nest>
        <AuthGuard allowedRoles={["admin"]}>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={AdminDashboard} />
              <Route path="/sheets" component={AdminSheets} />
              <Route path="/students" component={AdminStudents} />
              <Route path="/faculties" component={AdminFaculties} />
              <Route path="/groups" component={AdminGroups} />
              <Route path="/admins" component={AdminAdmins} />
              <Route path="/security" component={AdminSecurity} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>

      <Route path="/faculty" nest>
        <AuthGuard allowedRoles={["faculty"]}>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={FacultyDashboard} />
              <Route path="/groups" component={FacultyGroups} />
              <Route path="/domains" component={FacultyDomains} />
              <Route path="/attendance" component={FacultyAttendance} />
              <Route path="/email" component={FacultyEmail} />
              <Route path="/performance" component={FacultyPerformance} />
              <Route path="/notifications" component={FacultyNotifications} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>

      <Route path="/student" nest>
        <AuthGuard allowedRoles={["student"]}>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={StudentDashboard} />
              <Route path="/group" component={StudentGroup} />
              <Route path="/notifications" component={StudentNotifications} />
              <Route path="/attendance" component={StudentAttendance} />
              <Route path="/performance" component={StudentPerformance} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
