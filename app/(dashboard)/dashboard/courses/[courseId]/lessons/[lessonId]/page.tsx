import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessons, enrollments, courses, lessonMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { LessonCompleteButton } from "@/components/LessonCompleteButton";
import { LessonComments } from "@/components/LessonComments";
import { LessonNavigation } from "@/components/classroom/LessonNavigation";
import { HlsPlayer } from "@/components/video-player/HlsPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Image as ImageIcon,
  Paperclip,
  MessageSquare,
  BookOpen,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface LessonPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;
  const session = await getSession();

  if (!session) return redirect("/login");

  const [lessonObj, materialsList] = await Promise.all([
    db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) }),
    db.query.lessonMaterials.findMany({ where: eq(lessonMaterials.lessonId, lessonId) }),
  ]);

  if (!lessonObj) {
    return redirect(`/dashboard/courses/${courseId}`);
  }

  const isUUID = UUID_REGEX.test(courseId);

  // Retrieve course data to determine previous/next lessons and module context
  const courseObj = isUUID
    ? await db.query.courses.findFirst({
        where: eq(courses.id, courseId),
        with: {
          modules: {
            with: {
              lessons: true,
            },
          },
        },
      })
    : await db.query.courses.findFirst({
        where: eq(courses.slug, courseId),
        with: {
          modules: {
            with: {
              lessons: true,
            },
          },
        },
      });

  if (!courseObj) {
    return redirect("/dashboard/courses");
  }

  // Check enrollment unless free preview or admin
  let isEnrolled = lessonObj.isFreePreview || session.role === "admin";

  if (!isEnrolled) {
    const enrollmentRecord = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, courseObj.id)),
    });
    if (enrollmentRecord) {
      isEnrolled = true;
    }
  }

  if (!isEnrolled) {
    return redirect(`/courses/${courseObj.slug || courseObj.id}`);
  }

  // Flatten and sort all lessons to calculate sequential navigation
  const courseModules = (courseObj.modules as any[]) || [];
  const sortedModules = courseModules
    .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((mod: any) => ({
      ...mod,
      lessons: (mod.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    }));

  const allLessonsInOrder: { id: string; title: string; moduleId: string; moduleTitle: string }[] = [];
  sortedModules.forEach((m: any) => {
    (m.lessons || []).forEach((l: any) => {
      allLessonsInOrder.push({
        id: l.id,
        title: l.title,
        moduleId: m.id,
        moduleTitle: m.title,
      });
    });
  });

  const currentLessonIdx = allLessonsInOrder.findIndex((l) => l.id === lessonId);
  const previousLesson = currentLessonIdx > 0 ? allLessonsInOrder[currentLessonIdx - 1] : null;
  const nextLesson =
    currentLessonIdx >= 0 && currentLessonIdx < allLessonsInOrder.length - 1
      ? allLessonsInOrder[currentLessonIdx + 1]
      : null;
  const currentLessonInfo = currentLessonIdx >= 0 ? allLessonsInOrder[currentLessonIdx] : null;

  const activeVideoId = lessonObj.videoUrl || lessonObj.id;

  return (
    <div className="min-h-full flex flex-col bg-background font-sans">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 sm:space-y-7 animate-fade-in">
        {/* Top Context & Header Action Bar */}
        <div className="space-y-3 pb-3 border-b border-border/60">
          {/* Breadcrumbs Row */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="truncate max-w-[180px] sm:max-w-[260px] text-muted-foreground hover:text-foreground transition-colors">
              {courseObj.title}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            <span className="text-foreground font-semibold truncate max-w-[180px] sm:max-w-[260px]">
              {currentLessonInfo?.moduleTitle || "Curriculum"}
            </span>
            {currentLessonIdx >= 0 && (
              <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 rounded-md ml-auto sm:ml-1 shrink-0">
                Lesson {currentLessonIdx + 1} of {allLessonsInOrder.length}
              </Badge>
            )}
          </div>

          {/* Title and Complete Button Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold font-outfit text-foreground tracking-tight leading-snug">
              {lessonObj.title}
            </h1>

            <div className="shrink-0 self-start sm:self-auto">
              <LessonCompleteButton
                lessonId={lessonObj.id}
                userId={session.id}
                courseId={courseObj.id}
              />
            </div>
          </div>
        </div>

        {/* Video Focal Container */}
        {activeVideoId && (
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl bg-black border border-border/80 shadow-md relative">
            <HlsPlayer
              videoId={activeVideoId}
              watermarkEmail={session.email || session.fullName || "student@airbharath.in"}
              watermarkPhone={session.phone || undefined}
            />
          </div>
        )}

        {/* Learning Tabs: Notes / Materials & Doubts / Discussion */}
        <Tabs defaultValue="notes" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/60 grid grid-cols-2 max-w-xs">
            <TabsTrigger
              value="notes"
              className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs flex items-center gap-1.5 focus-visible:ring-primary cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Notes &amp; Files</span>
            </TabsTrigger>
            <TabsTrigger
              value="discussion"
              className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs flex items-center gap-1.5 focus-visible:ring-primary cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Doubts</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Lesson Notes & Materials */}
          <TabsContent value="notes" className="space-y-6 mt-0">
            {lessonObj.content ? (
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <h2 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Lesson Notes &amp; Key Concepts</span>
                </h2>
                <div
                  className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: lessonObj.content }}
                />
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border/80 rounded-3xl p-8 text-center text-xs text-muted-foreground space-y-2 shadow-xs">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto text-primary">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-foreground font-outfit">Video Lesson Track</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Focus on the lesson video module above. Additional reference notes are not required for this lesson.
                  </p>
                </div>
              </div>
            )}

            {/* Reference Materials */}
            {materialsList && materialsList.length > 0 && (
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm sm:text-base font-outfit text-foreground">
                      Downloadable Reference Files
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-lg">
                    {materialsList.length} {materialsList.length === 1 ? "file" : "files"}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {materialsList.map((mat: any) => (
                    <a
                      key={mat.id}
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 bg-muted/30 border border-border/60 rounded-2xl hover:border-primary/40 hover:bg-muted/60 transition-all group shadow-2xs cursor-pointer"
                    >
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          mat.fileType === "pdf"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        }`}
                      >
                        {mat.fileType === "pdf" ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <ImageIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {mat.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">
                          {mat.fileType === "pdf" ? "PDF Document" : "Image File"}
                          {mat.fileSize ? ` • ${(mat.fileSize / 1024).toFixed(0)} KB` : ""}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Doubts & Discussion */}
          <TabsContent value="discussion" className="mt-0">
            <LessonComments
              lessonId={lessonObj.id}
              currentUserId={session.id}
              currentUserName={session.fullName || session.email || "Student"}
            />
          </TabsContent>
        </Tabs>

        {/* Sequential Lesson Navigation Footer */}
        <LessonNavigation
          courseId={courseObj.id}
          previousLesson={previousLesson}
          nextLesson={nextLesson}
        />
      </div>
    </div>
  );
}
