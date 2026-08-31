/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Award, ShieldCheck, Terminal, GraduationCap, Users, Star, Play } from "lucide-react";
import EnrollButton from "@/components/EnrollButton";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { generateSlug } from "@/lib/slug";

interface CoursePageProps {
  params: Promise<{
    slugOrId: string;
  }>;
}

export async function generateMetadata({ params }: CoursePageProps) {
  const { slugOrId } = await params;
  const adminSupabase = createAdminClient();

  // Try to fetch by ID first (fast path)
  let course: { title: string; description: string } | null = null;
  const isUUID = /^[0-9a-f-]{36}$/i.test(slugOrId);
  if (isUUID) {
    const { data } = await adminSupabase
      .from('courses')
      .select('id, title, description')
      .eq('id', slugOrId)
      .single();
    course = data;
  } else {
    // Slug — fetch all titles and find match (still efficient, titles only)
    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id, title, description');
    course = courses?.find(c => generateSlug(c.title) === slugOrId) ?? null;
  }

  return {
    title: course ? `${course.title} | IRII Finishing School` : "Course | IRII Finishing School",
    description: course?.description || "Bridge the academia-industry gap with premium structural engineering training.",
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slugOrId } = await params;
  const adminSupabase = createAdminClient();

  const isUUID = /^[0-9a-f-]{36}$/i.test(slugOrId);

  // Parallel fetch: auth session + course lookup
  const supabasePromise = createClient();
  let courseQueryPromise;

  if (isUUID) {
    // Fast path: fetch by ID directly
    courseQueryPromise = adminSupabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id (
          full_name,
          avatar_url
        ),
        modules (
          id,
          title,
          order_index,
          lessons (
            id,
            title,
            is_free_preview,
            order_index
          )
        )
      `)
      .eq('id', slugOrId)
      .single()
      .then(({ data }) => data ? [data] : []);
  } else {
    // Slug path: fetch all but only select needed fields for slug matching
    courseQueryPromise = adminSupabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id (
          full_name,
          avatar_url
        ),
        modules (
          id,
          title,
          order_index,
          lessons (
            id,
            title,
            is_free_preview,
            order_index
          )
        )
      `)
      .then(({ data }) => data ?? []);
  }

  const [supabase, courses] = await Promise.all([supabasePromise, courseQueryPromise]);
  const { data: { user } } = await supabase.auth.getUser();

  const course = isUUID
    ? courses[0] ?? null
    : (courses as any[]).find((c: any) => generateSlug(c.title) === slugOrId) ?? null;

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-16 mt-16 text-center">
        <h1 className="text-4xl font-extrabold text-foreground">Course not found</h1>
        <p className="text-muted-foreground mt-2">The course you are looking for does not exist or has been removed.</p>
        <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all shadow-md">
          Return to home
        </Link>
      </div>
    );
  }

  // If accessed by UUID, redirect to clean slug URL for SEO consistency
  const courseSlug = generateSlug(course.title);
  if (slugOrId === course.id) {
    return redirect(`/courses/${courseSlug}`);
  }

  // Check enrollment using user client
  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .single();
    isEnrolled = !!enrollment;
  }

  const totalLessons = course.modules?.reduce((acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in">
      {/* Hero Header Section */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#002d3a] via-[#004D61] to-[#0b667e] text-white py-16 md:py-24">
        {/* Background image overlay */}
        {course.thumbnail_url && (
          <div className="absolute inset-0 opacity-15 mix-blend-overlay">
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#001f28]/85" />
        
        <div className="container mx-auto px-4 relative z-10">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-bold text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 mb-8"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Courses
          </Link>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Title / Description */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/15 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  🔥 Best Seller
                </span>
                <span className="px-3 py-1 bg-[#00A3C4]/20 backdrop-blur-sm border border-[#00A3C4]/35 text-[#00E5FF] rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                  ⚡ Job Oriented Training
                </span>
              </div>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
                {course.title}
              </h1>
              
              <p className="text-base md:text-lg text-white/85 max-w-3xl leading-relaxed">
                {course.description || "Transform your technical expertise and build real-world structures using industry standard practices and state-of-the-art tools."}
              </p>
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <Clock className="h-5 w-5 text-[#00E5FF]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Pace</div>
                    <div className="text-sm font-bold text-white">Self-paced</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <BookOpen className="h-5 w-5 text-[#00E5FF]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Lessons</div>
                    <div className="text-sm font-bold text-white">{totalLessons} Sessions</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <Award className="h-5 w-5 text-[#00E5FF]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Certificate</div>
                    <div className="text-sm font-bold text-white">ISO Included</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Payment / Enroll Widget */}
            <div className="lg:col-span-4">
              <div className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-100 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#004D61] text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl">
                  Life Access
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Program Investment</span>
                  <div className="text-4xl font-black text-gray-900 tracking-tight">
                    {course.price === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `₹${course.price.toLocaleString("en-IN")}`
                    )}
                  </div>
                </div>

                <EnrollButton 
                  courseId={course.id} 
                  isEnrolled={isEnrolled} 
                  price={Number(course.price)}
                  courseTitle={course.title}
                  initialUser={user ? { id: user.id, email: user.email } : null}
                />
                
                <div className="space-y-3 pt-4 border-t border-gray-100 text-xs text-gray-500 font-semibold">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#004D61]" />
                    <span>Secure Payment & Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-[#004D61]" />
                    <span>Real-world Software Licenses Included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
          {/* Left Column: Course Modules */}
          <div className="lg:col-span-8 space-y-8">
            {/* Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-card border border-border/80 rounded-2xl flex gap-4 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-[#004D61]/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-[#004D61]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Industry Ready Curriculum</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Curated by top design consultants to match the actual job demands of construction firms.</p>
                </div>
              </div>
              
              <div className="p-6 bg-card border border-border/80 rounded-2xl flex gap-4 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-[#004D61]/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-[#004D61]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Professional Instructors</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Learn directly from verified structural design engineers with extensive project portfolios.</p>
                </div>
              </div>
            </div>

            {/* Course Content Accordion Card */}
            <div className="bg-card rounded-3xl p-8 border border-border/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Course Curriculum</h2>
                  <p className="text-xs text-muted-foreground mt-1">{course.modules?.length || 0} modules • {totalLessons} sessions</p>
                </div>
              </div>
              
              {(!course.modules || course.modules.length === 0) ? (
                <div className="text-center py-12 border border-dashed rounded-2xl">
                  <BookOpen className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Curriculum details are currently being finalized.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {course.modules?.sort((a: any, b: any) => a.order_index - b.order_index).map((module: any, index: number) => (
                    <div
                      key={module.id}
                      className="border border-border/60 rounded-2xl overflow-hidden bg-muted/5 hover:border-primary/20 transition-all duration-300 shadow-sm"
                    >
                      <div className="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                          <span className="text-[#004D61] bg-[#004D61]/10 px-2.5 py-0.5 rounded-md text-xs font-black">
                            Module {index + 1}
                          </span>
                          <span>{module.title}</span>
                        </h3>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {module.lessons?.length || 0} Sessions
                        </span>
                      </div>
                      <div className="divide-y divide-border/40 bg-card">
                        {(!module.lessons || module.lessons.length === 0) ? (
                          <div className="p-4 text-xs text-muted-foreground text-center">No lessons added to this module.</div>
                        ) : (
                          module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any, lessonIndex: number) => {
                            const isFreePreview = lesson.is_free_preview && !isEnrolled;
                            const isAccessible = isFreePreview || isEnrolled;
                            const lessonHref = isEnrolled
                              ? `/dashboard/courses/${course.id}/lessons/${lesson.id}`
                              : isFreePreview
                              ? `/preview/${course.id}/lessons/${lesson.id}`
                              : null;

                            const LessonWrapper = lessonHref ? Link : 'div';
                            const wrapperProps = lessonHref ? { href: lessonHref } : {};

                            return (
                              <LessonWrapper
                                key={lesson.id}
                                {...(wrapperProps as any)}
                                className={`p-5 transition-colors flex items-center justify-between gap-4 group ${
                                  isAccessible ? 'hover:bg-muted/10 cursor-pointer' : 'opacity-70'
                                }`}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 flex items-center justify-center text-xs font-bold transition-all duration-350 shadow-inner">
                                    {lessonIndex + 1}
                                  </div>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                    <span className="text-xs font-bold text-foreground/80 group-hover:text-foreground transition-colors truncate">
                                      {lesson.title}
                                    </span>
                                  </div>
                                </div>
                                {isFreePreview ? (
                                  <span className="shrink-0 flex items-center gap-1.5 text-[9px] font-extrabold text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm hover:bg-green-500/20 transition-colors">
                                    <Play className="h-2.5 w-2.5 fill-green-600" />
                                    Free Preview
                                  </span>
                                ) : !isEnrolled ? (
                                  <span className="shrink-0 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                    🔒
                                  </span>
                                ) : null}
                              </LessonWrapper>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Instructor / Details */}
          <div className="lg:col-span-4 space-y-6">
            {/* Instructor Box */}
            <div className="bg-card rounded-3xl p-8 border border-border/80 shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#004D61]" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Certified Instructor</h3>
              
              {course.instructor ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    {course.instructor.avatar_url ? (
                      <div className="relative h-16 w-16 shrink-0 shadow-md rounded-full border border-border">
                        <Image
                          src={course.instructor.avatar_url}
                          alt={course.instructor.full_name || "Instructor"}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0 text-xl font-black">
                        {(course.instructor.full_name || "I")[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-foreground text-base tracking-tight">
                        {course.instructor.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>Senior Structural Consultant</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl text-xs text-muted-foreground leading-relaxed font-medium">
                    Industry specialist delivering technical lectures and supervising high-rise structural software implementations.
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40 text-center">
                    <div>
                      <div className="text-sm font-black text-foreground">1,200+</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Students</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-foreground">4.9/5.0</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Rating</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center text-primary shrink-0 text-lg font-black border">
                    IR
                  </div>
                  <div>
                    <div className="font-extrabold text-foreground text-sm">IRII Instructor Panel</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold">Finishing School Experts</div>
                  </div>
                </div>
              )}
            </div>

            {/* Certifications and Accreditations badge */}
            <div className="bg-card rounded-3xl p-8 border border-border/80 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Course Inclusions</h4>
              <ul className="space-y-3 text-xs text-foreground/80 font-bold">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0" />
                  <span>Full Lifetime Access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0" />
                  <span>Mobile & Web Compatible</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0" />
                  <span>ISO 9001:2015 Certification</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0" />
                  <span>Interactive Lecture Discussion Boards</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
