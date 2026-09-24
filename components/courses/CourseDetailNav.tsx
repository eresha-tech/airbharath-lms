"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen, Award, Users, FileCheck2, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseDetailNavProps {
  hasInstructors: boolean;
  hasRequirements: boolean;
  isEnrolled: boolean;
  courseId: string;
  isBundle: boolean;
  price: number;
  resumeLessonId?: string | null;
}

export function CourseDetailNav({
  hasInstructors,
  hasRequirements,
  isEnrolled,
  courseId,
  isBundle,
  price,
  resumeLessonId,
}: CourseDetailNavProps) {
  const [activeSection, setActiveSection] = useState<string>("course-overview");
  const [showStickyCta, setShowStickyCta] = useState<boolean>(false);

  useEffect(() => {
    const sectionIds = ["course-overview", "course-curriculum"];
    if (hasInstructors) sectionIds.push("course-instructors");
    if (hasRequirements) sectionIds.push("course-requirements");

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      setShowStickyCta(window.scrollY > 480);

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasInstructors, hasRequirements]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const navItems = [
    { id: "course-overview", label: "Overview", icon: BookOpen },
    { id: "course-curriculum", label: isBundle ? "Programs" : "Curriculum", icon: Award },
    ...(hasInstructors ? [{ id: "course-instructors", label: "Instructors", icon: Users }] : []),
    ...(hasRequirements ? [{ id: "course-requirements", label: "Requirements", icon: FileCheck2 }] : []),
  ];

  const continueLearningUrl = isBundle
    ? "/my-courses"
    : resumeLessonId
    ? `/dashboard/courses/${courseId}/lessons/${resumeLessonId}`
    : `/dashboard/courses/${courseId}`;

  return (
    <div className="sticky top-14 md:top-16 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border/80 transition-all">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between gap-4 py-2">
          {/* Horizontal Navigation Links */}
          <nav
            aria-label="Course Sections"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -my-1"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Mini Header CTA visible when scrolling past hero */}
          <div
            className={cn(
              "hidden md:flex items-center gap-3 transition-opacity duration-300 shrink-0",
              showStickyCta ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          >
            {!isEnrolled ? (
              <div className="flex items-center gap-3">
                <span className="font-outfit font-bold text-sm text-foreground">
                  {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                </span>
                <Button
                  size="sm"
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4 rounded-xl shadow-xs cursor-pointer"
                >
                  <a
                    href="#pricing-card"
                    onClick={(e) => scrollToSection(e, "pricing-card")}
                  >
                    <span>Enroll Now</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </a>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4 rounded-xl shadow-xs cursor-pointer"
              >
                <Link href={continueLearningUrl}>
                  <PlayCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Continue Learning</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
