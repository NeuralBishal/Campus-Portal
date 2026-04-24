import { useMemo, useState } from "react";
import {
  useGetAttendanceForDate,
  useMarkAttendance,
  getGetAttendanceForDateQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

type Status = "present" | "absent" | "late";

export default function FacultyAttendance() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const { data, isLoading } = useGetAttendanceForDate({ date });
  const mark = useMarkAttendance();
  const [overrides, setOverrides] = useState<Record<string, Status>>({});

  const merged = useMemo(() => {
    if (!data) return [];
    return data.map((r) => ({ ...r, status: (overrides[r.studentId] as Status) ?? (r.status as Status) }));
  }, [data, overrides]);

  const setStatus = (studentId: string, status: Status) => {
    setOverrides((o) => ({ ...o, [studentId]: status }));
  };

  const save = () => {
    if (!data || data.length === 0) return;
    const entries = merged.map((r) => ({ studentId: r.studentId, status: r.status as Status }));
    mark.mutate({ data: { date, entries } }, {
      onSuccess: () => {
        toast.success("Attendance saved");
        setOverrides({});
        qc.invalidateQueries({ queryKey: getGetAttendanceForDateQueryKey({ date }) });
      },
      onError: (err: any) => toast.error(err?.message || "Could not save"),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Attendance" description="Mark attendance for every student under your mentorship." />
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <CardTitle className="text-base">Session</CardTitle>
            <CardDescription>Pick a date and mark each student.</CardDescription>
          </div>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="att-date">Date</Label>
              <Input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            </div>
            <Button onClick={save} disabled={mark.isPending || !data || data.length === 0}>
              <Save className="w-4 h-4 mr-2" /> Save attendance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data || data.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No students yet" description="When students form groups under you, they will appear here." />
          ) : (
            <ul className="divide-y">
              {merged.map((r) => (
                <li key={r.studentId} className="px-6 py-3 flex items-center gap-4 justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.rollNumber}</p>
                  </div>
                  <div className="flex gap-1">
                    {(["present", "late", "absent"] as Status[]).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={r.status === s ? "default" : "outline"}
                        onClick={() => setStatus(r.studentId, s)}
                        className="capitalize w-20"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
