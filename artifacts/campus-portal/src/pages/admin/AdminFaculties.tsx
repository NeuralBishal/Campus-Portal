import { useListAllFaculties } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function AdminFaculties() {
  const { data, isLoading } = useListAllFaculties();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Faculty" description="Mentor roster synchronized from Google Sheets." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Groups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.facultyId}</TableCell>
                    <TableCell>{f.name}</TableCell>
                    <TableCell>{f.department || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{f.email || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={f.groupCount >= 3 ? "destructive" : "secondary"}>
                        {f.groupCount} / 3
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={GraduationCap} title="No faculty found" description="Sync from Google Sheets to populate the roster." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
