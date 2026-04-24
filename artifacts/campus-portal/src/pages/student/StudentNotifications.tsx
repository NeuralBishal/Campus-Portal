import {
  useListStudentNotifications,
  useMarkStudentNotificationRead,
  getListStudentNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function StudentNotifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useListStudentNotifications();
  const markRead = useMarkStudentNotificationRead();

  const onRead = (id: string) => {
    markRead.mutate({ notificationId: id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListStudentNotificationsQueryKey() }),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Notifications" description="Messages from your mentor and the system." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !data || data.length === 0 ? (
            <EmptyState icon={Bell} title="All caught up" description="You don't have any notifications yet." />
          ) : (
            <ul className="divide-y">
              {data.map((n) => (
                <li key={n.id} className={`px-6 py-4 flex items-start gap-4 ${n.read ? "opacity-70" : ""}`}>
                  <Bell className={`w-4 h-4 mt-1 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground shrink-0">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{n.body}</p>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => onRead(n.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
