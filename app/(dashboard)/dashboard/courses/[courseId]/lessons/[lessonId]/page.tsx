import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessons, enrollments, lessonMaterials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { LessonCompleteButton } from "@/components/LessonCompleteButton";
import { LessonComments } from "@/components/LessonComments";
import { HlsPlayer } from "@/components/video-player/HlsPlayer";
import { FileText, Download, Image as ImageIcon, Paperclip } from "lucide-react";

export const dynamic = "force-dynamic";

interface LessonPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

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

  // Check enrollment unless free preview or admin
  let isEnrolled = lessonObj.isFreePreview || session.role === "admin";

  if (!isEnrolled) {
    const enrollmentRecord = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, courseId)),
    });
    if (enrollmentRecord) {
      isEnrolled = true;
    }
  }

  if (!isEnrolled) {
    return redirect(`/courses/${courseId}`);
  }

  const activeVideoId = lessonObj.videoUrl || lessonObj.id;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto pt-12 pb-20 px-4">
          <h1 className="text-2xl font-bold mb-4 font-instrument-serif text-[#014a62]">{lessonObj.title}</h1>

          <div className="space-y-8">
            {/* Video Section */}
            {activeVideoId && (
              <HlsPlayer
                videoId={activeVideoId}
                watermarkText={session.email || "student@airbharath.in"}
              />
            )}

            {/* Lesson Content */}
            {lessonObj.content && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-[#014a62] font-instrument-serif">Lesson Notes</h2>
                <div
                  className="prose prose-blue dark:prose-invert max-w-none font-sans"
                  dangerouslySetInnerHTML={{ __html: lessonObj.content }}
                />
              </div>
            )}

            {/* Reference Materials */}
            {materialsList && materialsList.length > 0 && (
              <div className="bg-muted/20 border border-border/60 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Paperclip className="h-5 w-5 text-[#014a62]" />
                  <h2 className="text-base font-extrabold text-foreground font-instrument-serif">Reference Materials</h2>
                  <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {materialsList.length} {materialsList.length === 1 ? "file" : "files"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {materialsList.map((mat: any) => (
                    <a
                      key={mat.id}
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 bg-card border border-border/60 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group shadow-sm"
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        mat.fileType === "pdf"
                          ? "bg-red-50 border border-red-100"
                          : "bg-blue-50 border border-blue-100"
                      }`}>
                        {mat.fileType === "pdf" ? (
                          <FileText className="h-5 w-5 text-red-500" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {mat.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">
                          {mat.fileType === "pdf" ? "PDF Document" : "Image"}
                          {mat.fileSize ? ` • ${(mat.fileSize / 1024).toFixed(0)} KB` : ""}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end border-b border-border/60 pb-8">
              <LessonCompleteButton lessonId={lessonObj.id} userId={session.id} courseId={courseId} />
            </div>

            {/* Comments Section */}
            <LessonComments
              lessonId={lessonObj.id}
              currentUserId={session.id}
              currentUserName={session.fullName || session.email || "Student"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
