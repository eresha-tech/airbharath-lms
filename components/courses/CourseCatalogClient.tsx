"use client";

import { useState, useMemo, useRef } from "react";
import { Search, X, BookOpen, Compass, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export interface CatalogCourseItem {
  id: string;
  title: string;
  slug?: string | null;
  description: string | null;
  thumbnailUrl?: string | null;
  price: number | string;
  accessDays?: number | null;
  modulesCount?: number;
  lessonsCount?: number;
  badge?: string;
  category?: {
    name: string;
  };
  instructor?: {
    fullName?: string;
    avatar_url?: string | null;
  };
}

interface CourseCatalogClientProps {
  courses: CatalogCourseItem[];
  categories: string[];
}

function matchesCourse(
  course: CatalogCourseItem,
  searchQuery: string,
  selectedCategory: string
): boolean {
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const matchesSearch =
    !normalizedQuery ||
    course.title.toLowerCase().includes(normalizedQuery) ||
    course.description?.toLowerCase().includes(normalizedQuery) ||
    course.slug?.toLowerCase().includes(normalizedQuery);

  const courseCategory =
    course.badge || course.category?.name || "Certificate Program";
  const normalizedCategory = selectedCategory.toLowerCase();
  const matchesCategory =
    selectedCategory === "All Programs" ||
    courseCategory.toLowerCase().includes(normalizedCategory) ||
    normalizedCategory.includes(courseCategory.toLowerCase());

  return Boolean(matchesSearch && matchesCategory);
}

export function CourseCatalogClient({
  courses,
  categories,
}: CourseCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Programs");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const filteredCourses = useMemo(
    () => courses.filter((course) => matchesCourse(course, searchQuery, selectedCategory)),
    [courses, searchQuery, selectedCategory]
  );

  // Debounced search query tracking
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        track("course_search", {
          query_length: val.trim().length,
          results_count: courses.filter((course) => matchesCourse(course, val, selectedCategory)).length,
        });
      }, 600);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    track("course_filter_used", {
      filter_type: "category",
      filter_value: category,
    });
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("All Programs");
    track("course_filter_used", {
      filter_type: "reset",
      filter_value: "All Programs",
    });
  };

  if (courses.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-card border border-dashed border-border rounded-3xl space-y-4 max-w-lg mx-auto shadow-xs">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <BookOpen className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-bold text-lg text-foreground font-outfit">
            No Published Courses Yet
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
            Our upcoming certificate curriculum masterclasses are being prepared. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Search & Filter Controls Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input Box */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, topic, or keyword..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl bg-muted/40 border border-input px-4 py-2.5 pl-10 pr-9 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleReset}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results counter */}
          <div className="text-xs text-muted-foreground font-medium self-end sm:self-center shrink-0">
            Showing <strong className="text-foreground">{filteredCourses.length}</strong> of{" "}
            {courses.length} courses
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleCategorySelect("All Programs")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === "All Programs"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All Programs ({courses.length})
            </button>
            {categories.map((cat) => {
              const count = courses.filter((c) => (c.badge || "Certificate Program") === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredCourses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              href={`/courses/${c.slug || c.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-14 px-4 bg-card border border-dashed border-border rounded-3xl space-y-4 max-w-md mx-auto shadow-xs">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Compass className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-foreground font-outfit">
              No matching courses found
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              We couldn&apos;t find any courses matching your search or category filter.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            Reset All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
