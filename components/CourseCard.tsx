"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Info } from "lucide-react";
import { CourseProgress } from "@/components/CourseProgress";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url?: string | null;
    thumbnailUrl?: string | null;
    price: number | string;
    access_days?: number | null;
    accessDays?: number | null;
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
  const [includeGst, setIncludeGst] = useState(true);

  const rawPrice = Number(course.price) || 0;
  // If rawPrice is total (incl GST), base price = rawPrice / 1.18
  const basePrice = Math.round((rawPrice / 1.18) * 100) / 100;
  const gstAmount = Math.round((rawPrice - basePrice) * 100) / 100;

  const thumbnailUrl = course.thumbnailUrl || course.thumbnail_url;
  const instructorName = course.instructor?.fullName || course.instructor?.full_name || "Airbharath";
  const accessDays = course.accessDays ?? course.access_days;

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] border border-border/80 flex flex-col flex-1 transition-all duration-300 ease-out group border-border">
      <Link href={href} className="relative h-48 w-full overflow-hidden bg-muted block">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={course.title || "Course Image"}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#014a62]/10">
            <BookOpen className="h-10 w-10 text-[#014a62]/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
        <div className="absolute top-4 right-4 flex gap-2">
          <span className="text-xs font-bold px-2.5 py-1 bg-background/90 backdrop-blur-md text-foreground rounded-full shadow-sm">
            {course.category?.name || "Airbharath Course"}
          </span>
        </div>
        {accessDays && (
          <div className="absolute bottom-3 left-3 bg-[#014a62] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
            {accessDays} Days Access
          </div>
        )}
      </Link>

      <div className="p-6 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-2">
          <Link href={href} className="block">
            <h3 className="text-lg font-bold text-foreground hover:text-[#014a62] transition-colors duration-300 line-clamp-1 font-instrument-sans">
              {course.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        {/* GST Price Toggle Section */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pricing</span>
            <button
              type="button"
              onClick={() => setIncludeGst(!includeGst)}
              className="text-[10px] font-bold text-[#014a62] hover:underline flex items-center gap-1 bg-[#014a62]/10 px-2 py-0.5 rounded-md"
            >
              <Info className="w-3 h-3" />
              {includeGst ? "Incl. 18% GST" : "Excl. GST"}
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#014a62]">
                {rawPrice === 0 ? "Free" : `₹${(includeGst ? rawPrice : basePrice).toLocaleString("en-IN")}`}
              </span>
              {rawPrice > 0 && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {includeGst ? "(Incl. GST)" : `(+ ₹${gstAmount} GST)`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {instructorName && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Instructor: <strong className="text-foreground">{instructorName}</strong></span>
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}

          {typeof progress === "number" && (
            <CourseProgress
              progress={progress}
              variant="default"
              size="sm"
              label="Course Progress"
            />
          )}

          <Link
            href={href}
            className="block text-center w-full py-2.5 px-4 bg-[#014a62] hover:bg-[#01374a] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Explore Course
          </Link>
        </div>
      </div>
    </div>
  );
}
