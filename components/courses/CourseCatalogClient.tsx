"use client";

import { useState, useMemo } from "react";
import { Search, X, SlidersHorizontal, BookOpen, Compass } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";

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

export function CourseCatalogClient({
  courses,
  categories,
}: CourseCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Programs");

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Search matching
      const matchesSearch =
        !searchQuery.trim() ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (course.description &&
          course.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      // Category matching
      const courseCategory =
        course.badge || course.category?.name || "Certificate Program";
      const matchesCategory =
        selectedCategory === "All Programs" ||
        courseCategory.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        selectedCategory.toLowerCase().includes(courseCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("All Programs");
  };

  return (
    <div className="space-y-8">
      {/* Search & Filter Controls Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input Box */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search courses by keyword or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-muted/40 border border-input px-4 py-2.5 pl-10 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              onClick={() => setSelectedCategory("All Programs")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === "All Programs"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All Programs
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredCourses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              href={`/courses/${c.slug || c.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-card border border-dashed border-border rounded-3xl space-y-4 max-w-lg mx-auto">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Compass className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-foreground font-outfit">
              No matching courses found
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              We couldn&apos;t find any courses matching your criteria. Try adjusting your search keyword or active filters.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            Reset All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
