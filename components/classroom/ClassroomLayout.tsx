"use client";

import { useState, useEffect } from "react";
import { ClassroomSidebar } from "./ClassroomSidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";

interface ClassroomLayoutProps {
  course: any;
  completedLessons: string[];
  children: React.ReactNode;
}

const STORAGE_KEY = "classroom-sidebar-collapsed";

export function ClassroomLayout({
  course,
  completedLessons,
  children,
}: ClassroomLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClassroomSidebar
        course={course}
        completedLessons={completedLessons}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <main
        className={cn(
          "flex-1 pl-0 transition-all duration-300 ease-in-out relative",
          isCollapsed ? "lg:pl-0" : "lg:pl-88 xl:pl-96"
        )}
      >
        {isMounted && isCollapsed && (
          <div className="hidden lg:block sticky top-3 left-4 z-30 px-4 sm:px-6 lg:px-8 pt-2">
            <Button
              onClick={toggleCollapse}
              variant="outline"
              size="sm"
              className="h-8 gap-2 bg-card/95 backdrop-blur-md border-border/80 text-xs font-bold shadow-xs hover:border-primary/40 hover:text-primary transition-all cursor-pointer rounded-xl"
              aria-label="Expand course navigation"
              title="Expand course navigation"
            >
              <PanelLeftOpen className="h-4 w-4 text-primary" />
              <span>Expand Curriculum</span>
            </Button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
