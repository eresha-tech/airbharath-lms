import { GraduationCap, BookOpen, Users, Compass } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-28 max-w-4xl min-h-screen text-foreground bg-background">
      {/* Header Info */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#014a62]/10 border border-[#014a62]/20 text-[#014a62] text-xs font-bold uppercase tracking-wider">
          <GraduationCap className="h-4 w-4" /> About Airbharath LMS
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-[#014a62]">
          Airbharath LMS — Learning & Professional Excellence
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Welcome to Airbharath LMS—a specialized professional learning ecosystem shaped by more than 30 years of experience across aviation, learning, and technology.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-12">
        {/* Intro Highlight */}
        <div className="p-8 bg-[#014a62]/5 border border-[#014a62]/15 rounded-3xl text-center">
          <p className="text-sm md:text-base font-semibold text-foreground leading-relaxed">
            We are dedicated to helping professionals, students, aviation crew, and entrepreneurs build practical, in-demand capabilities without putting their current careers on hold.
          </p>
        </div>

        {/* Section 1: Our Approach */}
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-6">
          <div className="flex gap-4 items-center">
            <div className="h-12 w-12 bg-[#014a62]/10 rounded-2xl flex items-center justify-center text-[#014a62] shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#014a62]">
              Our Approach: Practical Learning for Real-World Success
            </h2>
          </div>
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <p>
              We believe true professional development goes beyond watching videos. Our structured certificate courses cover AI skills, digital marketing & content creation, entrepreneurship, and workplace productivity tools (MS Office).
            </p>
            <p>
              Instead of abstract theory, our self-paced modules empower you to apply what you learn through hands-on exercises, real-world assignments, and QR-verifiable certification.
            </p>
          </div>
        </div>

        {/* Section 2: Taught by Experts */}
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-6">
          <div className="flex gap-4 items-center">
            <div className="h-12 w-12 bg-[#014a62]/10 rounded-2xl flex items-center justify-center text-[#014a62] shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#014a62]">
              Taught by IIM Alumni & Industry Practitioners
            </h2>
          </div>
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <p>
              Our courses are created and taught by IIM alumni and seasoned industry practitioners who understand both strategic principles and practical execution.
            </p>
            <p>
              We bring actual corporate and entrepreneurial perspectives directly to your learning experience, preparing you for what comes next in your career.
            </p>
          </div>
        </div>

        {/* Section 3: 30+ Years Heritage */}
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-6">
          <div className="flex gap-4 items-center">
            <div className="h-12 w-12 bg-[#014a62]/10 rounded-2xl flex items-center justify-center text-[#014a62] shrink-0">
              <Compass className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#014a62]">
              30+ Years of Aviation, Learning & Technology Experience
            </h2>
          </div>
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <p>
              Built upon three decades of experience where performance, discipline, and quality matter. Whether you want to excel in your current role or prepare for a new direction, Airbharath LMS equips you with the confidence and skills to succeed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
