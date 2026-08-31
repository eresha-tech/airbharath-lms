import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-server";
import { getGumletSignedUrl } from "@/lib/gumlet";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getVdoCipherOtp } from "@/lib/vdocipher";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

interface PreviewLessonPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

export default async function PreviewLessonPage({ params }: PreviewLessonPageProps) {
  const { courseId, lessonId } = await params;
  // Use admin client so no auth is required to read lesson data
  const adminSupabase = createAdminClient();

  const { data: lesson } = await adminSupabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return redirect(`/courses/${courseId}`);
  }

  // Only allow free preview lessons on this route
  if (!lesson.is_free_preview) {
    return redirect(`/courses/${courseId}`);
  }

  let vdoOtp = "";
  let vdoPlaybackInfo = "";
  let secureVideoUrl: string | null = null;

  if (lesson.video_url) {
    try {
      const vdoData = await getVdoCipherOtp(lesson.video_url, "preview@irii.in");
      if (vdoData) {
        vdoOtp = vdoData.otp;
        vdoPlaybackInfo = vdoData.playbackInfo;
      }
    } catch {
      // fallback to gumlet/direct
      secureVideoUrl = getGumletSignedUrl(lesson.video_url);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Banner */}
      <div className="w-full bg-gradient-to-r from-[#004D61] to-[#006d88] text-white py-3 px-4 text-center text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2">
        <span>🎬 You&apos;re watching a <strong>Free Preview</strong> lesson.</span>
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white font-bold text-[11px] transition-colors border border-white/20"
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

        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-6">{lesson.title}</h1>

        <div className="space-y-8">
          {/* Video */}
          {(vdoOtp || secureVideoUrl) ? (
            <VideoPlayer
              url={secureVideoUrl || undefined}
              userEmail="preview@irii.in"
              vdoOtp={vdoOtp || undefined}
              vdoPlaybackInfo={vdoPlaybackInfo || undefined}
            />
          ) : lesson.video_url ? (
            <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Video loading…</p>
            </div>
          ) : null}

          {/* Lesson Content */}
          {lesson.content && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Lesson Notes</h2>
              <div
                className="prose prose-blue dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
              />
            </div>
          )}

          {/* CTA to enroll */}
          <div className="mt-10 p-6 bg-gradient-to-br from-[#004D61]/10 to-[#006d88]/5 border border-[#004D61]/20 rounded-2xl text-center space-y-3">
            <Lock className="h-8 w-8 text-[#004D61] mx-auto" />
            <h3 className="text-lg font-black text-foreground">Enjoying this lesson?</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Enroll now to unlock the full course, all lessons, live projects, and your ISO-certified completion certificate.
            </p>
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex items-center gap-2 mt-2 px-6 py-3 bg-[#004D61] text-white font-bold rounded-xl text-sm hover:bg-[#006d88] transition-colors shadow-md"
            >
              View Enrollment Options
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
