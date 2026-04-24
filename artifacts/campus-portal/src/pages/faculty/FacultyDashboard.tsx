import { useGetFacultyDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, CheckSquare, Bell, Mail, BookMarked } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function FacultyDashboard() {
  const { data, isLoading } = useGetFacultyDashboard();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      </div>
    );
  }

  const stats = [
    { title: "Group capacity", value: `${data.groupCount} / ${data.groupCapacity}`, icon: Users },
    { title: "Students mentored", value: data.studentCount, icon: BookMarked },
    { title: "Attendance rate", value: `${data.attendanceRate}%`, icon: CheckSquare },
    { title: "Unread notifications", value: data.unreadNotifications, icon: Bell },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Faculty Dashboard" description="Your mentorship at a glance." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My groups</CardTitle>
            <CardDescription>Active project groups under your mentorship.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingGroups.length === 0 ? (
              <EmptyState icon={Users} title="No groups yet" description="Students will appear here as they form groups under you." />
            ) : (
              <div className="divide-y">
                {data.upcomingGroups.map((g) => (
                  <div key={g.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium font-serif">{g.projectTitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">{g.domainName}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{g.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {g.members.map((m) => (
                        <Badge key={m.id} variant="secondary" className="font-normal">
                          {m.name} <span className="opacity-60 ml-1">{m.rollNumber}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent emails</CardTitle>
            <CardDescription>Last messages you sent.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentEmails.length === 0 ? (
              <EmptyState icon={Mail} title="No emails sent" />
            ) : (
              <div className="divide-y">
                {data.recentEmails.map((e) => (
                  <div key={e.id} className="px-6 py-3">
                    <p className="text-sm font-medium truncate">{e.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.recipientCount} recipient{e.recipientCount === 1 ? "" : "s"} · {new Date(e.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
