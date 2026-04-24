import { useState } from "react";
import {
  useListMyStudents,
  useListSentEmails,
  useSendEmail,
  getListSentEmailsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function FacultyEmail() {
  const qc = useQueryClient();
  const { data: students, isLoading: studentsLoading } = useListMyStudents();
  const { data: history } = useListSentEmails();
  const send = useSendEmail();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const allSelected = students && students.length > 0 && students.every((s) => selected[s.id]);

  const toggleAll = () => {
    if (!students) return;
    if (allSelected) setSelected({});
    else {
      const next: Record<string, boolean> = {};
      students.forEach((s) => { next[s.id] = true; });
      setSelected(next);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) { toast.error("Select at least one recipient."); return; }
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body are required."); return; }
    send.mutate({ data: { recipientStudentIds: ids, subject: subject.trim(), body: body.trim() } }, {
      onSuccess: () => {
        toast.success("Message sent");
        setSubject(""); setBody(""); setSelected({});
        qc.invalidateQueries({ queryKey: getListSentEmailsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Send failed"),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Email" description="Send notes and announcements to your students. They appear in their notifications." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Compose</CardTitle>
            <CardDescription>Pick recipients and write your message.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recipients</Label>
                  <button type="button" onClick={toggleAll} className="text-xs text-primary underline">
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                  {studentsLoading ? (
                    <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  ) : !students || students.length === 0 ? (
                    <EmptyState icon={Mail} title="No students" description="Students appear here once they form groups under you." />
                  ) : (
                    students.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                        <Checkbox
                          checked={!!selected[s.id]}
                          onCheckedChange={(v) => setSelected((o) => ({ ...o, [s.id]: !!v }))}
                        />
                        <div className="text-sm">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground ml-2">{s.rollNumber}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A short subject line" />
              </div>
              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write your message here." />
              </div>
              <Button type="submit" disabled={send.isPending}>
                <Send className="w-4 h-4 mr-2" /> Send
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sent</CardTitle>
            <CardDescription>Most recent messages you sent.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!history ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : history.length === 0 ? (
              <EmptyState icon={Mail} title="No messages yet" />
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {history.map((m) => (
                  <div key={m.id} className="px-6 py-3">
                    <p className="text-sm font-medium truncate">{m.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{m.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {m.recipientCount} recipient{m.recipientCount === 1 ? "" : "s"} · {new Date(m.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
