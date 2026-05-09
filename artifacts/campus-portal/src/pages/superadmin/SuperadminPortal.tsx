import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Fingerprint, Shield, Loader2, AlertTriangle, KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { superadminApi } from "@/lib/superadminApi";

export default function SuperadminPortal() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useGetMe();
  const [tab, setTab] = useState<"login" | "register">("login");

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [fallbackUnlocked, setFallbackUnlocked] = useState(false);
  const [fallbackPhone, setFallbackPhone] = useState("");

  // register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBusy, setRegBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && me?.authenticated && me.role === "superadmin") {
      setLocation("/superadmin/dashboard");
    }
  }, [me, isLoading, setLocation]);

  useEffect(() => {
    if (!loginEmail) {
      setFailures(0); setFallbackUnlocked(false); return;
    }
    const t = setTimeout(async () => {
      try {
        const s = await superadminApi.attempts(loginEmail.trim().toLowerCase());
        setFailures(s.failures); setThreshold(s.threshold); setFallbackUnlocked(s.fallbackUnlocked);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [loginEmail]);

  const handleFingerprintLogin = async () => {
    if (!loginEmail.trim()) { toast.error("Enter your email first."); return; }
    setLoginBusy(true);
    try {
      const { options } = await superadminApi.loginOptions({ email: loginEmail.trim() });
      const assertion = await startAuthentication({ optionsJSON: options });
      const res = await superadminApi.loginVerify({ email: loginEmail.trim(), assertion });
      toast.success(`Welcome back, ${res.name}`);
      queryClient.invalidateQueries();
      setLocation("/superadmin/dashboard");
    } catch (e: any) {
      const msg = e?.message || "Fingerprint login failed.";
      toast.error(msg);
      const f = e?.data?.failures;
      if (typeof f === "number") {
        setFailures(f);
        setFallbackUnlocked(Boolean(e?.data?.fallbackUnlocked));
      } else {
        try {
          const s = await superadminApi.attempts(loginEmail.trim().toLowerCase());
          setFailures(s.failures); setFallbackUnlocked(s.fallbackUnlocked);
        } catch { /* ignore */ }
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const handleFallbackLogin = async () => {
    if (!loginEmail.trim() || !fallbackPhone.trim()) { toast.error("Enter both email and phone."); return; }
    setLoginBusy(true);
    try {
      const res = await superadminApi.loginFallback({ email: loginEmail.trim(), phone: fallbackPhone.trim() });
      toast.success(`Welcome back, ${res.name}`);
      queryClient.invalidateQueries();
      setLocation("/superadmin/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Fallback login failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim()) {
      toast.error("All fields are required."); return;
    }
    setRegBusy(true);
    try {
      const { options, pending } = await superadminApi.registerOptions({
        name: regName.trim(), email: regEmail.trim(), phone: regPhone.trim(),
      });
      const attestation = await startRegistration({ optionsJSON: options });
      const res = await superadminApi.registerVerify({ attestation, pending });
      toast.success(`Superadmin account created. Welcome, ${res.name}!`);
      queryClient.invalidateQueries();
      setLocation("/superadmin/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Registration failed.");
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-3 text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <CardTitle className="text-3xl font-serif">Superadmin Portal</CardTitle>
            <CardDescription className="text-base">
              Restricted access. Use your fingerprint to sign in or register a new superadmin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Registered Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@campus.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <Button
                  onClick={handleFingerprintLogin}
                  className="w-full"
                  size="lg"
                  disabled={loginBusy}
                >
                  {loginBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                  Sign in with Fingerprint
                </Button>

                {failures > 0 && (
                  <Alert variant={fallbackUnlocked ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {fallbackUnlocked
                        ? "Fingerprint locked"
                        : `Failed attempts: ${failures} / ${threshold}`}
                    </AlertTitle>
                    <AlertDescription>
                      {fallbackUnlocked
                        ? "Use your email + phone below to verify identity."
                        : `After ${threshold} failed attempts you can fall back to email + phone verification.`}
                    </AlertDescription>
                  </Alert>
                )}

                {fallbackUnlocked && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="fallback-phone">Registered Phone</Label>
                      <Input
                        id="fallback-phone"
                        type="tel"
                        placeholder="+1 555 123 4567"
                        value={fallbackPhone}
                        onChange={(e) => setFallbackPhone(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleFallbackLogin}
                      className="w-full"
                      variant="secondary"
                      disabled={loginBusy}
                    >
                      {loginBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <KeyRound className="mr-2 h-5 w-5" />}
                      Verify with Email + Phone
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="register" className="space-y-5">
                <Alert>
                  <Fingerprint className="h-4 w-4" />
                  <AlertTitle>Fingerprint required</AlertTitle>
                  <AlertDescription>
                    Your device's biometric authenticator (Touch ID, Windows Hello, fingerprint sensor) will be used to secure this account.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input id="reg-name" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@campus.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Mobile Number</Label>
                  <Input id="reg-phone" type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+1 555 123 4567" />
                </div>
                <Button onClick={handleRegister} className="w-full" size="lg" disabled={regBusy}>
                  {regBusy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5" />}
                  Register with Fingerprint
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
