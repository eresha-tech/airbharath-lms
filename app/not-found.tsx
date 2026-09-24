import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Compass,
  ArrowRight,
  BookOpen,
  LayoutDashboard,
  Home,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "404 - Page Not Found | AirBharath LMS",
  description: "The page you are looking for does not exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20">
      {/* Header Bar */}
      <header className="border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-outfit font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform">
              AB
            </div>
            <span className="font-outfit font-bold text-lg text-foreground tracking-tight">
              AirBharath <span className="text-primary">LMS</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-semibold">
              <Link href="/courses">Courses</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl text-xs font-bold shadow-xs">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main 404 Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
          {/* Badge & Graphic */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>404 · Page Not Found</span>
            </div>

            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-3xl rotate-6 animate-pulse" />
              <div className="relative w-full h-full bg-card border border-border/80 rounded-3xl flex items-center justify-center shadow-md">
                <Compass className="h-12 w-12 sm:h-14 sm:w-14 text-primary stroke-[1.75]" />
              </div>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black font-outfit text-foreground tracking-tight leading-tight">
              Lost in the Curriculum?
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find the page or lecture you were searching for. It might have been moved, renamed, or is temporarily unavailable.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto font-bold text-xs sm:text-sm rounded-xl h-11 px-6 shadow-sm gap-2 cursor-pointer"
            >
              <Link href="/courses">
                <BookOpen className="h-4 w-4" />
                <span>Explore Courses</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto font-semibold text-xs sm:text-sm rounded-xl h-11 px-6 border-border/80 hover:bg-muted/60 gap-2 cursor-pointer"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>My Dashboard</span>
              </Link>
            </Button>
          </div>

          {/* Helpful Navigation Cards */}
          <div className="pt-6 border-t border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Popular Destinations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <Link
                href="/"
                className="p-3.5 bg-card/60 hover:bg-card border border-border/60 hover:border-primary/40 rounded-2xl transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Home Page
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Start from the beginning</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/courses"
                className="p-3.5 bg-card/60 hover:bg-card border border-border/60 hover:border-primary/40 rounded-2xl transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Course Catalog
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Browse all skill programs</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/verify-certificate"
                className="p-3.5 bg-card/60 hover:bg-card border border-border/60 hover:border-primary/40 rounded-2xl transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Verification
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Verify certificates</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} AirBharath LMS. All rights reserved.</p>
      </footer>
    </div>
  );
}
