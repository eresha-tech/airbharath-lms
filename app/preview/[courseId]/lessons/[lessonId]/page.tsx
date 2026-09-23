import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lessons, videoCaptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { HlsPlayer } from "@/components/video-player/HlsPlayer";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import Link from "next/link";
import { ArrowLeft, Lock, Sparkles, FileText, Calculator } from "lucide-react";

export const dynamic = "force-dynamic";

interface PreviewLessonPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

export default async function PreviewLessonPage({ params }: PreviewLessonPageProps) {
  const { courseId, lessonId } = await params;

  const lessonObj = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });

  if (
    !lessonObj ||
    !lessonObj.isFreePreview ||
    (lessonObj.deliveryType === 'recorded' && lessonObj.releaseAt && new Date(lessonObj.releaseAt) > new Date())
  ) {
    return redirect(`/courses/${courseId}`);
  }

  const activeVideoId = lessonObj.videoUrl || lessonObj.id;
  const captionRecord = activeVideoId
    ? await db.query.videoCaptions.findFirst({
        where: and(eq(videoCaptions.videoId, activeVideoId), eq(videoCaptions.status, "ready")),
      })
    : null;
  const captionAvailable = Boolean(captionRecord);

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Banner */}
      <div className="w-full bg-primary text-primary-foreground py-3 px-4 text-center text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 shadow-xs">
        <span>🎬 You&apos;re watching a <strong>Free Preview</strong> lesson.</span>
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1 px-3 py-1 bg-black/15 hover:bg-black/25 dark:bg-white/15 dark:hover:bg-white/25 rounded-full text-primary-foreground font-bold text-[11px] transition-colors border border-current/20"
        >
          Enroll to unlock all lessons →
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Back Link */}
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-6 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Course
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold font-outfit text-foreground mb-6">{lessonObj.title}</h1>

        <div className="space-y-8">
          {/* Video */}
          {activeVideoId ? (
            <HlsPlayer
              videoId={activeVideoId}
              courseId={courseId}
              lessonId={lessonId}
              watermarkText="preview@airbharath.in"
              captionAvailable={captionAvailable}
            />
          ) : (
            <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No video configured for this preview lesson.</p>
            </div>
          )}

          {/* Lesson Summary */}
          {lessonObj.summary?.trim() && (
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Lesson Summary</span>
              </h2>
              <MarkdownContent content={lessonObj.summary} />
            </div>
          )}

          {/* Lesson Notes */}
          {lessonObj.content?.trim() && (
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Lesson Notes</span>
              </h2>
              <MarkdownContent content={lessonObj.content} />
            </div>
          )}

          {/* Key Formulas */}
          {lessonObj.formulas?.trim() && (
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Key Formulas</span>
              </h2>
              <MarkdownContent content={lessonObj.formulas} variant="formula" />
            </div>
          )}

          {/* CTA to enroll */}
          <div className="mt-10 p-6 bg-card border border-border rounded-2xl text-center space-y-3 shadow-xs">
            <Lock className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-lg font-bold font-outfit text-foreground">Enjoying this lesson?</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto font-sans">
              Enroll now to unlock the full course, all lessons, live projects, and your verified completion certificate.
            </p>
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex items-center gap-2 mt-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-colors shadow-md"
            >
              View Enrollment Options
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
