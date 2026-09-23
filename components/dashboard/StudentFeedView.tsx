"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Megaphone,
  Share2,
  Check,
  Calendar,
  Sparkles,
  BookOpen,
  Briefcase,
  Award,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Compass,
  Play,
  Layers,
  Maximize2,
  X,
  MapPin,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { track } from "@/lib/analytics";

export interface FeedPostItem {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string | Date;
  author?: {
    id?: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
  } | null;
}

export interface SidebarCourseItem {
  id: string;
  title: string;
  percent: number;
  totalLessons: number;
  completedLessons: number;
  resumeLessonId?: string | null;
}

export interface SidebarJobItem {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  createdAt: string | Date;
}

export interface StudentFeedViewProps {
  posts: FeedPostItem[];
  activeCourse?: SidebarCourseItem | null;
  recentJobs?: SidebarJobItem[];
  certificatesCount?: number;
}

export function StudentFeedView({
  posts,
  activeCourse,
  recentJobs = [],
  certificatesCount = 0,
}: StudentFeedViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
      }
    };
    if (lightboxImage) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [lightboxImage]);

  const handleOpenImage = (postId: string, imageUrl: string, alt: string) => {
    track("feed_item_opened", { feed_id: postId });
    setLightboxImage({ url: imageUrl, alt });
  };

  const handleShare = (postId: string, content: string) => {
    track("feed_item_opened", { feed_id: postId });
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator
        .share({
          title: "AirBharath Community Announcement",
          text: content.slice(0, 120) + (content.length > 120 ? "..." : ""),
          url,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(postId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Student Community</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            Activity Notice Board
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Stay informed with verified academy announcements, new masterclass launches, platform updates, and technical learning broadcasts.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Megaphone className="w-3.5 h-3.5 text-primary" />
              <span>{posts.length} {posts.length === 1 ? "Broadcast" : "Broadcasts"}</span>
            </span>
            {activeCourse && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Active Track: {activeCourse.percent}%</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-success" />
              <span>{certificatesCount} {certificatesCount === 1 ? "Credential Earned" : "Credentials Earned"}</span>
            </span>
          </div>
        </div>

        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-5 rounded-xl text-xs shadow-xs shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Link href="/dashboard/courses" className="flex items-center gap-2">
            <span>My Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {/* Two-Column Grid: Main Feed (2/3) + Real-Data Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          {posts.length === 0 ? (
            /* Empty State */
            <div className="bg-card border border-dashed border-border rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                <Megaphone className="h-7 w-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  The notice board is quiet right now
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  There are no announcements published at the moment. Check back soon for academy updates, new course curriculum drops, and schedule alerts.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs px-5 h-10 shadow-xs cursor-pointer"
                >
                  <Link href="/dashboard/courses">Return to My Learning</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-border rounded-xl text-xs px-5 h-10 font-semibold cursor-pointer"
                >
                  <Link href="/courses">Browse Course Catalog</Link>
                </Button>
              </div>
            </div>
          ) : (
            posts.map((post) => {
              const formattedDate = new Date(post.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              
              // Clean author display name
              const rawAuthorName = post.author?.fullName || "AirBharath Academy Team";
              const authorName = rawAuthorName.replace(/\s*\(Admin\)\s*$/i, "").trim() || rawAuthorName;
              const isAdmin = post.author?.role === "admin" || rawAuthorName.toLowerCase().includes("admin");
              const authorInitials = (authorName.charAt(0) || "A").toUpperCase();

              return (
                <article
                  key={post.id}
                  className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
                >
                  {/* Post Header */}
                  <div className="p-6 sm:p-7 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        {/* Avatar */}
                        {post.author?.avatarUrl ? (
                          <img
                            src={post.author.avatarUrl}
                            alt={authorName}
                            className="h-11 w-11 rounded-2xl object-cover border border-border/60 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div
                          className={`h-11 w-11 rounded-2xl bg-primary/10 text-primary font-bold font-outfit text-base items-center justify-center border border-primary/20 shrink-0 ${
                            post.author?.avatarUrl ? "hidden" : "flex"
                          }`}
                        >
                          {authorInitials}
                        </div>

                        {/* Author Meta */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm sm:text-base font-outfit text-foreground">
                              {authorName}
                            </h3>
                            {isAdmin && (
                              <Badge className="bg-primary text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 shadow-2xs flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Official Broadcast</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            <span>{formattedDate}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans break-words">
                      {post.content}
                    </div>

                    {/* Image Attachment if available */}
                    {post.imageUrl && (
                      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/30 group">
                        <img
                          src={post.imageUrl}
                          alt={`Attachment for announcement by ${authorName}`}
                          className="w-full h-auto max-h-[440px] object-cover rounded-2xl transition-transform duration-200 group-hover:scale-[1.01]"
                          onError={(e) => {
                            (e.currentTarget.parentElement as HTMLElement)?.classList.add("hidden");
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenImage(
                              post.id,
                              post.imageUrl!,
                              `Attachment for announcement by ${authorName}`
                            )
                          }
                          className="absolute bottom-3 right-3 px-3 py-1.5 bg-background/90 hover:bg-background text-foreground backdrop-blur-xs rounded-xl text-xs font-bold border border-border/80 shadow-xs flex items-center gap-1.5 transition-all opacity-90 hover:opacity-100 cursor-pointer"
                          title="Expand image"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Expand</span>
                        </button>
                      </div>
                    )}

                    {/* Post Action Footer */}
                    <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Megaphone className="w-3.5 h-3.5 text-primary" />
                        <span>AirBharath Verified Notice</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleShare(post.id, post.content)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors cursor-pointer"
                        title="Share this announcement link"
                      >
                        {copiedId === post.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Link Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Sticky Desktop Side Rail */}
        <div className="space-y-6">
          {/* Section 1: Active In-Progress Course Card */}
          {activeCourse && (
            <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                  Active Learning
                </span>
                <span className="text-xs font-bold text-foreground">
                  {activeCourse.percent}%
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-sm text-foreground font-outfit line-clamp-2">
                  {activeCourse.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {activeCourse.completedLessons} of {activeCourse.totalLessons} lessons completed
                </p>
              </div>

              <Progress value={activeCourse.percent} className="h-2 rounded-full" />

              <Button
                asChild
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 rounded-xl shadow-xs"
              >
                <Link
                  href={
                    activeCourse.resumeLessonId
                      ? `/dashboard/courses/${activeCourse.id}/lessons/${activeCourse.resumeLessonId}`
                      : `/dashboard/courses/${activeCourse.id}`
                  }
                  className="flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Learning</span>
                </Link>
              </Button>
            </div>
          )}

          {/* Section 2: Recent Job Opportunities Card */}
          {recentJobs.length > 0 && (
            <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  <span>Latest Openings</span>
                </h4>
                <Link
                  href="/dashboard/jobs"
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentJobs.slice(0, 3).map((job) => (
                  <Link
                    key={job.id}
                    href="/dashboard/jobs"
                    onClick={() =>
                      track("job_opened", {
                        job_id: job.id,
                        title: job.title,
                        company: job.company,
                      })
                    }
                    className="block p-3.5 bg-muted/40 border border-border/60 rounded-2xl hover:bg-muted/70 transition-colors space-y-1.5 group"
                  >
                    <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground/80 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{job.company}</span>
                      </span>
                      {job.location && (
                        <span className="truncate flex items-center gap-1 shrink-0 text-[10px]">
                          <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                          <span>{job.location}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <Button
                asChild
                variant="outline"
                className="w-full border-border text-foreground hover:text-primary hover:bg-muted text-xs font-semibold h-10 rounded-xl"
              >
                <Link href="/dashboard/jobs" className="flex items-center justify-center gap-1.5">
                  <span>Explore Placement Hub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* Section 3: Academy Quick Links */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <h4 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" />
              <span>Student Resources</span>
            </h4>

            <div className="space-y-1.5 text-xs">
              <Link
                href="/dashboard/courses"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-foreground transition-colors font-semibold"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>My Enrolled Courses</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/certificates"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-foreground transition-colors font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Credentials</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/courses"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-foreground transition-colors font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-primary" />
                  <span>Course Catalog</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 h-9 w-9 bg-background/90 hover:bg-background text-foreground rounded-full flex items-center justify-center shadow-lg z-10 transition-colors cursor-pointer"
              aria-label="Close full size image"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.alt}
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
