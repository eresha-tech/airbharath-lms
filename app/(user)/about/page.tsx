import { GraduationCap, BookOpen, Users, Compass } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-28 max-w-4xl min-h-screen text-foreground bg-background">
      {/* Header Info */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <GraduationCap className="h-4 w-4" /> About Us
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
          Industry-Ready Internship Institute (IRII)
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Welcome to the Industry-Ready Internship Institute—a specialized EdTech platform on a mission to bridge the massive gap between traditional academic theory and the rigorous demands of the modern construction industry.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-12">
        {/* Intro Highlight */}
        <div className="p-8 bg-muted/20 border border-border/60 rounded-3xl text-center">
          <p className="text-sm md:text-base font-semibold text-foreground leading-relaxed">
            We are dedicated to transforming civil and structural engineering graduates into highly skilled, day-one productive professionals.
          </p>
        </div>

        {/* Section 1: Our Approach */}
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-6">
          <div className="flex gap-4 items-center">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">
              Our Approach: Premium Industry Knowledge, On-Demand
            </h2>
          </div>
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <p>
              We believe that true engineering excellence requires more than just textbook learning. To make premium structural engineering education accessible to students in every corner of the nation, we offer a comprehensive library of specialized, recorded training sessions.
            </p>
            <p>
              Our highly structured, self-paced courses dive deep into advanced structural concepts (Steel, RCC, PEB, and Foundations) and industry-standard software. Instead of just teaching basic software commands, our recorded modules teach you how to practically apply these tools to real-world structural designs—from high-rises to industrial equipment.
            </p>
          </div>
        </div>

        {/* Section 2: Led by Elites */}
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-6">
          <div className="flex gap-4 items-center">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">
              Led by Industry Elites
            </h2>
          </div>
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <p>
              Founded by an <strong>IIT Roorkee and IIM Calcutta</strong> alumnus, our curriculum is engineered by a core team of ex-L&T structural engineering veterans.
            </p>
            <p>
              We bring actual corporate thinking directly to your screen, teaching you how to analyse and solve problems exactly like a working professional on a live project.
            </p>
          </div>
        </div>

        {/* Section 3: Pathway to Career */}
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-6">
          <div className="flex gap-4 items-center">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <Compass className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">
              Your Pathway to an Industry-Ready Career
            </h2>
          </div>
          <div className="space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
            <p>
              Our foundational and advanced recorded modules deliver the exact technical mastery that top EPC firms are actively looking to hire.
            </p>
            <p>
              By learning at your own pace, you will build the technical clarity needed to create a verifiable project portfolio, ace technical interviews, and successfully accelerate your transition into a high-paying structural engineering career.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
