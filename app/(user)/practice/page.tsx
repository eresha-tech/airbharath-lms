import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  FlaskConical,
  Bot,
  Brain,
  MessageSquareCode,
  Terminal,
  CheckCircle2,
  Cpu,
  Briefcase,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  Lightbulb,
  Target,
  ShieldCheck,
  Zap,
  Timer,
  GitBranch,
  Compass,
  BarChart3,
  Share2,
  Rocket,
  Users,
  BookOpen,
  ArrowRight,
  ArrowDown,
  Lock,
  Check,
  GraduationCap,
  PlayCircle,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Practice Lab (Preview) · AirBharath LMS",
  description:
    "Practice what you learn. Build skills by doing, not just watching. Experience interactive practice, AI roleplays, real-world case challenges, and instant skill checks.",
};

export default function PracticeLabPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden border-b border-border/40">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/15 dark:bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[250px] bg-accent/10 dark:bg-accent/5 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Coming Soon · Practice Lab Preview</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-outfit tracking-tight text-foreground leading-[1.12]">
              Practice what you learn. <br />
              <span className="bg-gradient-to-r from-primary via-primary/85 to-primary/60 bg-clip-text text-transparent">
                Build skills by doing,
              </span>{" "}
              not just watching.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Turn theoretical concepts into workplace-ready mastery. The upcoming AirBharath Practice Lab will bring interactive simulations, AI roleplays, real-world case challenges, and instant skill checks directly into your learning flow.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm h-11 px-6 text-sm"
              >
                <a href="#categories" className="flex items-center gap-2">
                  <span>Explore Practice Categories</span>
                  <ArrowDown className="w-4 h-4" />
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-semibold rounded-xl h-11 px-6 text-sm"
              >
                <Link href="/courses" className="flex items-center gap-2">
                  <span>Browse Courses</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </Button>
            </div>

            {/* Highlights Strip */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              {[
                { label: "Interactive Practice", icon: FlaskConical },
                { label: "AI Roleplays", icon: Bot },
                { label: "Real Scenarios", icon: Briefcase },
                { label: "Instant Skill Checks", icon: Target },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-2xs hover:border-primary/30 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground/90 leading-tight">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMING SOON PHILOSOPHY BANNER */}
      <section className="py-12 bg-muted/40 border-b border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl bg-card border border-primary/25 p-6 sm:p-8 shadow-xs">
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Brain className="w-4 h-4" />
                  <span>The Learning Philosophy</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                  Your courses teach you the concepts. Practice Lab will help you turn those concepts into real-world skills.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Passive watching creates familiarity; active deliberate practice creates competence. Practice Lab will bridge the gap between classroom comprehension and confident on-the-job execution.
                </p>
              </div>

              <div className="shrink-0">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>In Active Development</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRACTICE CATEGORIES (PREVIEWS) */}
      <section id="categories" className="py-16 md:py-24 space-y-16">
        <div className="container mx-auto px-4 max-w-6xl space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Future Learning Experiences</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-outfit text-foreground tracking-tight">
              Explore Upcoming Practice Formats
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Designed from the ground up to give you varied, engaging ways to test and reinforce your knowledge.
            </p>
          </div>

          {/* Group 1: Practice with AI */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                    Practice with AI
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Simulated dynamic conversations, intelligent evaluations, and interactive scenarios.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-primary/80 uppercase tracking-wider self-start sm:self-auto bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                AI Powered
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "AI Roleplay",
                  icon: MessageSquareCode,
                  tag: "Conversations",
                  desc: "Practice realistic workplace conversations, stakeholder negotiations, and customer interactions with adaptive AI personas.",
                  features: ["Realistic personas", "Immediate critique", "Scenario branches"],
                },
                {
                  title: "AI Challenges",
                  icon: Terminal,
                  tag: "Problem Tasks",
                  desc: "Tackle prompt engineering challenges, workflow automation tasks, and structured technical problem prompts.",
                  features: ["Hands-on prompts", "Adaptive difficulty", "Solution insights"],
                },
                {
                  title: "AI Evaluator",
                  icon: CheckCircle2,
                  tag: "Analysis",
                  desc: "Submit your exercise drafts, presentations, or spreadsheet models for instant rubric-based diagnostic feedback.",
                  features: ["Rubric analysis", "Strengths & gaps", "Actionable tips"],
                },
                {
                  title: "AI Simulations",
                  icon: Cpu,
                  tag: "Sandboxes",
                  desc: "Step into reactive sandbox environments where business variables change dynamically based on your decisions.",
                  features: ["Dynamic variables", "Outcome tracking", "Risk analysis"],
                },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/70 p-5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                          Coming Soon
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {card.tag}
                        </span>
                        <h4 className="text-base font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border/50 space-y-1.5">
                      {card.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Check className="w-3 h-3 text-primary shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 2: Real-World Challenges */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                    Real-World Challenges
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Practical business dilemmas, multi-department case studies, and realistic deliverables.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-primary/80 uppercase tracking-wider self-start sm:self-auto bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Industry Modeled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Business Scenarios",
                  icon: TrendingUp,
                  tag: "Strategy",
                  desc: "Solve structured commercial problems, budget allocations, and market expansion decisions modeled on real companies.",
                  features: ["Financial modeling", "Strategic tradeoffs", "Executive memos"],
                },
                {
                  title: "Case Studies",
                  icon: Layers,
                  tag: "Deep Dives",
                  desc: "Analyze operational bottlenecks, competitive disruptions, and growth opportunities across real enterprise examples.",
                  features: ["Multi-phase briefs", "Root cause audits", "Action roadmaps"],
                },
                {
                  title: "Task Challenges",
                  icon: FileSpreadsheet,
                  tag: "Execution",
                  desc: "Deliver concrete workplace work-products: audit spreadsheets, email campaigns, and project scopes.",
                  features: ["File deliverables", "Spec alignment", "Standard formats"],
                },
                {
                  title: "Problem Solving",
                  icon: Lightbulb,
                  tag: "Critical Thinking",
                  desc: "Unpack ambiguous business roadblocks into clear, structured logical frameworks to deliver measurable results.",
                  features: ["Structured logic", "Root-cause trees", "Decision matrix"],
                },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/70 p-5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                          Coming Soon
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {card.tag}
                        </span>
                        <h4 className="text-base font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border/50 space-y-1.5">
                      {card.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Check className="w-3 h-3 text-primary shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 3: Skill Practice */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                    Skill Practice
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Diagnostic check-ins, timed sprints, and progressive learning tracks.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-primary/80 uppercase tracking-wider self-start sm:self-auto bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Core Mastery
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Skill Checks",
                  icon: ShieldCheck,
                  tag: "Diagnostics",
                  desc: "Validate comprehension with focused checkpoints immediately following core lecture milestones.",
                  features: ["Post-lesson checks", "Instant explanations", "Concept mapping"],
                },
                {
                  title: "Quick Practice",
                  icon: Zap,
                  tag: "Bite-Sized",
                  desc: "5-minute focused drills designed to reinforce muscle memory without disrupting your daily routine.",
                  features: ["5-min drills", "Daily retention", "Focused concepts"],
                },
                {
                  title: "Timed Challenges",
                  icon: Timer,
                  tag: "Pacing",
                  desc: "Build execution speed, focus, and analytical composure under realistic countdown pressure.",
                  features: ["Pacing practice", "Time management", "Clarity under clock"],
                },
                {
                  title: "Practice Paths",
                  icon: GitBranch,
                  tag: "Tracks",
                  desc: "Follow curated progressive skill pathways mapped directly to specific career milestones.",
                  features: ["Step-by-step maps", "Milestone checkpoints", "Role pathways"],
                },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/70 p-5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                          Coming Soon
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {card.tag}
                        </span>
                        <h4 className="text-base font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border/50 space-y-1.5">
                      {card.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Check className="w-3 h-3 text-primary shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRACTICE BY SKILL (DOMAINS) */}
      <section className="py-16 md:py-20 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-4 max-w-6xl space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Centralized Learning</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-outfit text-foreground tracking-tight">
              Practice Across Core Career Domains
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Practice Lab will support focused exercises across all major AirBharath learning tracks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                title: "Artificial Intelligence",
                icon: Sparkles,
                topics: ["Prompt Engineering", "Workflow Automation", "LLM Integration", "AI Workflows"],
                badge: "AI Track",
              },
              {
                title: "Excel & Data Mastery",
                icon: BarChart3,
                topics: ["Advanced Formulas", "Financial Modeling", "Pivot Dashboards", "Data Cleaning"],
                badge: "Analytics Track",
              },
              {
                title: "Digital Marketing",
                icon: Share2,
                topics: ["Performance Ads", "Funnel Optimization", "SEO Strategy", "Campaign Analytics"],
                badge: "Growth Track",
              },
              {
                title: "Entrepreneurship",
                icon: Rocket,
                topics: ["Pitch Deck Crafting", "Unit Economics", "MVP Validation", "Go-To-Market"],
                badge: "Venture Track",
              },
              {
                title: "Communication & Leadership",
                icon: Users,
                topics: ["Executive Presentations", "Conflict Resolution", "Negotiation", "Team Alignment"],
                badge: "Soft Skills Track",
              },
              {
                title: "Business Strategy",
                icon: Target,
                topics: ["Market Analysis", "Pricing Strategy", "Operations Audits", "Decision Frameworks"],
                badge: "Strategy Track",
              },
            ].map((domain, idx) => {
              const Icon = domain.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-card border border-border/70 p-6 space-y-4 hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-primary bg-primary/10 border border-primary/20">
                      {domain.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground">
                      {domain.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {domain.topics.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground/80 border border-border/50"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. FUTURE EXPERIENCE PREVIEW: THE LEARNING LOOP */}
      <section className="py-16 md:py-24 border-b border-border/40">
        <div className="container mx-auto px-4 max-w-5xl space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>The Complete Mastery Loop</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-outfit text-foreground tracking-tight">
              How Practice Lab Connects With Your Courses
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              A structured continuous loop designed to turn knowledge into practical competence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {[
              {
                step: "01",
                title: "Learn",
                icon: BookOpen,
                desc: "Absorb core principles, industry frameworks, and structured lectures in your course.",
              },
              {
                step: "02",
                title: "Practice",
                icon: FlaskConical,
                desc: "Apply concepts immediately in interactive scenario sandboxes and prompt challenges.",
              },
              {
                step: "03",
                title: "Get Feedback",
                icon: Sparkles,
                desc: "Receive structured diagnostics, rubric reviews, and instant pointers for refinement.",
              },
              {
                step: "04",
                title: "Improve",
                icon: TrendingUp,
                desc: "Iterate on targeted drills to solidify muscle memory and workplace confidence.",
              },
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="relative rounded-2xl bg-card border border-border/70 p-6 space-y-4 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold font-outfit text-primary/30">
                      {step.step}
                    </span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold font-outfit text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. COURSE INTEGRATION PREVIEW MOCKUP */}
      <section className="py-16 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Classroom Integration Preview
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-outfit text-foreground">
              Seamless Integration Inside Your Classroom
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              When Practice Lab launches, each lesson will offer an inline &ldquo;Practice this skill&rdquo; drawer.
            </p>
          </div>

          {/* Visual Concept Card */}
          <div className="rounded-2xl bg-card border border-border/80 p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Lesson 1.2 · AI Prompt Engineering
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">
                    Role-Task-Context Framework in Practice
                  </h4>
                </div>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Practice Available</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/60 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  <span>Interactive Lab: Craft an Executive Briefing Prompt</span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Apply the framework learned in this video to draft and test prompts with simulated persona responses.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  disabled
                  size="sm"
                  className="bg-primary/20 text-primary cursor-not-allowed font-semibold text-xs rounded-xl"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  <span>Preview Only</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. STUDENT MOTIVATION / VALUE PROPOSITION */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Why Practice Matters
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-outfit text-foreground tracking-tight">
              Learn by Doing. Build Lasting Confidence.
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Transform passive course comprehension into confident, repeatable execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Active Retention",
                icon: Brain,
                desc: "Applying concepts immediately in structured exercises cements long-term memory far better than watching alone.",
              },
              {
                title: "Zero-Risk Sandboxes",
                icon: ShieldCheck,
                desc: "Experiment, make mistakes, and test alternative solutions in safe environments before executing in real workplace stakes.",
              },
              {
                title: "Workplace Readiness",
                icon: GraduationCap,
                desc: "Step into interviews, client engagements, and daily deliverables with tested, demonstrated practical capabilities.",
              },
            ].map((val, idx) => {
              const Icon = val.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-card border border-border/70 p-6 space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold font-outfit text-foreground">
                    {val.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. PRE-LAUNCH CALL TO ACTION */}
      <section className="py-16 bg-muted/40 border-t border-border/40">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
          <div className="space-y-3 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-outfit text-foreground">
              Start Learning Today. Be Ready When Practice Lab Launches.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Explore our curriculum of high-impact masterclasses and build your foundational skills right away.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-6 text-sm shadow-xs"
            >
              <Link href="/courses" className="flex items-center gap-2">
                <span>Explore Courses Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-semibold rounded-xl h-11 px-6 text-sm"
            >
              <Link href="/faq">Frequently Asked Questions</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
