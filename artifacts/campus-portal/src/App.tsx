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

      {(["/admin", "/admin/:rest*"] as const).map((p) => (
        <Route key={p} path={p}>
          <AuthGuard allowedRoles={["admin"]}>
            <DashboardLayout>
              <Switch>
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/admin/sheets" component={AdminSheets} />
                <Route path="/admin/students" component={AdminStudents} />
                <Route path="/admin/faculties" component={AdminFaculties} />
                <Route path="/admin/groups" component={AdminGroups} />
                <Route path="/admin/admins" component={AdminAdmins} />
                <Route path="/admin/security" component={AdminSecurity} />
                <Route path="/admin/settings" component={SettingsPage} />
                <Route component={NotFound} />
              </Switch>
            </DashboardLayout>
          </AuthGuard>
        </Route>
      ))}

      {(["/faculty", "/faculty/:rest*"] as const).map((p) => (
        <Route key={p} path={p}>
          <AuthGuard allowedRoles={["faculty"]}>
            <DashboardLayout>
              <Switch>
                <Route path="/faculty" component={FacultyDashboard} />
                <Route path="/faculty/groups" component={FacultyGroups} />
                <Route path="/faculty/domains" component={FacultyDomains} />
                <Route path="/faculty/attendance" component={FacultyAttendance} />
                <Route path="/faculty/email" component={FacultyEmail} />
                <Route path="/faculty/performance" component={FacultyPerformance} />
                <Route path="/faculty/notifications" component={FacultyNotifications} />
                <Route path="/faculty/settings" component={SettingsPage} />
                <Route component={NotFound} />
              </Switch>
            </DashboardLayout>
          </AuthGuard>
        </Route>
      ))}

      {(["/student", "/student/:rest*"] as const).map((p) => (
        <Route key={p} path={p}>
          <AuthGuard allowedRoles={["student"]}>
            <DashboardLayout>
              <Switch>
                <Route path="/student" component={StudentDashboard} />
                <Route path="/student/group" component={StudentGroup} />
                <Route path="/student/notifications" component={StudentNotifications} />
                <Route path="/student/attendance" component={StudentAttendance} />
                <Route path="/student/performance" component={StudentPerformance} />
                <Route path="/student/settings" component={SettingsPage} />
                <Route component={NotFound} />
              </Switch>
            </DashboardLayout>
          </AuthGuard>
        </Route>
      ))}

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
