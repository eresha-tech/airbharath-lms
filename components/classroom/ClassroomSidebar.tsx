"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Play,
  PlayCircle,
  Award,
  PanelLeftClose,
  Radio,
  Lock,
  Sparkles,
  CalendarClock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { calculateCourseProgress } from "@/lib/courseProgress";
import { getLessonAvailability, formatCompactIST } from "@/lib/lesson-availability";

interface Lesson {
  id: string;
  title: string;
  isFreePreview?: boolean;
  deliveryType?: string | null;
  scheduledAt?: string | Date | null;
  releaseAt?: string | Date | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug?: string;
  modules: Module[];
}

interface ClassroomSidebarProps {
  course: Course;
  completedLessons?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ClassroomSidebar({
  course,
  completedLessons = [],
  isCollapsed = false,
  onToggleCollapse,
}: ClassroomSidebarProps) {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [showRoadmapList, setShowRoadmapList] = useState(false);

  // Automatically expand the module containing the active lesson
  useEffect(() => {
    if (pathname && course?.modules) {
      const currentModuleId = course.modules.find((module) =>
        module.lessons?.some(
          (lesson) =>
            pathname ===
            `/dashboard/courses/${course.id}/lessons/${lesson.id}`
        )
      )?.id;

      if (currentModuleId && !openModules.includes(currentModuleId)) {
        setOpenModules((prev) => [...prev, currentModuleId]);
      }
    }
  }, [pathname, course, openModules]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!course || !isMounted) {
    return null;
  }

  const now = new Date();

  const progress = calculateCourseProgress(
    course.modules as unknown as Module[],
    completedLessons
  );

  const totalLessons = course.modules?.reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  ) || 0;

  const completedCount = completedLessons.length;

  // Flatten and categorize all lessons for roadmap & what's next detection
  const allLessonsWithAvailability = (course.modules || []).flatMap((mod, mIdx) =>
    (mod.lessons || []).map((l, lIdx) => {
      const availability = getLessonAvailability(l, now);
      const isCompleted = completedLessons.includes(l.id);
      const targetDate = availability.state === "live" ? availability.scheduledAt : availability.releaseAt;
      return {
        ...l,
        moduleId: mod.id,
        moduleTitle: mod.title,
        moduleIndex: mIdx,
        lessonIndex: lIdx,
        availability,
        isCompleted,
        targetDate,
      };
    })
  );

  // Filter upcoming unreleased lessons (both scheduled recorded & future live)
  const upcomingLessons = allLessonsWithAvailability
    .filter(
      (l) =>
        !l.isCompleted &&
        (l.availability.isLocked ||
          (l.availability.state === "live" &&
            l.availability.scheduledAt &&
            l.availability.scheduledAt.getTime() > now.getTime()))
    )
    .sort((a, b) => {
      const timeA = a.targetDate ? a.targetDate.getTime() : Infinity;
      const timeB = b.targetDate ? b.targetDate.getTime() : Infinity;
      return timeA - timeB;
    });

  const nextUpcoming = upcomingLessons[0] || null;

  const SidebarBody = ({ isDrawer = false }: { isDrawer?: boolean }) => (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground select-none font-sans">
      {/* Sidebar Header with Back Link & Progress */}
      <div className={cn("border-b border-sidebar-border shrink-0", isDrawer ? "p-5 pt-9 space-y-4" : "p-4 lg:p-5 space-y-4")}>
        <div className={cn("flex items-center justify-between", isDrawer ? "pr-8" : "")}>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to My Courses</span>
          </Link>

          {!isDrawer && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors cursor-pointer"
              title="Collapse course navigation"
              aria-label="Collapse course navigation"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-base font-outfit text-foreground leading-snug line-clamp-2">
            {course.title}
          </h1>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-1">
            <span>Course Progress</span>
            <span className="text-foreground font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-sidebar-border" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {completedCount} of {totalLessons} completed
            </span>
            {upcomingLessons.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {upcomingLessons.length} upcoming
              </span>
            )}
          </div>
        </div>

        {/* Contextual "WHAT'S NEXT" Card (Only if there are upcoming unreleased items) */}
        {nextUpcoming && (
          <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                {nextUpcoming.availability.state === "live" ? "Next Live Session" : "What's Next"}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                {nextUpcoming.availability.state === "live" ? "Live" : "Scheduled"}
              </span>
            </div>
            <Link
              href={`/dashboard/courses/${course.id}/lessons/${nextUpcoming.id}`}
              onClick={close}
              className="block group cursor-pointer"
            >
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {nextUpcoming.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
                {nextUpcoming.availability.state === "live" ? (
                  <Radio className="h-2.5 w-2.5 text-rose-500 animate-pulse shrink-0" />
                ) : (
                  <Lock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span className="truncate">
                  {nextUpcoming.availability.state === "live"
                    ? nextUpcoming.scheduledAt
                      ? formatCompactIST(nextUpcoming.scheduledAt)
                      : "To be announced"
                    : `Releases ${formatCompactIST(nextUpcoming.availability.releaseAt!)}`}
                </span>
              </p>
            </Link>
          </div>
        )}

        {/* Compact Upcoming Roadmap Dropdown/Toggle (if 2 or more upcoming lessons) */}
        {upcomingLessons.length > 1 && (
          <div className="border border-sidebar-border/80 rounded-xl overflow-hidden bg-sidebar-accent/15">
            <button
              onClick={() => setShowRoadmapList((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-expanded={showRoadmapList}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                <span>Upcoming Roadmap ({upcomingLessons.length})</span>
              </span>
              {showRoadmapList ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showRoadmapList && (
              <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-sidebar-border/60">
                {upcomingLessons.slice(0, 5).map((item, idx) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/courses/${course.id}/lessons/${item.id}`}
                    onClick={close}
                    className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors group cursor-pointer"
                  >
                    <span className="text-[10px] font-mono font-bold text-muted-foreground mt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {item.availability.state === "live" ? (
                          <Radio className="h-2.5 w-2.5 text-rose-500 animate-pulse shrink-0" />
                        ) : (
                          <Lock className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                        )}
                        <span className="truncate">
                          {item.targetDate ? formatCompactIST(item.targetDate) : "Scheduled"}
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Curriculum Module Accordion */}
      <ScrollArea className="flex-1">
        <div className="p-3 lg:p-4">
          <Accordion
            type="multiple"
            className="w-full space-y-3"
            value={openModules}
            onValueChange={setOpenModules}
          >
            {course.modules?.map((module, moduleIndex) => {
              const moduleLessons = module.lessons || [];
              const moduleTotalCount = moduleLessons.length;
              const moduleCompletedCount =
                moduleLessons.filter((l) => completedLessons.includes(l.id)).length;
              const isModuleComplete =
                moduleTotalCount > 0 && moduleCompletedCount === moduleTotalCount;

              // Module upcoming analysis
              const uncompletedLessons = moduleLessons.filter(
                (l) => !completedLessons.includes(l.id)
              );
              const hasAvailableUncompleted = uncompletedLessons.some((l) => {
                const av = getLessonAvailability(l, now);
                return av.isAccessible && av.state !== "live";
              });
              const isUpcomingModule =
                moduleTotalCount > 0 &&
                !isModuleComplete &&
                !hasAvailableUncompleted &&
                uncompletedLessons.length > 0;

              const firstModuleReleaseDate = uncompletedLessons
                .map((l) => {
                  const av = getLessonAvailability(l, now);
                  return av.releaseAt || av.scheduledAt;
                })
                .filter(Boolean)
                .sort((a, b) => a!.getTime() - b!.getTime())[0] || null;

              return (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className={cn(
                    "border rounded-xl overflow-hidden transition-colors",
                    isUpcomingModule
                      ? "border-amber-500/20 bg-amber-500/[0.03] data-[state=open]:bg-amber-500/[0.06]"
                      : "border-sidebar-border bg-sidebar-accent/20 data-[state=open]:bg-sidebar-accent/40"
                  )}
                >
                  <AccordionTrigger
                    className="px-3.5 py-3 hover:no-underline text-left cursor-pointer"
                    aria-label={`Module ${moduleIndex + 1}: ${module.title}`}
                  >
                    <div className="flex items-start gap-2.5 w-full pr-2">
                      <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                        {String(moduleIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-foreground font-outfit leading-snug break-words">
                            {module.title}
                          </p>
                          {isUpcomingModule && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 rounded uppercase tracking-wider shrink-0">
                              Upcoming Module
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                          <span>
                            {moduleCompletedCount}/{moduleTotalCount} completed
                          </span>
                          {isModuleComplete && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓ Done
                            </span>
                          )}
                          {isUpcomingModule && firstModuleReleaseDate && (
                            <span className="text-amber-700/80 dark:text-amber-400/80 font-medium">
                              First lecture releases {formatCompactIST(firstModuleReleaseDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pt-1 pb-2 px-1">
                    <div className="space-y-1">
                      {module.lessons?.map((lesson) => {
                        const isActive =
                          pathname ===
                          `/dashboard/courses/${course.id}/lessons/${lesson.id}`;
                        const isCompleted = completedLessons.includes(lesson.id);
                        const availability = getLessonAvailability(lesson, now);
                        const isScheduledRecorded = availability.isLocked;
                        const isLive = availability.state === "live";

                        return (
                          <Link
                            key={lesson.id}
                            href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                            onClick={close}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative group cursor-pointer",
                              isActive
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : isCompleted
                                ? "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                                : isScheduledRecorded
                                ? "text-sidebar-foreground/90 hover:bg-amber-500/10 hover:text-foreground"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground"
                            )}
                          >
                            {/* Completion / Availability Status Icon */}
                            <div className="shrink-0 mt-0.5">
                              {isCompleted ? (
                                <CheckCircle2
                                  className={cn(
                                    "h-4 w-4",
                                    isActive
                                      ? "text-primary-foreground"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  )}
                                />
                              ) : isScheduledRecorded ? (
                                <Lock
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isActive
                                      ? "text-primary-foreground"
                                      : "text-amber-600 dark:text-amber-400"
                                  )}
                                />
                              ) : isLive ? (
                                <Radio
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isActive
                                      ? "text-primary-foreground"
                                      : "text-rose-500 animate-pulse"
                                  )}
                                />
                              ) : isActive ? (
                                <Play className="h-3.5 w-3.5 fill-current text-primary-foreground" />
                              ) : (
                                <PlayCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <span
                                  className={cn(
                                    "leading-snug break-words",
                                    isCompleted && !isActive && "text-muted-foreground/90 font-medium"
                                  )}
                                >
                                  {lesson.title}
                                </span>

                                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                  {lesson.isFreePreview && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">
                                      Preview
                                    </span>
                                  )}
                                  {isLive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded inline-flex items-center gap-0.5">
                                      Live
                                    </span>
                                  )}
                                  {isScheduledRecorded && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded">
                                      Scheduled
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Compact Schedule/Release Timestamp */}
                              {isScheduledRecorded && availability.releaseAt && (
                                <p
                                  className={cn(
                                    "text-[10px] mt-0.5 font-medium",
                                    isActive
                                      ? "text-primary-foreground/80"
                                      : "text-amber-700/90 dark:text-amber-400/90"
                                  )}
                                >
                                  Releases {formatCompactIST(availability.releaseAt)}
                                </p>
                              )}
                              {isLive && lesson.scheduledAt && (
                                <p
                                  className={cn(
                                    "text-[10px] mt-0.5 font-medium",
                                    isActive
                                      ? "text-primary-foreground/80"
                                      : "text-rose-600/90 dark:text-rose-400/90"
                                  )}
                                >
                                  {formatCompactIST(lesson.scheduledAt)}
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </ScrollArea>

      {/* Course Completion & Credential Center Footer */}
      {progress === 100 && (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Curriculum Complete!
              </span>
            </div>
            <Link
              href="/dashboard/certificates"
              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 underline hover:no-underline"
            >
              Credentials
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Action Bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-background/95 backdrop-blur-md border-b border-border shadow-xs font-sans">
        <Link
          href="/dashboard/courses"
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>My Courses</span>
        </Link>

        <Button
          onClick={toggle}
          variant="outline"
          size="sm"
          className="text-xs font-bold border-primary/20 text-primary hover:bg-primary/10 h-8 gap-1.5 rounded-xl cursor-pointer"
          aria-label="Open Course Modules"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Modules ({progress}%)</span>
        </Button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden lg:block w-88 xl:w-96 border-r border-sidebar-border bg-sidebar shadow-xs transition-transform duration-300 ease-in-out",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <SidebarBody />
      </aside>

      {/* Mobile Sheet Drawer */}
      <Sheet open={isOpen} onOpenChange={toggle}>
        <SheetContent side="left" className="w-80 p-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
          <SheetHeader className="sr-only">
            <SheetTitle>Course Curriculum</SheetTitle>
          </SheetHeader>
          <SidebarBody isDrawer />
        </SheetContent>
      </Sheet>
    </>
  );
}
