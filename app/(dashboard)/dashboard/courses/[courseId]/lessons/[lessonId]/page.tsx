import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-server";
import { getGumletSignedUrl } from "@/lib/gumlet";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonCompleteButton } from "@/components/LessonCompleteButton";
import { getVdoCipherOtp } from "@/lib/vdocipher";
import { LessonComments } from "@/components/LessonComments";
import { FileText, Download, Image as ImageIcon, Paperclip } from "lucide-react";

interface LessonPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, lessonId } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Parallel: auth + lesson fetch + materials
  const [{ data: { user } }, { data: lesson }, { data: materials }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('lessons').select('*').eq('id', lessonId).single(),
    adminSupabase.from('lesson_materials').select('*').eq('lesson_id', lessonId).order('created_at', { ascending: true }),
  ]);

  if (!user) return redirect("/login");

  if (!lesson) {
    return redirect(`/dashboard/courses/${courseId}`);
  }

  // Parallel: enrollment check (only if needed) + VdoCipher OTP request
  let vdoOtp = "";
  let vdoPlaybackInfo = "";
  let secureVideoUrl = null;

  const enrollmentCheckPromise = lesson.is_free_preview
    ? Promise.resolve(true) // skip DB check for free lessons
    : supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(async ({ data: profile }) => {
          const isAdmin = profile?.role === "admin" ||
                          user.email?.toLowerCase().startsWith("admin@") ||
                          user.email?.toLowerCase().endsWith("@irii.in") ||
                          user.email?.toLowerCase() === "irii.edtech@gmail.com" ||
                          user.email?.toLowerCase() === "rishisingh1034@gmail.com";
          if (isAdmin) return true;

          const { data } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();
          return !!data;
        });

  const videoPromise = lesson.video_url
    ? getVdoCipherOtp(lesson.video_url, user.email || "student@irii.in")
    : Promise.resolve(null);

  const [isEnrolled, vdoData] = await Promise.all([enrollmentCheckPromise, videoPromise]);

  if (!lesson.is_free_preview && !isEnrolled) {
    return redirect(`/courses/${courseId}`);
  }

  if (vdoData) {
    vdoOtp = vdoData.otp;
    vdoPlaybackInfo = vdoData.playbackInfo;
  } else if (lesson.video_url) {
    secureVideoUrl = getGumletSignedUrl(lesson.video_url);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto pt-12 pb-20 px-4">
          <h1 className="text-2xl font-bold mb-4">{lesson.title}</h1>

          <div className="space-y-8">
            {/* Video Section */}
            {(vdoOtp || secureVideoUrl) && (
              <VideoPlayer
                url={secureVideoUrl || undefined}
                userEmail={user.email}
                vdoOtp={vdoOtp || undefined}
                vdoPlaybackInfo={vdoPlaybackInfo || undefined}
              />
            )}

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

            {/* Reference Materials */}
            {materials && materials.length > 0 && (
              <div className="bg-muted/20 border border-border/60 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Paperclip className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-extrabold text-foreground">Reference Materials</h2>
                  <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {materials.length} {materials.length === 1 ? "file" : "files"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {materials.map((mat: any) => (
                    <a
                      key={mat.id}
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 bg-card border border-border/60 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group shadow-sm"
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        mat.file_type === "pdf"
                          ? "bg-red-50 border border-red-100"
                          : "bg-blue-50 border border-blue-100"
                      }`}>
                        {mat.file_type === "pdf" ? (
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
                          {mat.file_type === "pdf" ? "PDF Document" : "Image"}
                          {mat.file_size ? ` • ${(mat.file_size / 1024).toFixed(0)} KB` : ""}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end border-b border-border/60 pb-8">
              <LessonCompleteButton lessonId={lesson.id} userId={user.id} courseId={courseId} />
            </div>

            {/* Comments Section */}
            <LessonComments
              lessonId={lesson.id}
              currentUserId={user.id}
              currentUserName={user.user_metadata?.full_name || user.email || "Student"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
