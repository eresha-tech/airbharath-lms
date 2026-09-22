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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { calculateCourseProgress } from "@/lib/courseProgress";

interface Lesson {
  id: string;
  title: string;
  isFreePreview?: boolean;
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

  const progress = calculateCourseProgress(
    course.modules as unknown as Module[],
    completedLessons
  );

  const totalLessons = course.modules?.reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  ) || 0;

  const completedCount = completedLessons.length;

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
          <p className="text-[11px] text-muted-foreground">
            {completedCount} of {totalLessons} lessons completed
          </p>
        </div>
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
              const moduleCompletedCount =
                module.lessons?.filter((l) => completedLessons.includes(l.id)).length || 0;
              const moduleTotalCount = module.lessons?.length || 0;
              const isModuleComplete =
                moduleTotalCount > 0 && moduleCompletedCount === moduleTotalCount;

              return (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="border border-sidebar-border rounded-xl overflow-hidden bg-sidebar-accent/20 data-[state=open]:bg-sidebar-accent/40 transition-colors"
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
                        <p className="text-xs font-bold text-foreground font-outfit leading-snug break-words">
                          {module.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                          <span>
                            {moduleCompletedCount}/{moduleTotalCount} completed
                          </span>
                          {isModuleComplete && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓ Done
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
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground"
                            )}
                          >
                            {/* Completion Status Icon */}
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
                              ) : isActive ? (
                                <Play className="h-3.5 w-3.5 fill-current text-primary-foreground" />
                              ) : (
                                <PlayCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>

                            <span
                              className={cn(
                                "flex-1 min-w-0 leading-snug break-words",
                                isCompleted && !isActive && "text-muted-foreground/90 font-medium"
                              )}
                            >
                              {lesson.title}
                            </span>

                            {lesson.isFreePreview && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded mt-0.5">
                                Preview
                              </span>
                            )}
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

      {/* Verified Certificate Unlock Footer */}
      {progress === 100 && (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Certificate Unlocked!
              </span>
            </div>
            <Link
              href="/dashboard/certificates"
              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 underline hover:no-underline"
            >
              View
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
