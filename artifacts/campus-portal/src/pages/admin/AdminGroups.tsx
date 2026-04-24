import { useListAllGroups } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function AdminGroups() {
  const { data, isLoading } = useListAllGroups();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Project Groups" description="All active project groups across the department." />
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState icon={Users} title="No groups yet" description="Groups will appear once students form them." /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-serif">{g.projectTitle}</CardTitle>
                    <CardDescription className="mt-1">{g.facultyName} · {g.domainName}</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">{g.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description ? <p className="text-sm text-muted-foreground">{g.description}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {g.members.map((m) => (
                    <Badge key={m.id} variant="secondary" className="font-normal">
                      {m.name} <span className="opacity-60 ml-1">{m.rollNumber}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
