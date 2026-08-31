/* eslint-disable @typescript-eslint/no-explicit-any */
import Hero from "@/components/Hero";
import { CourseCard } from "@/components/CourseCard";
import { createClient } from "@/lib/supabase-server";
import { FAQSection } from "@/components/FAQSection";
import { generateSlug } from "@/lib/slug";
import {
  ShieldCheck,
  Trophy,
  Star,
  Brain,
  Zap,
  TrendingDown,
  ArrowDown,
  X,
  Check,
  Eye,
  Globe,
  Layers,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ISR: Revalidate every 5 minutes — courses don't change in real-time
export const revalidate = 300;

export default async function Home() {
  const supabase = await createClient();

  // Fetch courses with instructor details
  const { data: courses } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:users!instructor_id (
        full_name,
        avatar_url
      )
    `)
    .eq('is_published', true);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Hero />

      {/* Pain Points Section ("Sound familiar?") */}
      <section className="py-24 bg-muted/20 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Challenges
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Sound familiar?
            </h2>
            <div className="h-1 w-12 bg-primary mx-auto rounded-full mt-2" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  &quot;I study to pass, but forget it all.&quot;
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  You studied for 4+ years, passed the exams, but still feel like you can&apos;t confidently answer basic structural questions in a real interview.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  &quot;Interviews make me panic.&quot;
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  When the interviewer asks a practical, site-based question, your mind goes blank because college only taught you theoretical formulas.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  &quot;I&apos;m stuck in a low-paying job.&quot;
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  You&apos;re feeling trapped in a role with no growth, but you don&apos;t feel skilled enough to apply for top-tier structural or core engineering firms.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center">
            <p className="text-sm md:text-base font-extrabold text-foreground">
              ⚡ You know the theory... you just have no idea how to apply it in the real world.
            </p>
          </div>
        </div>
      </section>

      {/* The Bridge Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Details */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                  The Solution
                </span>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                  The Bridge Between <br className="hidden md:inline" />
                  College Knowledge & <br />
                  Real-World Engineering
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Introducing the complete career finishing program designed specifically to decode complex civil and structural engineering concepts into simple, visual, and practical lessons.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Simplified Concepts</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Understand WHY formulas work, not just how to memorize them.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Industry-Ready Focus</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Learn the exact concepts top structural firms test in interviews.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Multi-Code Mastery</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Uniquely taught across Indian, American, and Euro Codes to make you globally employable.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Practical Approach</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Real-world examples, load distribution diagrams, and site scenarios.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: vertical visual stack */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-card border border-border/80 rounded-3xl p-8 shadow-sm">
              <div className="w-full space-y-6 relative flex flex-col items-center">
                {/* Stage 1 */}
                <div className="w-full bg-muted/50 border border-border/80 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-muted-foreground">College Theory</p>
                  <p className="text-[10px] text-muted-foreground/85 mt-1">Formulas, exam cramming, rote models</p>
                </div>

                <ArrowDown className="h-5 w-5 text-accent" />

                {/* Stage 2 */}
                <div className="w-full bg-accent border border-accent/80 rounded-xl p-4 text-center text-white shadow-lg shadow-accent/20">
                  <p className="text-xs font-black">This Course (IRII)</p>
                  <p className="text-[10px] text-white/90 mt-1">Codes, software models, calculations, behavior</p>
                </div>

                <ArrowDown className="h-5 w-5 text-emerald-500" />

                {/* Stage 3 */}
                <div className="w-full bg-emerald-500 border border-emerald-600 rounded-xl p-4 text-center text-white shadow-lg shadow-emerald-500/20">
                  <p className="text-xs font-black">Industry Ready</p>
                  <p className="text-[10px] text-white/90 mt-1">Cracked interviews, high package placements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum / Courses Section */}
      <section id="curriculum" className="py-24 bg-muted/10 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 max-w-5xl mx-auto border-b border-border/50 pb-8">
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                Interactive Curriculum
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground animate-slide-up">
                Engineered for Excellence.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                A structured, deep dive into real-world structural modeling and detailing, built by senior industry consultants.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {courses && courses.length > 0 ? (
              courses.map((course: any) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  href={`/courses/${generateSlug(course.title)}`}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center border border-dashed rounded-2xl text-muted-foreground">
                No active courses are available at the moment. Please check back later.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Before / After Transformation Table Section */}
      <section className="py-24 bg-muted/20 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Comparison
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Your Career Transformation
            </h2>
            <div className="h-1 w-12 bg-primary mx-auto rounded-full mt-2" />
          </div>

          <div className="bg-card border border-border/80 rounded-[2rem] overflow-hidden shadow-lg grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/80">
            {/* Before */}
            <div className="p-8 md:p-12 space-y-8 bg-muted/10">
              <h3 className="text-lg font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Before Taking the Course
              </h3>

              <ul className="space-y-6">
                <li className="flex gap-3 items-start text-muted-foreground">
                  <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Confused by complex structural concepts</span>
                </li>
                <li className="flex gap-3 items-start text-muted-foreground">
                  <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Fearful of core technical interviews</span>
                </li>
                <li className="flex gap-3 items-start text-muted-foreground">
                  <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Purely theoretical college formula knowledge</span>
                </li>
                <li className="flex gap-3 items-start text-muted-foreground">
                  <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Stuck in low-paying/no-growth job roles</span>
                </li>
              </ul>
            </div>

            {/* After */}
            <div className="p-8 md:p-12 space-y-8">
              <h3 className="text-lg font-black text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                After Mastering the Concepts
              </h3>

              <ul className="space-y-6">
                <li className="flex gap-3 items-start text-foreground">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Deeply understand how structures behave</span>
                </li>
                <li className="flex gap-3 items-start text-foreground">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Confidently answer any site/calculation question</span>
                </li>
                <li className="flex gap-3 items-start text-foreground">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Practical, real-world structural application skills</span>
                </li>
                <li className="flex gap-3 items-start text-foreground">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm font-semibold">Ready to crack top-tier core design companies</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/search/courses">
              <Button size="lg" className="h-14 px-8 font-black shadow-md shadow-primary/20 hover:shadow-lg text-primary-foreground rounded-xl transition-all duration-300 hover:scale-[1.02]">
                Start Your Transformation ⚡
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Master Mentors Section */}
      <section className="py-24 bg-card text-foreground relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase">
                <Star className="h-3.5 w-3.5 fill-current" /> Expert Guidance
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
                Learn from the <br className="hidden md:inline" />
                Industry Veterans.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Our mentors are working structural engineers, detailing leads, and project managers from top multinational engineering and EPC consulting firms. You learn the workflows actually used in the industry.
              </p>

              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all duration-300">
                  <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-base text-foreground">Direct Hiring Placement Hub</h4>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Direct access to hiring agencies, skipping generic job portal lines.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all duration-300">
                  <Trophy className="h-6 w-6 text-accent shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-base text-foreground">Career Upgrades</h4>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Move from entry-level layout tasks to core structural designs with higher packages.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 relative">
              <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl -z-10 animate-pulse pointer-events-none" />
              <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl mt-12 hover:scale-[1.02] transition-all duration-300 border border-border group">
                <Image src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop" alt="Mentor" fill className="object-cover group-hover:scale-102 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white space-y-1">
                  <p className="text-[10px] font-extrabold text-primary tracking-wider uppercase">Chief Structural Engineer</p>
                  <p className="text-base font-bold">R. Sharma</p>
                </div>
              </div>
              <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-border group">
                <Image src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop" alt="Mentor" fill className="object-cover group-hover:scale-102 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white space-y-1">
                  <p className="text-[10px] font-extrabold text-accent tracking-wider uppercase">Lead BIM Modeler</p>
                  <p className="text-base font-bold">A. Desai</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real World Outcomes Section */}
      <section className="py-24 bg-muted/20 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Outcomes
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Not Just Topics. Real World Outcomes.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              We don&apos;t just teach &quot;Structural Analysis&quot;. We teach you how to think like a seasoned engineer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Card 01 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm space-y-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-6 text-5xl md:text-6xl font-black text-muted/20 select-none">
                01
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Eye className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground">Visualize Load Distribution</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Stop guessing. Learn to trace how loads travel through a structure down to the foundation, just like real engineers do when designing skyscrapers.
                </p>
              </div>
            </div>

            {/* Card 02 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm space-y-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-6 text-5xl md:text-6xl font-black text-muted/20 select-none">
                02
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Globe className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground">Global Multi-Code Mastery</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Gain an international advantage. Learn how to apply structural concepts simultaneously across Indian (IS), American (ACI/AISC), and Euro Codes to become globally employable.
                </p>
              </div>
            </div>

            {/* Card 03 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm space-y-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-6 text-5xl md:text-6xl font-black text-muted/20 select-none">
                03
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground">Concrete & Steel Behavior</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Understand the exact interaction between concrete and reinforcement. The knowledge that differentiates a drafter from a lead structural engineer.
                </p>
              </div>
            </div>

            {/* Card 04 */}
            <div className="bg-card p-8 rounded-3xl border border-border/60 shadow-sm space-y-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-6 text-5xl md:text-6xl font-black text-muted/20 select-none">
                04
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground">Interview Cracking Framework</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  A proven system to tackle open-ended interview questions. Learn how to verbally walk an interviewer through your problem-solving process.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tuition Plans / Investment */}
      {/* <section className="py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Pricing Options
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Investment in Your Future.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden costs. Simple, flexible, income-aligned tuition plans.
            </p>
          </div>

          <div className="bg-card rounded-[2.5rem] border border-border/80 shadow-xl overflow-hidden flex flex-col md:flex-row hover:border-primary/20 transition-all duration-500 ease-out">
            <div className="p-10 md:w-1/2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border bg-muted/10">
              <h3 className="text-2xl font-bold mb-2 text-foreground">Shared Success</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-8">Start your training with minimal upfront commitment.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl md:text-6xl font-black text-primary">50%</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Upfront Fees</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">Access all live sessions and videos</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">Personalized review of portfolio designs</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">Art of Living mind programs</span>
                </li>
              </ul>
            </div>
            
            <div className="p-10 md:w-1/2 bg-primary text-primary-foreground flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-2xl font-bold mb-2 text-white">Pay the Rest Later</h3>
              <p className="text-xs md:text-sm text-white/80 mb-8">Pay the remaining half only after landing a job.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl md:text-6xl font-black text-white">50%</span>
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Post-Placement</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                  <span className="text-xs md:text-sm text-white/90">Payable after joining your employer</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                  <span className="text-xs md:text-sm text-white/90">Resume optimization and direct hiring referral</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                  <span className="text-xs md:text-sm text-white/90">Average starting package of 6 LPA</span>
                </li>
              </ul>
              
              <Link href="/search/courses" className="w-full text-center py-4 bg-white text-primary font-bold rounded-xl hover:bg-white/95 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] duration-300 text-xs md:text-sm">
                Apply for the Program
              </Link>
            </div>
          </div>
        </div>
      {/* FAQ Section */}
      <FAQSection />
    </div>
  );
}
