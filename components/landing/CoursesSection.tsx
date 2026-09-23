"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LayoutGrid, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";

interface CoursesSectionProps {
  dbCourses?: any[];
}

export function CoursesSection({ dbCourses = [] }: CoursesSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Programs" },
    { id: "combo", label: "Combo Pass" },
    { id: "ai", label: "AI & Productivity" },
    { id: "marketing", label: "Digital Marketing" },
    { id: "business", label: "Entrepreneurship" },
  ];

  const filteredCourses = dbCourses.filter((course) => {
    if (activeCategory === "all") return true;
    const title = (course.title || "").toLowerCase();
    const slug = (course.slug || "").toLowerCase();
    const categoryName = (course.category?.name || "").toLowerCase();

    if (activeCategory === "combo") return slug.includes("combo") || title.includes("combo");
    if (activeCategory === "ai") return slug.includes("ai") || title.includes("ai");
    if (activeCategory === "marketing") return slug.includes("content") || slug.includes("marketing") || title.includes("marketing");
    if (activeCategory === "business") return slug.includes("entrepreneurship") || slug.includes("office") || title.includes("entrepreneurship");
    return true;
  });

  return (
    <section id="courses" className="py-16 sm:py-24 bg-muted/20 border-b border-border">
      <div className="container mx-auto px-4 max-w-7xl space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Certificate Programs</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight">
              Featured Certificate Programs
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
              High-impact, practical skill tracks built with structured video curriculums, practical assignments, and verifiable digital credentials.
            </p>
          </div>

          <Button
            asChild
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 font-bold h-11 px-5 rounded-xl shrink-0 self-start md:self-auto"
          >
            <Link href="/courses" className="flex items-center gap-2">
              <span>View All Programs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Category Pills Filter */}
        {dbCourses.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Course Cards Grid */}
        {filteredCourses.length > 0 ? (
          <div key={activeCategory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-fade-in">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={{
                  id: course.id,
                  title: course.title,
                  description: course.description,
                  thumbnailUrl: course.thumbnailUrl || course.thumbnail_url,
                  price: course.price,
                  accessDays: course.accessDays || course.access_days || 365,
                  badge: course.badge || (course.slug?.includes("combo") ? "★ Best Value Bundle" : "Certificate Program"),
                  category: course.category,
                  instructor: course.instructor || { fullName: "IIM Alumni Faculty" },
                }}
                href={`/courses/${course.slug || course.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="text-base font-bold text-foreground">No courses found</h3>
            <p className="text-xs text-muted-foreground">Try selecting another category filter above.</p>
          </div>
        )}

        {/* Bottom Catalog Discovery Strip */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm sm:text-base font-bold text-foreground font-outfit">
              Looking for the complete skill set?
            </h4>
            <p className="text-xs text-muted-foreground">
              Enroll in the All-in-One Masterclass Combo Pass and gain access to all 4 certificate courses.
            </p>
          </div>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-5 rounded-xl shrink-0 active:scale-95 transition-all"
          >
            <Link href="/courses/combo-pack">Explore Combo Pass</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
