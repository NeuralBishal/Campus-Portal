import { useMemo } from "react";
import { useGetMyPerformance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function StudentPerformance() {
  const { data, isLoading } = useGetMyPerformance();

  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data].reverse().map((e, i) => ({
      label: `#${i + 1}`,
      score: e.score,
    }));
  }, [data]);

  const avg = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Number((data.reduce((a, b) => a + b.score, 0) / data.length).toFixed(2));
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Performance" description="Scores recorded by your mentor over time." />
      {isLoading || !data ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Entries</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
            <Card className="md:col-span-3"><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground font-medium">Average score</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{avg}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Trajectory</CardTitle></CardHeader>
            <CardContent className="h-64">
              {chartData.length === 0 ? (
                <EmptyState icon={BarChart3} title="No data yet" description="Once your mentor records scores, you'll see them here." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {data.length === 0 ? (
                <EmptyState icon={BarChart3} title="No entries yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground">{new Date(e.recordedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{e.period}</TableCell>
                        <TableCell className="text-right font-medium">{e.score}</TableCell>
                        <TableCell className="text-muted-foreground">{e.notes || "—"}</TableCell>
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
