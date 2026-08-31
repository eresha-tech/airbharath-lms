"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CreditCard, 
  BarChart3, 
  Tag, 
  Briefcase, 
  Rss, 
  LogOut,
  GraduationCap,
  Menu,
  X,
  MessageSquare
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const menuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Course Management", href: "/admin/courses", icon: BookOpen },
  { name: "Student Doubts", href: "/admin/doubts", icon: MessageSquare },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Orders", href: "/admin/orders", icon: CreditCard },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Coupons", href: "/admin/coupons", icon: Tag },
  { name: "Job Board", href: "/admin/jobs", icon: Briefcase },
  { name: "Activity Feed", href: "/admin/feed", icon: Rss },
];

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="flex md:hidden items-center justify-between px-6 h-16 bg-card border-b border-border sticky top-0 z-40 w-full">
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

      {/* Sidebar Aside Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col h-screen transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground" onClick={closeSidebar}>
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>IRII</span>
          </Link>
          <button onClick={closeSidebar} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Admin Portal Welcome */}
        <div className="p-4 mx-4 my-4 bg-muted/50 rounded-xl border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Welcome Back</p>
          <h4 className="font-bold text-sm text-foreground">Admin Portal</h4>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
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

        {/* Logout / Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
