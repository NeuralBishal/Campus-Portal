import { useMemo, useState } from "react";
import {
  useGetMyGroup,
  useListAvailableFaculties,
  useListFreeStudents,
  useCreateGroup,
  getGetMyGroupQueryKey,
  getListAvailableFacultiesQueryKey,
  getListFreeStudentsQueryKey,
  getGetStudentDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Sparkles, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const MAX_TEAMMATES = 3;

export default function StudentGroup() {
  const qc = useQueryClient();
  const { data: group, isLoading: groupLoading } = useGetMyGroup();
  const { data: faculties } = useListAvailableFaculties();
  const { data: freeStudents } = useListFreeStudents();
  const create = useCreateGroup();

  const [teammates, setTeammates] = useState<Record<string, boolean>>({});
  const [facultyId, setFacultyId] = useState<string>("");
  const [domainId, setDomainId] = useState<string>("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");

  const selectedFaculty = useMemo(
    () => (faculties ?? []).find((f) => f.id === facultyId) ?? null,
    [faculties, facultyId],
  );

  const teammateRolls = useMemo(() => {
    if (!freeStudents) return [];
    return freeStudents.filter((s) => teammates[s.id]).map((s) => s.rollNumber);
  }, [freeStudents, teammates]);

  const teammateCount = teammateRolls.length;

  const toggleTeammate = (id: string) => {
    setTeammates((t) => {
      const next = { ...t };
      if (next[id]) {
        delete next[id];
      } else {
        const count = Object.values(next).filter(Boolean).length;
        if (count >= MAX_TEAMMATES) {
          toast.error(`You can pick at most ${MAX_TEAMMATES} teammates (4-person group including you).`);
          return t;
        }
        next[id] = true;
      }
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) { toast.error("Project title is required."); return; }
    if (!facultyId) { toast.error("Pick a faculty mentor."); return; }
    if (!domainId) { toast.error("Pick a domain."); return; }
    create.mutate({
      data: {
        projectTitle: projectTitle.trim(),
        description: description.trim() || null,
        memberRollNumbers: teammateRolls,
        facultyId,
        domainId,
      },
    }, {
      onSuccess: () => {
        toast.success("Group created");
        qc.invalidateQueries({ queryKey: getGetMyGroupQueryKey() });
        qc.invalidateQueries({ queryKey: getListAvailableFacultiesQueryKey() });
        qc.invalidateQueries({ queryKey: getListFreeStudentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Could not create group"),
    });
  };

  if (groupLoading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (group) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PageHeader title="My Group" description="Your team for this academic project." />
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="font-serif text-xl">{group.projectTitle}</CardTitle>
                <CardDescription className="mt-1">{group.facultyName} · {group.domainName}</CardDescription>
              </div>
              <Badge variant="outline" className="capitalize">{group.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.description ? <p className="text-muted-foreground">{group.description}</p> : null}
            <div>
              <p className="text-sm font-medium mb-2">Members</p>
              <div className="flex flex-wrap gap-2">
                {group.members.map((m) => (
                  <Badge key={m.id} variant="secondary" className="font-normal">
                    {m.name} <span className="opacity-60 ml-1">{m.rollNumber}</span>
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">A student may belong to only one group. Contact your mentor for any change request.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Form your group"
        description="Pick up to three teammates, choose a mentor and a domain, then propose your project."
      />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Teammates</CardTitle>
            <CardDescription>Selected {teammateCount} of {MAX_TEAMMATES} possible. You will be the fourth member.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t max-h-80 overflow-y-auto divide-y">
              {!freeStudents ? (
                <div className="p-6 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : freeStudents.length === 0 ? (
                <EmptyState icon={Users} title="No free students" description="Every other student is already in a group." />
              ) : (
                freeStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={!!teammates[s.id]}
                      onCheckedChange={() => toggleTeammate(s.id)}
                    />
                    <div className="text-sm flex-1 min-w-0">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground ml-2">{s.rollNumber}</span>
                      {s.department ? <span className="text-muted-foreground ml-2">· {s.department}</span> : null}
                    </div>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project</CardTitle>
            <CardDescription>Define what your team is going to build.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Mentor</Label>
              <Select value={facultyId} onValueChange={(v) => { setFacultyId(v); setDomainId(""); }}>
                <SelectTrigger><SelectValue placeholder="Pick a mentor" /></SelectTrigger>
                <SelectContent>
                  {(faculties ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} <span className="opacity-60 ml-1">({f.groupCount}/3 groups)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {faculties && faculties.length === 0 && (
                <p className="text-xs text-muted-foreground">No mentors are accepting groups right now.</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Domain</Label>
              <Select value={domainId} onValueChange={setDomainId} disabled={!selectedFaculty}>
                <SelectTrigger><SelectValue placeholder={selectedFaculty ? "Pick a domain" : "Pick a mentor first"} /></SelectTrigger>
                <SelectContent>
                  {(selectedFaculty?.domains ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Project title</Label>
              <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g. Bias detection in NLP" />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="A short pitch for your mentor." />
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              <Send className="w-4 h-4 mr-2" /> Propose group
            </Button>
            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span>Your mentor will be notified the instant you submit, and your teammates will see this group in their notifications.</span>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
