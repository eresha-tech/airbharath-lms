"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  Settings, 
  LogOut,
  GraduationCap,
  Sparkles,
  Newspaper,
  Menu,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const studentMenuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "Certificates", href: "/dashboard/certificates", icon: Award },
  { name: "Student Feed", href: "/dashboard/feed", icon: Newspaper },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function StudentLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const router = useRouter();

  // Hide the global student sidebar inside the lesson player view
  const isLessonView = pathname.includes("/lessons/");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  if (isLessonView) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-muted/20 flex-col md:flex-row">
      {/* Mobile Top Header (only visible on mobile/tablet) */}
      <div className="flex md:hidden items-center justify-between px-6 h-16 bg-card border-b border-border sticky top-0 z-40 w-full shrink-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground" onClick={closeSidebar}>
          <GraduationCap className="h-6 w-6 text-primary" />
          <span>IRII</span>
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 text-muted-foreground hover:text-foreground focus:outline-none"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={closeSidebar} 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar - responsive container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col h-screen transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground" onClick={closeSidebar}>
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>IRII</span>
          </Link>
          <button onClick={closeSidebar} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Welcome message */}
        <div className="p-4 mx-4 my-4 bg-muted/50 rounded-xl border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Welcome Back</p>
          <h4 className="font-bold text-sm text-foreground">Continue Learning</h4>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {studentMenuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card / Logout */}
        <div className="p-4 border-t border-border space-y-4">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center space-y-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground">Placement Hub Access</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">Finish 100% to qualify for placements.</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-0 md:pl-64 flex-1 flex flex-col min-h-screen w-full">
        {/* Navigation header matching mock */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar">
            <Link href="/dashboard" className="text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground shrink-0">
              Dashboard
            </Link>
            <Link href="/search/courses" className="text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground shrink-0">
              Curriculum
            </Link>
            <Link href="/dashboard/jobs" className="text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground shrink-0">
              Job Board
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
