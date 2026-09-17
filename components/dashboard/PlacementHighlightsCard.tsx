import Link from "next/link";
import { Briefcase, Newspaper, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlacementHighlightsCard() {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit">
            Placement & Career Hub
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Aviation and engineering opportunities
          </p>
        </div>
      </div>

      <div className="p-3.5 bg-sidebar-accent/50 border border-sidebar-border rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Industry Placement Support</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Students with complete course progress qualify for direct recruitment drives and industry partner interviews.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          asChild
          variant="outline"
          className="h-8 text-xs font-semibold rounded-xl border-border text-foreground hover:bg-muted"
        >
          <Link href="/dashboard/jobs" className="flex items-center justify-center gap-1">
            <Briefcase className="h-3 w-3 text-primary" />
            <span>Job Board</span>
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-8 text-xs font-semibold rounded-xl border-border text-foreground hover:bg-muted"
        >
          <Link href="/dashboard/feed" className="flex items-center justify-center gap-1">
            <Newspaper className="h-3 w-3 text-primary" />
            <span>Notice Feed</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
