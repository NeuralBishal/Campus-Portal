import { useGetStudentDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckSquare, BarChart3, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
  const { data, isLoading, isError } = useGetStudentDashboard();

  if (isLoading) {
    return <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    </div>;
  }

  if (isError || !data) return <div>Error loading dashboard</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Student Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back. Here is your current academic overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Group</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {data.hasGroup ? (
              <div className="space-y-1">
                <div className="text-xl font-bold truncate">{data.group?.projectTitle}</div>
                <Badge variant="outline" className="mt-2">{data.group?.domainName}</Badge>
              </div>
            ) : (
              <div className="text-muted-foreground">Not in a group</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
            <CheckSquare className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.attendancePercent}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Performance</CardTitle>
            <BarChart3 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.averagePerformance.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentNotifications.length > 0 ? (
              data.recentNotifications.map(n => (
                <div key={n.id} className="flex gap-3">
                  <div className="mt-1"><Bell className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <h4 className="text-sm font-medium">{n.title}</h4>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No recent notifications</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
