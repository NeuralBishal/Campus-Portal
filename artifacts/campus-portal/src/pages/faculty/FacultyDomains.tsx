import { useState } from "react";
import {
  useListMyDomains,
  useCreateDomain,
  useDeleteDomain,
  getListMyDomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, BookMarked } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function FacultyDomains() {
  const qc = useQueryClient();
  const { data, isLoading } = useListMyDomains();
  const create = useCreateDomain();
  const remove = useDeleteDomain();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ data: { name: name.trim(), description: description.trim() || null } }, {
      onSuccess: () => {
        toast.success("Domain created");
        setName(""); setDescription("");
        qc.invalidateQueries({ queryKey: getListMyDomainsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Could not create"),
    });
  };

  const onDelete = (id: string) => {
    remove.mutate({ domainId: id }, {
      onSuccess: () => {
        toast.success("Domain removed");
        qc.invalidateQueries({ queryKey: getListMyDomainsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Could not delete"),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Project Domains" description="Domains you offer for student groups to choose from." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : !data || data.length === 0 ? (
              <EmptyState
                icon={BookMarked}
                title="No domains yet"
                description="Create a domain so students can choose it when forming groups under you."
              />
            ) : (
              <ul className="divide-y">
                {data.map((d) => (
                  <li key={d.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium font-serif">{d.name}</p>
                      {d.description ? <p className="text-sm text-muted-foreground mt-0.5">{d.description}</p> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={remove.isPending}
                      onClick={() => onDelete(d.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a domain</CardTitle>
            <CardDescription>Make sure students can pick projects under you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Computer Vision" />
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What kinds of projects belong here?" />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                <Plus className="w-4 h-4 mr-2" /> Create domain
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
