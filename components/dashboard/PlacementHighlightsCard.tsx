import Link from "next/link";
import { Briefcase, Newspaper, ArrowRight, Sparkles, MapPin, Building, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PlacementJobItem {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  link?: string | null;
  createdAt: string | Date;
}

interface PlacementHighlightsCardProps {
  jobs?: PlacementJobItem[];
}

export function PlacementHighlightsCard({ jobs = [] }: PlacementHighlightsCardProps) {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit">
              Placement & Career Hub
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Aviation & technical opportunities
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/jobs"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Real Jobs List if Available */}
      {jobs.length > 0 ? (
        <div className="space-y-2.5">
          {jobs.slice(0, 3).map((job) => (
            <div
              key={job.id}
              className="p-3 bg-muted/30 border border-border/60 rounded-xl space-y-1.5 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-xs text-foreground line-clamp-1">
                  {job.title}
                </h4>
                {job.location && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 font-medium">
                    {job.location}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1 truncate font-medium">
                  <Building className="h-3 w-3 shrink-0 text-primary/70" />
                  <span className="truncate">{job.company}</span>
                </div>

                <Link
                  href="/dashboard/jobs"
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <span>Apply</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 bg-sidebar-accent/50 border border-sidebar-border rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Industry Placement Support</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Students with completed course progress qualify for direct recruitment drives and aviation partner interviews.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs font-semibold rounded-xl border-border/80 text-foreground hover:bg-muted"
        >
          <Link href="/dashboard/jobs" className="flex items-center justify-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span>Job Board</span>
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs font-semibold rounded-xl border-border/80 text-foreground hover:bg-muted"
        >
          <Link href="/dashboard/feed" className="flex items-center justify-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 text-primary" />
            <span>Notice Feed</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
