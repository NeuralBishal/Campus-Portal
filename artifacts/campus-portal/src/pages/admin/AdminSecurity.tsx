import { useEffect, useState } from "react";
import {
  useGetSecuritySettings,
  useUpdateSecuritySettings,
  useListAuditLogs,
  getGetSecuritySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default function AdminSecurity() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useGetSecuritySettings();
  const { data: logs } = useListAuditLogs();
  const update = useUpdateSecuritySettings();

  const [sessionTimeout, setSessionTimeout] = useState(120);
  const [minLen, setMinLen] = useState(6);
  const [requireChange, setRequireChange] = useState(true);
  const [allowStudent, setAllowStudent] = useState(true);
  const [allowFaculty, setAllowFaculty] = useState(true);

  useEffect(() => {
    if (settings) {
      setSessionTimeout(settings.sessionTimeoutMinutes);
      setMinLen(settings.minPasswordLength);
      setRequireChange(settings.requirePasswordChange);
      setAllowStudent(settings.allowStudentLogin);
      setAllowFaculty(settings.allowFacultyLogin);
    }
  }, [settings]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      data: {
        sessionTimeoutMinutes: sessionTimeout,
        minPasswordLength: minLen,
        requirePasswordChange: requireChange,
        allowStudentLogin: allowStudent,
        allowFacultyLogin: allowFaculty,
      }
    }, {
      onSuccess: () => {
        toast.success("Security settings updated");
        qc.invalidateQueries({ queryKey: getGetSecuritySettingsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Update failed"),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Security & Audit" description="Tune access policies and review every action taken in the system." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Policy</CardTitle>
            <CardDescription>Applies to every login.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <form onSubmit={save} className="space-y-5">
                <div className="space-y-1">
                  <Label>Session timeout (minutes)</Label>
                  <Input type="number" min={5} max={1440} value={sessionTimeout} onChange={(e) => setSessionTimeout(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Minimum password length</Label>
                  <Input type="number" min={4} max={64} value={minLen} onChange={(e) => setMinLen(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">Force password change</div>
                    <div className="text-xs text-muted-foreground">First-time users must change their password.</div>
                  </div>
                  <Switch checked={requireChange} onCheckedChange={setRequireChange} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">Allow student login</div>
                    <div className="text-xs text-muted-foreground">Disable to lock out students temporarily.</div>
                  </div>
                  <Switch checked={allowStudent} onCheckedChange={setAllowStudent} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">Allow faculty login</div>
                    <div className="text-xs text-muted-foreground">Disable to lock out faculty temporarily.</div>
                  </div>
                  <Switch checked={allowFaculty} onCheckedChange={setAllowFaculty} />
                </div>
                <Button type="submit" className="w-full" disabled={update.isPending}>
                  <Shield className="w-4 h-4 mr-2" /> Save policy
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Audit log</CardTitle>
            <CardDescription>Most recent 200 actions, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!logs ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : logs.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" />
            ) : (
              <div className="divide-y max-h-[640px] overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="px-6 py-3 flex items-start gap-3">
                    <Activity className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{l.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="capitalize">{l.actorRole}</span> · {l.actorName}
                        {l.details ? ` · ${l.details}` : ""}
                      </p>
                    </div>
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
