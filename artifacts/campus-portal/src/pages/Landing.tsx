import { Link } from "wouter";
import { GraduationCap, Users, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">Campus Portal</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center pt-16 px-4">
        <div className="max-w-3xl w-full space-y-12 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-foreground">
              Academic operations,<br/>
              <span className="text-primary italic">simplified.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A unified platform for students to manage groups, faculty to mentor projects, and administrators to orchestrate the entire department.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            <Link href="/login/student" className="group">
              <div className="bg-card hover:bg-accent/30 border border-border rounded-xl p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Student</h3>
                <p className="text-muted-foreground text-sm flex-1 mb-6">Form groups, track attendance, and monitor performance.</p>
                <Button className="w-full mt-auto" variant="outline">Student Login</Button>
              </div>
            </Link>

            <Link href="/login/faculty" className="group">
              <div className="bg-card hover:bg-accent/30 border border-border rounded-xl p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Faculty</h3>
                <p className="text-muted-foreground text-sm flex-1 mb-6">Mentor groups, record attendance, and manage domains.</p>
                <Button className="w-full mt-auto" variant="outline">Faculty Login</Button>
              </div>
            </Link>

            <Link href="/login/admin" className="group">
              <div className="bg-card hover:bg-accent/30 border border-border rounded-xl p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Administrator</h3>
                <p className="text-muted-foreground text-sm flex-1 mb-6">Sync rosters, manage security, and oversee the college.</p>
                <Button className="w-full mt-auto" variant="outline">Admin Login</Button>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
