import { useState } from "react";
import {
  useListAdmins,
  useCreateAdmin,
  useDeleteAdmin,
  getListAdminsQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function AdminAdmins() {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const { data, isLoading } = useListAdmins();
  const create = useCreateAdmin();
  const remove = useDeleteAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    create.mutate({ data: { name, email, password } }, {
      onSuccess: () => {
        toast.success("Admin created");
        setName(""); setEmail(""); setPassword("");
        qc.invalidateQueries({ queryKey: getListAdminsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Could not create admin"),
    });
  };

  const onDelete = (id: string) => {
    remove.mutate({ adminId: id }, {
      onSuccess: () => {
        toast.success("Admin removed");
        qc.invalidateQueries({ queryKey: getListAdminsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Could not delete"),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="System Admins" description="Manage who can administer the campus portal." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : data && data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}{me?.userId === a.id ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}</TableCell>
                      <TableCell className="text-muted-foreground">{a.email}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={me?.userId === a.id || remove.isPending}
                          onClick={() => onDelete(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Shield} title="No admins yet" description="Create the first admin from the panel beside this." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add an admin</CardTitle>
            <CardDescription>They will be able to manage the entire portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Initial password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                <Plus className="w-4 h-4 mr-2" /> Create admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
