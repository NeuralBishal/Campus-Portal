import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Upload, UserPlus, Trash2, LogOut, Mail, Phone, FileSpreadsheet } from "lucide-react";
import { superadminApi } from "@/lib/superadminApi";

type Admin = { id: string; name: string; email: string; createdAt: string };
type SuperadminMe = { id: string; name: string; email: string; phone: string; createdAt: string };

export default function SuperadminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useGetMe();

  const [profile, setProfile] = useState<SuperadminMe | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [busy, setBusy] = useState(false);

  // create form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // upload state
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadResult, setUploadResult] = useState<{ createdCount: number; skippedCount: number; skipped: Array<{ email: string; reason: string }> } | null>(null);

  useEffect(() => {
    if (!isLoading && (!me?.authenticated || me.role !== "superadmin")) {
      setLocation("/superadmin");
    }
  }, [me, isLoading, setLocation]);

  const refresh = async () => {
    try {
      const [p, a] = await Promise.all([superadminApi.me(), superadminApi.listAdmins()]);
      setProfile(p); setAdmins(a);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load data.");
    }
  };

  useEffect(() => { if (me?.role === "superadmin") refresh(); }, [me?.role]);

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error("Name, email, and password are required."); return;
    }
    setBusy(true);
    try {
      await superadminApi.createAdmin({ name: newName.trim(), email: newEmail.trim(), password: newPassword.trim() });
      toast.success("Admin created.");
      setNewName(""); setNewEmail(""); setNewPassword("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create admin.");
    } finally { setBusy(false); }
  };

  const handleDelete = async (admin: Admin) => {
    setBusy(true);
    try {
      await superadminApi.deleteAdmin(admin.id);
      toast.success(`Deleted ${admin.email}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete admin.");
    } finally { setBusy(false); }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setUploadResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("No sheet found in file.");
      const rowsRaw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      const rows = rowsRaw.map((r) => {
        const get = (...keys: string[]) => {
          for (const k of keys) {
            for (const kk of Object.keys(r)) if (kk.trim().toLowerCase() === k.toLowerCase()) return String(r[kk] ?? "").trim();
          }
          return "";
        };
        return {
          name: get("name", "full name", "admin name"),
          email: get("email", "email address", "admin email"),
          password: get("password", "initial password", "id", "admin id") || undefined,
        };
      }).filter((r) => r.email);
      if (!rows.length) throw new Error("No valid rows. Expected columns: name, email, password.");
      const result = await superadminApi.bulkUpload(rows);
      setUploadResult(result);
      toast.success(`Created ${result.createdCount} admins (${result.skippedCount} skipped).`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed.");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleLogout = async () => {
    try { await superadminApi.logout(); } catch { /* ignore */ }
    queryClient.clear();
    setLocation("/");
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif font-bold text-lg leading-tight">Superadmin Portal</div>
              <div className="text-xs text-muted-foreground">{profile.name} · {profile.email}</div>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Welcome, {profile.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Manage administrators for the Campus Portal.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div><div className="text-xs text-muted-foreground">Email</div><div className="font-medium">{profile.email}</div></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary" />
              <div><div className="text-xs text-muted-foreground">Phone</div><div className="font-medium">{profile.phone}</div></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div><div className="text-xs text-muted-foreground">Total Admins</div><div className="font-medium">{admins.length}</div></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Admin Excel Sheet</CardTitle>
            <CardDescription>
              Upload a .xlsx or .csv file with columns: <span className="font-mono">name</span>, <span className="font-mono">email</span>, and optionally <span className="font-mono">password</span>. Each row becomes an admin login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} disabled={busy} />
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
            </div>
            {uploadResult && (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex gap-3">
                  <Badge variant="default">Created: {uploadResult.createdCount}</Badge>
                  <Badge variant="secondary">Skipped: {uploadResult.skippedCount}</Badge>
                </div>
                {uploadResult.skipped.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                    {uploadResult.skipped.map((s, i) => (
                      <li key={i}>• <span className="font-mono">{s.email}</span> — {s.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Create Admin Manually</CardTitle>
            <CardDescription>Add a single administrator account.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="ad-name">Name</Label>
              <Input id="ad-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Admin name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-email">Email</Label>
              <Input id="ad-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@campus.edu" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-pw">Initial Password</Label>
              <Input id="ad-pw" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Initial password" />
            </div>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
            <CardDescription>All accounts that can sign in to the admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No admins yet. Upload a sheet or create one above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="font-mono text-sm">{a.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete admin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently deletes <span className="font-mono">{a.email}</span> and revokes their access.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(a)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
