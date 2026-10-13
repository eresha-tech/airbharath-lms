'use client';

import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, CircleDollarSign, Layers3, ListChecks, Plane, Play, ShieldCheck, Users, BarChart3, Compass, GraduationCap, Wrench, Headphones, Building2, Radio, HeartHandshake, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { trackWorkspace } from '@/lib/workspace/analytics';

const journey = [
  ['Create', 'Prepare private aviation course structures. Media uploads and resources are planned for the full launch.'],
  ['Price', 'You decide what your course is worth, subject to platform policies.'],
  ['Review', 'AirBharath reviews courses for legitimacy, platform suitability and quality standards.'],
  ['Publish', 'Publication of approved courses is planned for the full Workspace launch.'],
  ['Share', 'Introduce courses to your audience, students and professional network.'],
  ['Teach & Grow', 'Manage learners and grow your course portfolio.'],
];
const capabilities = [
  [BookOpen, 'Build structured courses', 'Prepare private modules and lessons. Media uploads and resources are planned for the full launch.'],
  [Layers3, 'Create multiple courses', 'Build a portfolio around your aviation expertise.'],
  [CircleDollarSign, 'Set your own price', 'Decide your course pricing, subject to applicable platform policies.'],
  [ShieldCheck, 'Sell without building the infrastructure', 'Workspace will support the learner purchase and enrollment experience.'],
  [Users, 'Know your learners', 'Understand enrolled learners and their progress.'],
  [BarChart3, 'Understand performance', 'Course, learner and sales insights as the product develops.'],
] as const;
const categories = [
  [Plane, 'Pilot & Flight Operations'], [HeartHandshake, 'Cabin Crew'], [Wrench, 'Aircraft Maintenance & Engineering'],
  [Building2, 'Airport & Ground Operations'], [ShieldCheck, 'Aviation Safety & Quality'], [LockKeyhole, 'Aviation Security'],
  [Compass, 'Aviation Management'], [Headphones, 'Aviation Hospitality / Customer Experience'], [Radio, 'Drone / UAV'],
  [GraduationCap, 'Aviation Careers'], [ShieldCheck, 'Defence Aviation'], [BookOpen, 'Other aviation specializations'],
] as const;
const selection = [
  ['Sign in', 'Use your normal AirBharath account.'],
  ['Check eligibility', 'Complete the short, self-declared aviation eligibility check.'],
  ['Get your result', 'See your eligibility validity or next reapplication date.'],
  ['Activate Workspace', 'Review membership prices and terms. Payments await launch verification.'],
  ['Build', 'After verified activation, prepare a private creator profile and course structure.'],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">{children}</p>;
}
function ApplyLink({ label = 'Become a Creator', className = '', entryPoint = 'hero' }: { label?: string; className?: string; entryPoint?: 'hero' | 'founding_cohort' }) {
  return <Button asChild className={`h-auto min-h-12 whitespace-normal rounded-xl px-6 py-3 text-sm ${className}`}>
    <a href="/workspace/apply" onClick={() => trackWorkspace('workspace_apply_clicked', undefined, undefined, { entryPoint })}>{label}<ArrowUpRight aria-hidden="true" /></a>
  </Button>;
}

export function WorkspaceLanding() {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) { tracked.current = true; trackWorkspace('workspace_page_view'); }
  }, []);
  return (
    <div className="workspace-page ph-no-capture overflow-hidden pt-16">
      <a href="#workspace-main" className="fixed left-4 top-20 z-50 -translate-y-40 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring">Skip to Workspace content</a>
      <section className="relative border-b border-border">
        <div aria-hidden="true" className="workspace-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-28">
          <div className="workspace-animate">
            <div className="mb-8 flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="tracking-[.18em]">AIRBHARATH WORKSPACE</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5"><span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />Founding Creator Program</span>
            </div>
            <h1 id="workspace-main" tabIndex={-1} className="workspace-heading max-w-2xl rounded-lg text-[2.6rem] font-semibold leading-[1.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-6xl lg:text-[4.2rem]">Built for aviation professionals who have <span className="text-[#6358c8] dark:text-primary">something worth teaching.</span></h1>
            <p className="workspace-copy mt-7 max-w-xl text-base leading-8 text-muted-foreground">Turn your aviation expertise into structured courses, set your own price, bring your audience, and build your learning business — powered by AirBharath Workspace.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ApplyLink />
              <Button variant="outline" asChild className="h-auto min-h-12 whitespace-normal rounded-xl px-5 py-3"><a href="#how-workspace-works">See how Workspace works<ArrowDown aria-hidden="true" /></a></Button>
            </div>
            <p className="mt-5 max-w-lg text-xs leading-6 text-muted-foreground">Applications are currently open to aviation professionals for our Founding Creator cohort.</p>
          </div>
          <div className="workspace-animate relative self-center" style={{ animationDelay: '100ms' }}>
            <div className="relative rounded-[2rem] border border-border bg-card p-5 shadow-[0_24px_80px_-35px_rgba(26,23,64,.3)] sm:p-7">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <span className="flex items-center gap-2 font-outfit font-semibold"><Plane className="size-5 text-[#6358c8] dark:text-primary" aria-hidden="true" />Your expertise. A new direction.</span>
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">01 / CONCEPT</span>
              </div>
              <div className="relative my-7 rounded-2xl bg-[#1a1740] px-6 py-8 text-white">
                <svg aria-hidden="true" viewBox="0 0 400 140" className="absolute inset-0 h-full w-full opacity-40"><path d="M-20 145 Q100 -70 245 75 T450 10" fill="none" stroke="#9089FF" strokeWidth="1.5" strokeDasharray="5 6" /><circle cx="250" cy="76" r="8" fill="none" stroke="#D2CEFF" /></svg>
                <p className="relative text-[10px] font-bold uppercase tracking-[.2em] text-[#D2CEFF]">A course shaped by experience</p>
                <h2 className="relative mt-4 max-w-xs text-2xl font-medium sm:text-3xl">Your next chapter<br />starts with what you know.</h2>
                <div className="relative mt-7 flex flex-wrap items-center gap-2 text-xs text-slate-200"><BookOpen className="size-4" aria-hidden="true" />Your content<ArrowRight className="mx-1 size-3 text-[#D2CEFF]" aria-hidden="true" />Their next step</div>
              </div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">A structured learning journey</p>
              {['Share the foundations', 'Bring real-world perspective', 'Turn knowledge into practice'].map((item, i) => <div key={item} className="flex items-center gap-3 border-t border-border py-3"><span className="font-mono text-xs text-muted-foreground">0{i + 1}</span><span className="flex-1 text-sm font-medium">{item}</span>{i === 0 ? <Play className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <ListChecks className="size-4 text-muted-foreground" aria-hidden="true" />}</div>)}
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Illustration of the planned experience. Creator tools are in development. Future courses will be co-branded with you and AirBharath.</p>
            </div>
            <div className="mx-5 -mt-1 flex items-center gap-3 rounded-b-2xl border border-t-0 border-primary/30 bg-primary/10 px-5 py-4"><ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-[#6358c8] dark:text-primary" /><p className="text-xs leading-5">Selected creators. Individually reviewed courses.<br /><span className="font-semibold">A platform built around aviation expertise.</span></p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div><Eyebrow>The idea behind Workspace</Eyebrow><h2 className="workspace-heading text-3xl font-semibold leading-tight sm:text-4xl">You already have the expertise.<br /><span className="text-muted-foreground">You shouldn&apos;t have to build the technology too.</span></h2><p className="mt-6 text-sm leading-7 text-muted-foreground">Websites, video hosting, payments, learner access and progress tracking can become a separate business. Workspace is being created so you can focus on teaching.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-6 sm:p-8"><span className="font-mono text-xs text-muted-foreground">01 / YOUR PART</span><h3 className="mt-5 text-xl font-semibold">You bring</h3><ul className="mt-5 space-y-4">{['Expertise', 'Course idea', 'Content', 'Audience'].map(t => <li key={t} className="flex items-center gap-3 text-sm"><Check className="size-4 text-[#6358c8] dark:text-primary" aria-hidden="true" />{t}</li>)}</ul></div>
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 sm:p-8"><span className="font-mono text-xs text-muted-foreground">02 / THE VISION</span><h3 className="mt-5 text-xl font-semibold">Workspace powers</h3><ul className="mt-5 space-y-3">{['Course delivery', 'Student access', 'Payments', 'Learning experience', 'Progress tracking', 'Analytics'].map(t => <li key={t} className="flex items-center gap-3 text-sm"><span className="size-1 rounded-full bg-foreground/60" aria-hidden="true" />{t}</li>)}</ul></div>
          </div>
        </div>
        <p className="mt-7 text-xs leading-6 text-muted-foreground lg:text-right">Workspace is being built to provide these capabilities. Today, we&apos;re accepting creator applications.</p>
      </section>

      <section id="how-workspace-works" className="workspace-section border-y border-border bg-muted/30 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl"><Eyebrow>The future creator journey</Eyebrow><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><h2 className="workspace-heading max-w-xl text-3xl font-semibold sm:text-4xl">From expertise to your own course business.</h2><span className="text-xs text-muted-foreground">Planned for future Workspace phases</span></div>
          <ol className="mt-12 grid gap-x-9 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{journey.map(([title, copy], i) => <li key={title} className="border-t border-border pt-5"><div className="flex items-center justify-between"><span className="font-mono text-sm text-[#6358c8] dark:text-primary">0{i + 1}</span><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" /></div><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">{copy}</p></li>)}</ol>
          <p className="mt-10 border-l-2 border-primary pl-4 text-xs leading-6 text-muted-foreground">AirBharath review is a platform quality review. It does not constitute DGCA, airline, government or regulatory approval.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <Eyebrow>Built around your teaching</Eyebrow><h2 className="workspace-heading text-3xl font-semibold sm:text-4xl">One Workspace for your aviation courses.</h2><p className="mt-4 text-sm text-muted-foreground">The capabilities we&apos;re building towards.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{capabilities.map(([Icon, title, copy]) => <article key={title} className="rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/50"><Icon className="mb-7 size-6 text-[#6358c8] dark:text-primary" aria-hidden="true" /><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p></article>)}</div>
        <div className="mt-8 flex flex-col gap-3 rounded-xl bg-muted/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-lg font-semibold">And this is only the beginning.</h3><p className="max-w-xl text-xs leading-6 text-muted-foreground">Future capabilities may include aviation-specific AI practice, assessments and creator tools. These are future possibilities, not available features.</p></div>
      </section>

      <section className="border-t border-border px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl"><Eyebrow>Aviation is your domain</Eyebrow><h2 className="workspace-heading text-3xl font-semibold sm:text-4xl">Built specifically for aviation expertise.</h2><div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map(([Icon, title]) => <div key={title} className="flex items-center gap-3 rounded-xl border border-border px-4 py-4 text-sm"><Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />{title}</div>)}</div><p className="workspace-heading mt-10 max-w-3xl text-2xl font-medium leading-snug sm:text-3xl">You don&apos;t have to already be a creator.<br /><span className="text-[#6358c8] dark:text-primary">You need expertise worth sharing.</span></p></div>
      </section>

      <section className="mx-5 rounded-[2rem] bg-[#1a1740] px-6 py-14 text-white sm:mx-8 sm:px-12 sm:py-20 xl:mx-auto xl:max-w-[1216px]">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20"><div><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-[#D2CEFF]">The Founding Creator Program</p><h2 className="workspace-heading text-3xl font-semibold leading-tight sm:text-4xl">Become one of the first AirBharath Workspace Creators.</h2><p className="mt-6 text-sm leading-7 text-slate-300">We&apos;re initially opening Workspace to a selected group of aviation professionals. Bring your perspective and help shape what comes next.</p><div className="mt-8"><ApplyLink entryPoint="founding_cohort" /></div></div><ul className="space-y-0">{[['Early access', 'Be among the first to use Workspace when creator tools launch.'], ['Help shape the tools', 'Share feedback grounded in your teaching experience.'], ['Founding Creator recognition', 'Join the first cohort of selected aviation professionals.'], ['Direct onboarding', 'Get started with guidance from the AirBharath team.']].map(([title, copy], i) => <li key={title} className="flex gap-4 border-b border-white/15 py-5 first:pt-0"><span className="mt-1 font-mono text-xs text-[#D2CEFF]">0{i + 1}</span><div><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p></div></li>)}</ul></div>
        <div className="mt-12 border-t border-white/15 pt-7"><p className="text-sm leading-7 text-slate-300"><span className="font-semibold text-white">Your audience is part of the journey.</span> Creators will initially be expected to bring their own audience. AirBharath does not guarantee learners, promotion, course sales or revenue.</p></div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-20">
        <div><Eyebrow>The planned commercial model</Eyebrow><h2 className="workspace-heading text-3xl font-semibold sm:text-4xl">Simple creator membership.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">Compare prepaid 3-, 6- and 12-month creator memberships. Membership prices include 18% GST; eligible creators can review prices and terms before activation. Paid Early Access is targeted for 14 October 2026, subject to launch verification, for private profiles and course preparation. The full Workspace is targeted for 9 November 2026, with media uploads, finished-course review, publication and course sales planned for that release.</p></div>
        <div className="flex flex-col justify-center rounded-2xl border border-primary/30 bg-primary/10 p-8"><CheckCircle2 className="mb-4 size-6 text-[#6358c8] dark:text-primary" aria-hidden="true" /><h3 className="text-2xl font-semibold">No payment is required to apply.</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Workspace payments are awaiting launch verification. Review the membership plans, Creator Terms and Refund Policy before deciding to activate Workspace.</p></div>
      </section>

      <section className="border-y border-border bg-muted/30 px-5 py-20 sm:px-8 sm:py-24"><div className="mx-auto max-w-7xl"><Eyebrow>A considered selection process</Eyebrow><h2 className="workspace-heading text-3xl font-semibold sm:text-4xl">How creator eligibility works</h2><ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">{selection.map(([title, copy], i) => <li key={title}><span className="mb-5 flex size-9 items-center justify-center rounded-full border border-border bg-card font-mono text-xs">0{i + 1}</span><h3 className="text-base font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p></li>)}</ol><div className="mt-9 flex items-start gap-3 rounded-xl border border-border bg-card p-5"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#6358c8] dark:text-primary" aria-hidden="true" /><p className="text-sm leading-6">Eligibility does not activate Workspace or approve a course. Courses will be reviewed separately before publication.</p></div></div></section>

      <section id="apply" className="workspace-section mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
        <div><Eyebrow>Your next chapter</Eyebrow><h2 className="workspace-heading text-3xl font-semibold leading-tight sm:text-4xl">Become a<br />Creator.</h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Tell us about the experience you&apos;ve built and the course you&apos;d like to teach. An idea is enough to start the conversation.</p><ul className="mt-8 space-y-4 text-sm">{['No payment required', 'Use your normal AirBharath account', 'A short automated eligibility check'].map(t => <li key={t} className="flex items-start gap-3"><Check className="mt-0.5 size-4 shrink-0 text-[#6358c8] dark:text-primary" aria-hidden="true" />{t}</li>)}</ul><div className="mt-9 max-w-sm border-t border-border pt-6"><p className="text-xs leading-6 text-muted-foreground">Questions before you apply?<br /><a className="font-semibold text-foreground underline underline-offset-4" href="mailto:academy@airbharath.in">academy@airbharath.in</a></p></div></div>
        <div className="self-center rounded-2xl border border-border bg-card p-8"><h3 className="text-2xl font-semibold">Start with your aviation background.</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">Sign in, complete a short eligibility check, and see your result. Membership payments are awaiting launch verification.</p><div className="mt-7"><ApplyLink /></div><p className="mt-6 text-sm text-muted-foreground">Prefer a detailed team review? <Link href="/workspace/manual-application" className="underline underline-offset-4">Submit a manual application</Link>.</p></div>
      </section>
    </div>
  );
}
