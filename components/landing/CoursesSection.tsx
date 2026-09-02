"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Users, BookOpen, Sparkles, GraduationCap, Briefcase, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoursesSectionProps {
  dbCourses?: any[];
}

const COURSES_DATA = [
  {
    code: "01",
    id: "content-creation",
    title: "CONTENT CREATION & DIGITAL MARKETING",
    subtitle: "Create. Communicate. Grow.",
    description:
      "Learn the fundamentals of creating meaningful digital content and understanding how brands, creators and businesses build their presence online.",
    topics: [
      "Content creation fundamentals",
      "Digital marketing basics",
      "Social media content",
      "Building a digital presence",
      "Content strategy",
    ],
    whoFor:
      "Students, aspiring creators, entrepreneurs, professionals, aviation professionals and anyone looking to build digital communication skills.",
    icon: Sparkles,
    slug: "ppl-theory-navigation",
  },
  {
    code: "02",
    id: "ai-skills",
    title: "AI SKILLS FOR THE FUTURE OF WORK",
    subtitle: "Don’t Just Hear About AI. Learn to Use It.",
    description:
      "Artificial Intelligence is changing how people work. Build a practical understanding of AI and learn how AI tools can support productivity, content creation, research and everyday professional tasks.",
    topics: [
      "AI fundamentals",
      "Practical AI tools",
      "Effective prompting",
      "AI-assisted productivity",
      "Using AI responsibly at work",
    ],
    whoFor:
      "Students, professionals, job seekers, entrepreneurs and anyone who wants to become more confident working with AI.",
    icon: GraduationCap,
    slug: "cpl-meteorology-instruments",
  },
  {
    code: "03",
    id: "entrepreneurship",
    title: "ENTREPRENEURSHIP BASICS",
    subtitle: "Have an Idea? Learn What Comes Next.",
    description:
      "An idea is only the beginning. Understand the fundamentals of entrepreneurship and learn how to think through an opportunity, understand customers and begin structuring a business idea.",
    topics: [
      "Entrepreneurial thinking",
      "Identifying opportunities",
      "Understanding customers",
      "Basic business planning",
      "Structuring and communicating your idea",
      "Fundamentals of starting a venture",
    ],
    whoFor:
      "Aspiring entrepreneurs, students, working professionals and anyone exploring the possibility of building something of their own.",
    icon: Briefcase,
    slug: "ppl-theory-navigation",
  },
  {
    code: "04",
    id: "ms-office",
    title: "MS OFFICE ESSENTIALS",
    subtitle: "Master the Tools You Use at Work.",
    description:
      "Word, Excel and PowerPoint remain fundamental to professional life. Build confidence in the tools used every day to create documents, work with information and communicate ideas professionally.",
    topics: [
      "Microsoft Word",
      "Microsoft Excel",
      "Microsoft PowerPoint",
      "Professional documents",
      "Spreadsheets and data",
      "Effective presentations",
    ],
    whoFor:
      "Students, freshers, job seekers, aviation professionals and working professionals looking to strengthen their workplace productivity skills.",
    icon: LayoutGrid,
    slug: "cpl-meteorology-instruments",
  },
];

export function CoursesSection({ dbCourses = [] }: CoursesSectionProps) {
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
  const activeCourse = COURSES_DATA[selectedCourseIndex];
  const Icon = activeCourse.icon;

  // Match with actual DB course if available
  const matchingDbCourse = dbCourses.find((c: any) =>
    c.title.toLowerCase().includes(activeCourse.title.toLowerCase().substring(0, 10))
  ) || dbCourses[selectedCourseIndex % (dbCourses.length || 1)];

  const courseHref = matchingDbCourse
    ? `/courses/${matchingDbCourse.slug || matchingDbCourse.id}`
    : `/courses/${activeCourse.slug}`;

  return (
    <section id="courses" className="py-20 bg-white border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Curriculum Offering
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
            Four Courses. Multiple Possibilities.
          </h2>
          <p className="text-base text-slate-700 font-sans leading-relaxed">
            Whether you’re looking to strengthen your current career, prepare for a career switch, explore entrepreneurship or simply become more digitally capable — start with the skill you need most.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-100/80 p-2 rounded-2xl border border-slate-200/80">
          {COURSES_DATA.map((course, idx) => {
            const isSelected = selectedCourseIndex === idx;
            return (
              <button
                key={course.code}
                onClick={() => setSelectedCourseIndex(idx)}
                className={`p-3.5 rounded-xl text-left transition-all duration-300 font-sans flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#014a62] text-white shadow-md shadow-[#014a62]/20 font-semibold"
                    : "bg-transparent text-slate-700 hover:bg-white/80 hover:text-[#014a62]"
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-90 mb-1">
                  <span className="font-mono font-bold">{course.code}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />}
                </div>
                <h4 className="text-xs md:text-sm font-bold truncate">{course.title}</h4>
              </button>
            );
          })}
        </div>

        {/* Detailed Selected Course Showcase Card */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-8 md:p-12 shadow-xl space-y-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            
            {/* Left Course Specs */}
            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3 py-1 rounded-full border border-[#014a62]/20">
                    Course {activeCourse.code} of 04
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Active Program
                  </span>
                </div>

                <h3 className="text-2xl md:text-4xl font-bold font-instrument-serif text-[#014a62]">
                  {activeCourse.title}
                </h3>
                <p className="text-base font-semibold text-slate-800 italic">
                  {activeCourse.subtitle}
                </p>
              </div>

              <p className="text-sm md:text-base text-slate-700 leading-relaxed font-sans font-normal">
                {activeCourse.description}
              </p>

              {/* What You'll Learn */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#014a62] flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>You’ll learn about:</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeCourse.topics.map((topic, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs md:text-sm text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who Is It For? */}
              <div className="p-4 rounded-2xl bg-white border border-[#014a62]/15 space-y-1.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#014a62] flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Who is it for?</span>
                </h4>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-normal">
                  {activeCourse.whoFor}
                </p>
              </div>
            </div>

            {/* Right Interactive Sidebar Action */}
            <div className="w-full lg:w-80 bg-white rounded-2xl p-7 border border-slate-200/90 shadow-lg flex flex-col justify-between space-y-6 shrink-0">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#014a62]/10 text-[#014a62] flex items-center justify-center">
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold font-instrument-serif text-[#014a62]">{activeCourse.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">Air Bharath Certificate Course</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Access Duration:</span>
                    <span className="font-bold text-[#014a62]">Full Self-Paced</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Instructors:</span>
                    <span className="font-bold text-[#014a62]">IIM Alumni</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Certificate:</span>
                    <span className="font-bold text-emerald-700">QR Verifiable</span>
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full bg-[#014a62] hover:bg-[#01374a] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-md">
                <Link href={courseHref}>
                  <span>Explore Course</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
