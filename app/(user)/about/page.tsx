import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Users,
  Compass,
  Award,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About Us | AirBharath LMS",
  description:
    "Learn about AirBharath LMS, our mission, IIM alumni instructors, and 30+ years of aviation and technical learning heritage.",
};

export default function AboutPage() {
  const pillars = [
    {
      icon: BookOpen,
      title: "Practical, Application-First Curriculum",
      description:
        "We believe professional growth happens through doing. Our courses focus on hands-on tools—from generative AI workflows to advanced spreadsheets and content frameworks.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: Users,
      title: "Taught by IIM Alumni & Industry Practitioners",
      description:
        "Every curriculum is designed and taught by seasoned practitioners who bring corporate decision-making and real-world execution into every lesson.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: ShieldCheck,
      title: "Tamper-Proof QR-Verifiable Certificates",
      description:
        "Students who complete all modules receive an official, cryptographically verifiable certificate with a permanent public verification link.",
      color: "text-success bg-success/15",
    },
    {
      icon: Briefcase,
      title: "Integrated Placement & Career Hub",
      description:
        "Enrolled students gain direct access to our Job Board, featuring verified technical, aviation, and corporate openings from partner organizations.",
      color: "text-amber-500 bg-amber-500/15",
    },
  ];

  const ecosystemItems = [
    {
      title: "Course Catalog",
      tagline: "High-impact programs",
      description:
        "Curated certificate courses in AI Skills, Digital Content, MS Office, and Entrepreneurship.",
      href: "/courses",
      linkText: "Explore Courses",
      icon: Layers,
    },
    {
      title: "Student Classroom",
      tagline: "Self-paced LMS",
      description:
        "Structured video modules, interactive notes, downloadable assets, and auto-saved progress tracking.",
      href: "/courses",
      linkText: "View Learning Model",
      icon: BookOpen,
    },
    {
      title: "Credential Verification",
      tagline: "Instant public validation",
      description:
        "Dedicated verification registry allowing employers and universities to confirm certificate authenticity.",
      href: "/verify-certificate",
      linkText: "Verify Certificate",
      icon: Award,
    },
    {
      title: "Career Hub",
      tagline: "Placement openings",
      description:
        "Live roster of verified roles in flight operations, technical execution, and engineering.",
      href: "/dashboard/jobs",
      linkText: "View Career Hub",
      icon: Briefcase,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground pb-20">
      {/* Hero Header Section */}
      <section className="pt-28 pb-16 border-b border-border">
        <div className="container mx-auto px-4 max-w-5xl space-y-6 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="h-4 w-4" />
            <span>About AirBharath LMS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-outfit tracking-tight leading-tight text-foreground">
            Learning &amp; Professional <span className="text-primary">Excellence.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            AirBharath LMS is a specialized professional learning platform built on more than 30 years of experience across aviation, education, and technology. We empower professionals, students, and aviation crew to build high-demand skills without putting their current careers on hold.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 bg-card border border-border px-3.5 py-1.5 rounded-full shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>100% Self-Paced Learning</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-card border border-border px-3.5 py-1.5 rounded-full shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>QR-Verifiable Credentials</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-card border border-border px-3.5 py-1.5 rounded-full shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>IIM Alumni Led</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 max-w-6xl mt-12 space-y-16">
        {/* Mission Statement Box */}
        <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Our Core Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              Bridging the gap between academic theory and real-world workplace execution.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Most online courses stop at passive video lectures. AirBharath LMS is designed for outcomes: structured modules, practical projects, hands-on tool mastery, and official certificates that stand up to employer scrutiny.
            </p>
          </div>
        </div>

        {/* 4 Pillars of Excellence Grid */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
              The AirBharath Standard
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Every course and capability on our platform is built around four foundational principles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={index}
                  className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${pillar.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-bold font-outfit text-foreground">
                      {pillar.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Ecosystem Connections */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
              An Integrated Learning Ecosystem
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              From enrollment to certification and placement, explore the complete AirBharath platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ecosystemItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {item.tagline}
                      </span>
                      <h4 className="font-bold text-base font-outfit text-foreground mt-0.5">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-2 border-t border-border/60"
                  >
                    <span>{item.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institutional Heritage Section */}
        <div className="bg-slate-900 dark:bg-card text-white dark:text-foreground rounded-3xl p-8 sm:p-12 border border-slate-800 dark:border-border shadow-md flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="space-y-3 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 dark:bg-accent-soft text-cyan-300 dark:text-accent-light text-xs font-bold uppercase tracking-wider border border-white/10 dark:border-primary/20">
              <Compass className="w-3.5 h-3.5 text-primary" />
              <span>Organizational Heritage</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-outfit text-white">
              30+ Years of Aviation &amp; Technology Heritage
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              AirBharath LMS is developed by Eresha Technology Innovators Pvt. Ltd., bringing decades of aviation operational discipline, technological rigor, and academic pedigree to modern online education.
            </p>
          </div>

          <div className="shrink-0 relative z-10">
            <Button
              asChild
              className="bg-white text-slate-950 hover:bg-slate-100 font-bold h-12 px-6 rounded-xl text-xs shadow-xs"
            >
              <Link href="/courses">
                <span>Browse All Courses</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2 text-primary" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-xs">
          <h3 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
            Ready to Take the Next Step?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Enroll in an individual certificate program or unlock all four flagship courses with our All-in-One Combo Pass.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl text-xs shadow-xs"
            >
              <Link href="/courses">Explore Programs</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-100 font-bold h-11 px-6 rounded-xl text-xs"
            >
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
