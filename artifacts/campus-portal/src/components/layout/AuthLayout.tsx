import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { GraduationCap, Sparkles, CheckCircle2, ShieldCheck, Users } from "lucide-react";

type Variant = "student" | "faculty" | "admin" | "default";

const variantStyles: Record<Variant, { bg: string; panel: string; blob1: string; blob2: string }> = {
  student: {
    bg: "auth-gradient-student",
    panel: "from-sky-700 via-cyan-700 to-blue-800",
    blob1: "bg-sky-300/30",
    blob2: "bg-cyan-200/40",
  },
  faculty: {
    bg: "auth-gradient-faculty",
    panel: "from-amber-700 via-orange-700 to-rose-700",
    blob1: "bg-amber-300/40",
    blob2: "bg-orange-200/40",
  },
  admin: {
    bg: "auth-gradient-admin",
    panel: "from-rose-700 via-fuchsia-700 to-violet-800",
    blob1: "bg-rose-300/30",
    blob2: "bg-violet-300/40",
  },
  default: {
    bg: "auth-gradient-default",
    panel: "from-primary via-primary to-primary/85",
    blob1: "bg-primary/15",
    blob2: "bg-accent/40",
  },
};

function detectVariant(path: string): Variant {
  if (path.includes("/student")) return "student";
  if (path.includes("/faculty")) return "faculty";
  if (path.includes("/admin") || path.includes("/superadmin")) return "admin";
  return "default";
}

export function AuthLayout({ children, variant }: { children: ReactNode; variant?: Variant }) {
  const [location] = useLocation();
  const v = variant ?? detectVariant(location);
  const styles = variantStyles[v];

  return (
    <div className={`min-h-screen relative overflow-hidden flex flex-col ${styles.bg}`}>
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute -top-40 -left-32 w-[30rem] h-[30rem] rounded-full blur-3xl animate-blob ${styles.blob1}`} />
        <div className={`absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl animate-blob animation-delay-2000 ${styles.blob2}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_hsl(var(--foreground)/0.04)_1px,_transparent_0)] [background-size:28px_28px]" />
      </div>

      <header className="border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-2 rounded-lg shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">Campus Portal</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex">
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>

        {/* Decorative side panel — hidden on small screens */}
        <aside className={`hidden lg:flex w-[28rem] xl:w-[32rem] relative bg-gradient-to-br ${styles.panel} text-white p-12 flex-col justify-between overflow-hidden`}>
          <div aria-hidden className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,_white_1px,_transparent_0)] [background-size:24px_24px]" />
          <div aria-hidden className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              Campus Portal
            </div>
            <h2 className="text-4xl font-serif font-bold leading-tight">
              Where every academic detail finds its place.
            </h2>
            <p className="text-white/80 leading-relaxed">
              Sign in to continue managing your groups, attendance, and reports.
            </p>
          </div>

          <ul className="relative space-y-4 text-sm">
            {[
              { icon: Users, text: "Group formation in seconds" },
              { icon: CheckCircle2, text: "Attendance with smart insights" },
              { icon: ShieldCheck, text: "Role-based, audited access" },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-white/90">{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="relative text-xs text-white/60 border-t border-white/10 pt-4">
            Built for modern academic teams.
          </div>
        </aside>
      </main>
    </div>
  );
}
