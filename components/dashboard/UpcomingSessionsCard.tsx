import Link from "next/link";
import { Radio, CalendarClock, ExternalLink, Video, Lock, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatISTDateTime } from "@/lib/lesson-availability";

export interface UpcomingLiveSessionItem {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  meetingUrl: string | null;
}

export interface UpcomingContentItem {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  releaseAt: Date;
}

interface UpcomingSessionsCardProps {
  liveSessions?: UpcomingLiveSessionItem[];
  upcomingContent?: UpcomingContentItem[];
  /** Legacy support for backwards compatibility */
  sessions?: UpcomingLiveSessionItem[];
}

export function UpcomingSessionsCard({
  liveSessions,
  upcomingContent = [],
  sessions,
}: UpcomingSessionsCardProps) {
  const activeLiveSessions = liveSessions || sessions || [];
  const hasLive = activeLiveSessions.length > 0;
  const hasContent = upcomingContent.length > 0;

  if (!hasLive && !hasContent) return null;

  return (
    <div className="space-y-4">
      {/* 1. Upcoming Live Sessions */}
      {hasLive && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit">
                    Upcoming Live Sessions
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scheduled live classes &amp; workshops
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {activeLiveSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="p-3.5 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between gap-3 hover:bg-muted/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-foreground truncate">
                    {session.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {session.courseTitle}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <CalendarClock className="h-3 w-3 text-primary" />
                      {formatISTDateTime(session.scheduledAt, { shortDate: true })}
                    </span>
                    {session.durationMinutes && (
                      <span>• {session.durationMinutes} mins</span>
                    )}
                  </div>
                </div>

                {session.meetingUrl ? (
                  <Button
                    asChild
                    size="sm"
                    className="h-8 text-xs font-semibold px-3 shrink-0 rounded-lg gap-1.5 shadow-xs"
                  >
                    <a
                      href={session.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Join</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold px-2.5 shrink-0 rounded-lg"
                  >
                    <Link href={`/dashboard/courses/${session.courseId}/lessons/${session.id}`}>
                      <span>View</span>
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Upcoming Course Content (Scheduled Releases) */}
      {hasContent && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit">
                    Upcoming Course Content
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    SCHEDULED
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Recorded modules releasing soon
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {upcomingContent.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between gap-3 hover:bg-muted/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-foreground truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {item.courseTitle}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Releases {formatISTDateTime(item.releaseAt, { shortDate: true })}
                    </span>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold px-2.5 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Link href={`/dashboard/courses/${item.courseId}/lessons/${item.id}`}>
                    <Lock className="h-3 w-3 mr-1" />
                    <span>Locked</span>
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
