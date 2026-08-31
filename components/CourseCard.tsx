"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { CourseProgress } from "@/components/CourseProgress";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    price: number;
    category?: {
      name: string;
    };
    instructor?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  progress?: number;
  href: string;
}

export function CourseCard({ course, progress, href }: CourseCardProps) {
  return (
    <Link
      href={href}
      className="group hover:no-underline flex h-full"
    >
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-6px] border border-border/80 flex flex-col flex-1 transition-all duration-300 ease-out group-hover:border-primary/30">
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title || "Course Image"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="text-xs font-bold px-2.5 py-1 bg-background/90 backdrop-blur-md text-foreground rounded-full shadow-sm">
              {course.category?.name || "LMS Course"}
            </span>
          </div>
        </div>
        <div className="p-6 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
                {course.title}
              </h3>
              <span className="text-primary font-extrabold text-sm shrink-0">
                {course.price === 0
                  ? "Free"
                  : `₹${course.price.toLocaleString("en-IN")}`}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          </div>
          
          <div className="space-y-3 pt-2 border-t border-border/40">
            {course.instructor && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {course.instructor.avatar_url ? (
                    <div className="relative h-6 w-6 mr-2">
                      <Image
                        src={course.instructor.avatar_url}
                        alt={course.instructor.full_name || "Instructor"}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-6 w-6 mr-2 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="text-[10px] font-bold">{(course.instructor.full_name || "I")[0]}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    by {course.instructor.full_name}
                  </span>
                </div>
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
          </div>
        </div>
      </div>
    </Link>
  );
}
