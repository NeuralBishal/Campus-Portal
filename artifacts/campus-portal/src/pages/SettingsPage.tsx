import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail, BadgeCheck } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const { data: me } = useGetMe();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Account Settings" description="Manage how you sign in to the campus portal." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="w-5 h-5 text-primary" /> Profile
            </CardTitle>
            <CardDescription>Synced from your roster record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{me?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{me?.role}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Identifier</span><span className="font-medium">{me?.identifier}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-5 h-5 text-primary" /> Password
            </CardTitle>
            <CardDescription>Update your password at any time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/change-password">
              <Button variant="secondary"><KeyRound className="w-4 h-4 mr-2" /> Change password</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-sm text-muted-foreground">
          <Mail className="w-4 h-4 mt-0.5 shrink-0" />
          <span>To update your name or department, contact your campus administrator — those fields are synced from the registrar's Google Sheet.</span>
        </CardContent>
      </Card>
    </div>
  );
}
