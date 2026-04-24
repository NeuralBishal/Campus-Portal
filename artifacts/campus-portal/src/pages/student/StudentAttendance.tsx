import { useGetMyAttendance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
};

export default function StudentAttendance() {
  const { data, isLoading } = useGetMyAttendance();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Attendance" description="Your full attendance record across the project." />

      {isLoading || !data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Total sessions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.totalSessions}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Present</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{data.presentCount}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Late</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.lateCount}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Attendance %</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.attendancePercent}%</div></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0">
              {data.entries.length === 0 ? (
                <EmptyState icon={CheckSquare} title="No sessions recorded" description="When your mentor marks attendance, sessions appear here." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[e.status] ?? "secondary"} className="capitalize">{e.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
