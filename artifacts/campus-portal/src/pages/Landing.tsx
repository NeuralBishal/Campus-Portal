import { Link } from "wouter";
import {
  GraduationCap,
  Users,
  Shield,
  BookOpen,
  Sparkles,
  CheckSquare,
  BarChart3,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const roleCards = [
  {
    role: "student" as const,
    title: "Student",
    icon: Users,
    desc: "Form groups, track attendance, and watch your performance climb.",
    accent: "from-indigo-500/20 via-indigo-400/10 to-transparent",
    pill: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    cta: "Student Login",
  },
  {
    role: "faculty" as const,
    title: "Faculty",
    icon: BookOpen,
    desc: "Mentor groups, record sessions, and review semester reports.",
    accent: "from-amber-500/20 via-amber-400/10 to-transparent",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    cta: "Faculty Login",
  },
  {
    role: "admin" as const,
    title: "Administrator",
    icon: Shield,
    desc: "Sync rosters, manage security, and oversee the department.",
    accent: "from-rose-500/20 via-rose-400/10 to-transparent",
    pill: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    cta: "Admin Login",
  },
];

const features = [
  { icon: CheckSquare, title: "Smart Attendance", desc: "Per-session tracking with weekly correlation charts." },
  { icon: BarChart3, title: "Performance Insights", desc: "Weekly, monthly, and semester reports out of the box." },
  { icon: Bell, title: "Instant Notifications", desc: "Faculty broadcasts land directly in students' notification feed." },
  { icon: Shield, title: "Role-based Security", desc: "Admin, faculty, and student surfaces with audited sessions." },
];

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex flex-col">
      {/* Decorative animated blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full bg-accent/40 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-[24rem] h-[24rem] rounded-full bg-secondary/60 blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_hsl(var(--foreground)/0.05)_1px,_transparent_0)] [background-size:32px_32px]" />
      </div>

      <header className="border-b border-border/40 bg-background/60 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-2 rounded-lg shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">Campus Portal</span>
          </div>
          <Link href="/superadmin" title="Superadmin Portal" data-testid="link-superadmin">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
              <Shield className="w-5 h-5" />
              <span className="sr-only">Superadmin Portal</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-24 pb-16 px-4">
        {/* HERO */}
        <section className="max-w-5xl mx-auto w-full text-center space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            One platform. Every academic workflow.
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-foreground leading-[1.05]">
            Academic operations,
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent italic">
              simplified.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A unified console where students form groups, faculty mentor projects, and administrators
            orchestrate the entire department — all in one beautiful place.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/login/student">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#roles">
              <Button size="lg" variant="outline" className="gap-2 backdrop-blur-sm">
                Choose Your Role
              </Button>
            </a>
          </div>
        </section>

        {/* ROLE CARDS */}
        <section id="roles" className="max-w-6xl mx-auto w-full mb-24">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Pick how you sign in</h2>
            <p className="text-muted-foreground">Three doors, one campus.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {roleCards.map((card, idx) => (
              <Link key={card.role} href={`/login/${card.role}`} className="group">
                <div
                  className="relative overflow-hidden bg-card border border-border rounded-2xl p-8 h-full transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-primary/30 animate-in fade-in slide-in-from-bottom-6"
                  style={{ animationDelay: `${idx * 120}ms`, animationFillMode: "backwards" }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative flex flex-col items-start text-left h-full">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${card.pill} mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                      <card.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-2">{card.title}</h3>
                    <p className="text-muted-foreground text-sm flex-1 mb-8 leading-relaxed">{card.desc}</p>
                    <div className="w-full flex items-center justify-between text-primary font-semibold text-sm pt-4 border-t border-border/50 group-hover:border-primary/30 transition-colors">
                      <span>{card.cta}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FEATURE STRIP */}
        <section className="max-w-6xl mx-auto w-full mb-12">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Everything an academic team needs</h2>
            <p className="text-muted-foreground">Built for clarity, performance, and zero friction.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, idx) => (
              <div
                key={f.title}
                className="group bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 hover:border-primary/30 hover:bg-card transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "backwards" }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold mb-1.5">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-background/60 backdrop-blur-sm py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span>Campus Portal · Built for modern academic teams</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Crafted with care</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
