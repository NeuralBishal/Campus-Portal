const BASE = `${import.meta.env.BASE_URL ?? "/"}api`.replace(/\/+/g, "/");

async function call<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const err: any = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const superadminApi = {
  registerOptions: (body: { name: string; email: string; phone: string }) =>
    call<{ options: any; pending: any }>("/superadmin/register/options", { method: "POST", body: JSON.stringify(body) }),
  registerVerify: (body: { attestation: any; pending: any }) =>
    call<{ authenticated: boolean; userId: string; role: string; name: string }>("/superadmin/register/verify", { method: "POST", body: JSON.stringify(body) }),
  loginOptions: (body: { email: string }) =>
    call<{ options: any }>("/superadmin/login/options", { method: "POST", body: JSON.stringify(body) }),
  loginVerify: (body: { email: string; assertion: any }) =>
    call<any>("/superadmin/login/verify", { method: "POST", body: JSON.stringify(body) }),
  loginFallback: (body: { email: string; phone: string }) =>
    call<any>("/superadmin/login/fallback", { method: "POST", body: JSON.stringify(body) }),
  attempts: (email: string) =>
    call<{ failures: number; threshold: number; fallbackUnlocked: boolean }>(`/superadmin/login/attempts?email=${encodeURIComponent(email)}`),
  me: () => call<{ id: string; name: string; email: string; phone: string; createdAt: string }>("/superadmin/me"),
  logout: () => call<{ ok: true }>("/superadmin/logout", { method: "POST" }),
  listAdmins: () => call<Array<{ id: string; name: string; email: string; createdAt: string }>>("/superadmin/admins"),
  createAdmin: (body: { name: string; email: string; password: string }) =>
    call<{ id: string; name: string; email: string; createdAt: string }>("/superadmin/admins", { method: "POST", body: JSON.stringify(body) }),
  deleteAdmin: (id: string) => call<{ ok: true }>(`/superadmin/admins/${id}`, { method: "DELETE" }),
  bulkUpload: (rows: Array<{ name: string; email: string; password?: string }>) =>
    call<{ createdCount: number; skippedCount: number; created: Array<{ email: string }>; skipped: Array<{ email: string; reason: string }> }>(
      "/superadmin/admins/bulk-upload",
      { method: "POST", body: JSON.stringify({ rows }) },
    ),
};
