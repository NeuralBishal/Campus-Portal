import { useState } from "react";
import {
  useListMyStudents,
  useListMyGroups,
  useGetPerformanceReport,
  useRecordPerformance,
  getGetPerformanceReportQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Award, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

type Period = "weekly" | "monthly" | "semester";

export default function FacultyPerformance() {
  const qc = useQueryClient();
  const { data: students } = useListMyStudents();
  const { data: groups } = useListMyGroups();
  const [period, setPeriod] = useState<Period>("weekly");
  const [groupId, setGroupId] = useState<string>("all");
  const reportArgs = groupId === "all" ? { period } : { period, groupId };
  const { data: report, isLoading } = useGetPerformanceReport(reportArgs);

  const record = useRecordPerformance();
  const [studentId, setStudentId] = useState<string>("");
  const [score, setScore] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [recordPeriod, setRecordPeriod] = useState<Period>("weekly");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sc = Number(score);
    if (!studentId) { toast.error("Pick a student."); return; }
    if (Number.isNaN(sc) || sc < 0 || sc > 10) { toast.error("Score must be between 0 and 10."); return; }
    record.mutate({
      data: { studentId, score: sc, notes: notes.trim() || null, period: recordPeriod },
    }, {
      onSuccess: () => {
        toast.success("Performance recorded");
        setScore(""); setNotes("");
        qc.invalidateQueries({ queryKey: getGetPerformanceReportQueryKey(reportArgs) });
      },
      onError: (err: any) => toast.error(err?.message || "Could not record"),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Performance" description="Record scores and review weekly, monthly, and semester reports." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Record an entry</CardTitle>
            <CardDescription>Score is on a scale of 0 to 10.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
                  <SelectContent>
                    {(students ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} · {s.rollNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Period</Label>
                <Select value={recordPeriod} onValueChange={(v) => setRecordPeriod(v as Period)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Score (0–10)</Label>
                <Input type="number" min={0} max={10} step="0.1" value={score} onChange={(e) => setScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for this score." />
              </div>
              <Button type="submit" className="w-full" disabled={record.isPending}>Record</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <CardTitle className="text-base">Report</CardTitle>
                <CardDescription className="capitalize">{period} report</CardDescription>
              </div>
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label>Period</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Group</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="All groups" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All groups</SelectItem>
                      {(groups ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.projectTitle}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading || !report ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/40">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Average score</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{report.averageScore}</div></CardContent>
                  </Card>
                  <Card className="bg-muted/40 md:col-span-2">
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Top performer</CardTitle></CardHeader>
                    <CardContent>
                      {report.topPerformer ? (
                        <div>
                          <div className="text-lg font-medium">{report.topPerformer.name}</div>
                          <div className="text-xs text-muted-foreground">{report.topPerformer.rollNumber} · score {report.topPerformer.score}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No entries this period yet.</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance correlation</CardTitle>
              <CardDescription>Per-student attendance % for the selected window.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {!report || report.attendanceByStudent.length === 0 ? (
                <EmptyState icon={BarChart3} title="No attendance data" description="Mark some attendance to see the chart." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.attendanceByStudent}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="rollNumber" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 8 }} />
                    <Bar dataKey="attendancePercent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!report || report.entries.length === 0 ? (
                <EmptyState icon={BarChart3} title="No entries yet" description="Record performance entries from the form on the left." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground">{new Date(e.recordedAt).toLocaleDateString()}</TableCell>
                        <TableCell>{e.studentName}</TableCell>
                        <TableCell className="text-muted-foreground">{e.rollNumber}</TableCell>
                        <TableCell className="text-right font-medium">{e.score}</TableCell>
                        <TableCell className="text-muted-foreground">{e.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
