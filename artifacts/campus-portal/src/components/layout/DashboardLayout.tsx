import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  GraduationCap, 
  LogOut, 
  Menu,
  Settings,
  Users,
  Bell,
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Mail,
  Shield,
  Database
} from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const getNavItems = (role?: string | null): NavItem[] => {
  switch (role) {
    case "student":
      return [
        { title: "Dashboard", href: "/student", icon: LayoutDashboard },
        { title: "My Group", href: "/student/group", icon: Users },
        { title: "Attendance", href: "/student/attendance", icon: CheckSquare },
        { title: "Performance", href: "/student/performance", icon: BarChart3 },
        { title: "Notifications", href: "/student/notifications", icon: Bell },
      ];
    case "faculty":
      return [
        { title: "Dashboard", href: "/faculty", icon: LayoutDashboard },
        { title: "My Groups", href: "/faculty/groups", icon: Users },
        { title: "Domains", href: "/faculty/domains", icon: Database },
        { title: "Attendance", href: "/faculty/attendance", icon: CheckSquare },
        { title: "Performance", href: "/faculty/performance", icon: BarChart3 },
        { title: "Email", href: "/faculty/email", icon: Mail },
        { title: "Notifications", href: "/faculty/notifications", icon: Bell },
      ];
    case "admin":
      return [
        { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { title: "Sheets Sync", href: "/admin/sheets", icon: Database },
        { title: "Students", href: "/admin/students", icon: Users },
        { title: "Faculties", href: "/admin/faculties", icon: Users },
        { title: "Groups", href: "/admin/groups", icon: Users },
        { title: "Admins", href: "/admin/admins", icon: Shield },
        { title: "Security", href: "/admin/security", icon: Shield },
      ];
    default:
      return [];
  }
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const navItems = getNavItems(user?.role);
  const settingsHref = user?.role ? `/${user.role}/settings` : "/settings";

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/");
      }
    });
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href || (location.startsWith(item.href + '/') && item.href !== `/${user?.role}`);
        return (
          <Link 
            key={item.href} 
            href={item.href}
            onClick={onClick}
            className={`group/nav flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              isActive
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
            }`}
          >
            {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
            <item.icon className={`w-5 h-5 transition-transform ${isActive ? "text-primary" : "text-muted-foreground group-hover/nav:scale-110"}`} />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gradient-to-br from-muted/40 via-background to-accent/20 relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-50 bg-[radial-gradient(circle_at_1px_1px,_hsl(var(--foreground)/0.04)_1px,_transparent_0)] [background-size:32px_32px]" />
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 border-b bg-card/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-1.5 rounded-md shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-serif font-bold text-lg">Campus Portal</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground p-1 rounded-md">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="font-serif font-bold text-lg">Campus Portal</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <NavLinks />
              </div>
              <div className="p-4 border-t bg-muted/50 space-y-2">
                <Link href={settingsHref} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
                <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-3" onClick={handleLogout}>
                  <LogOut className="w-5 h-5" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/80 backdrop-blur-md h-screen sticky top-0 shadow-sm">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-2 rounded-lg shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight">Campus Portal</span>
          </Link>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 px-3 py-3 bg-gradient-to-br from-primary/5 to-accent/30 rounded-xl border border-border/60">
            <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <NavLinks />
        </div>
        
        <div className="p-4 border-t space-y-1">
          <Link href={settingsHref} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === settingsHref ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-3 py-2 h-auto font-medium" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
