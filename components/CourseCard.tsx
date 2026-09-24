"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Users, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { CourseProgress } from "@/components/CourseProgress";
import { Button } from "@/components/ui/button";

export interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    shortDescription?: string | null;
    short_description?: string | null;
    thumbnail_url?: string | null;
    thumbnailUrl?: string | null;
    price: number | string;
    access_days?: number | null;
    accessDays?: number | null;
    modulesCount?: number;
    lessonsCount?: number;
    badge?: string;
    category?: {
      name: string;
    };
    instructor?: {
      full_name?: string;
      fullName?: string;
      avatar_url?: string | null;
    };
  };
  progress?: number;
  href: string;
}

export function CourseCard({ course, progress, href }: CourseCardProps) {
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const rawPrice = Number(course.price) || 0;
  const basePrice = Math.round((rawPrice / 1.18) * 100) / 100;
  const gstAmount = Math.round((rawPrice - basePrice) * 100) / 100;

  const thumbnailUrl = course.thumbnailUrl || course.thumbnail_url;
  const accessDays = course.accessDays ?? course.access_days;
  const categoryBadge =
    course.badge || course.category?.name || "Certificate Program";

  return (
    <div className="bg-card rounded-3xl overflow-hidden shadow-2xs hover:shadow-md border border-border/80 hover:border-primary/40 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 group">
      <div>
        {/* Course Thumbnail Image Header */}
        <Link href={href} className="relative aspect-video w-full overflow-hidden bg-muted block">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={course.title || "Course Thumbnail"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary">
              <BookOpen className="h-10 w-10 opacity-50" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-40 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />

          {/* Badges Top Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <span className="text-[10px] font-bold px-2.5 py-1 bg-background/90 backdrop-blur-md text-foreground rounded-full border border-border/60 shadow-xs uppercase tracking-wider">
              {categoryBadge}
            </span>

            {accessDays ? (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                {accessDays} Days Access
              </span>
            ) : (
              <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                Lifetime Access
              </span>
            )}
          </div>
        </Link>

        {/* Content Details */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <Link href={href} className="block">
              <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors font-outfit line-clamp-1">
                {course.title}
              </h3>
            </Link>
            {(course.shortDescription || course.short_description || course.description) && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {course.shortDescription || course.short_description || course.description}
              </p>
            )}
          </div>

          {/* Metadata Highlights */}
          <div className="flex items-center gap-3.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
            {course.modulesCount !== undefined && course.modulesCount > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{course.modulesCount} Modules</span>
              </div>
            )}
            {course.lessonsCount !== undefined && course.lessonsCount > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{course.lessonsCount} Lessons</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-medium ml-auto text-[11px] text-success">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Self-Paced</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-muted/40 rounded-2xl p-3.5 border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Investment
              </span>
              {rawPrice > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTaxBreakdown(!showTaxBreakdown);
                  }}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {showTaxBreakdown ? "Hide Tax Details" : "Incl. 18% GST"}
                </button>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-outfit text-foreground">
                  {rawPrice === 0 ? "Free" : `₹${rawPrice.toLocaleString("en-IN")}`}
                </span>
                {rawPrice > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    (Total)
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified PDF</span>
              </span>
            </div>

            {/* Expandable Tax Details */}
            {showTaxBreakdown && rawPrice > 0 && (
              <div className="pt-2 mt-1 border-t border-border/60 text-[10px] text-muted-foreground space-y-0.5 font-medium">
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span className="text-foreground">₹{basePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>18% GST (CGST 9% + SGST 9%):</span>
                  <span className="text-foreground">₹{gstAmount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicator if enrolled */}
          {typeof progress === "number" && (
            <div className="pt-1">
              <CourseProgress
                progress={progress}
                variant="default"
                size="sm"
                label="Course Progress"
              />
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-5 sm:p-6 pt-0">
        <Button
          asChild
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-10 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Link href={href}>
            <span>Explore Course Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
