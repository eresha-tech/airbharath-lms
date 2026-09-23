import Link from "next/link";
import { BookOpen, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <div className="bg-card border border-dashed border-border rounded-3xl p-8 sm:p-12 text-center space-y-5 max-w-2xl mx-auto my-6">
      <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
        <Compass className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-lg sm:text-xl text-foreground font-outfit">
          Start Your Learning Journey
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          You are not currently enrolled in any active courses. Browse our industry-recognized aviation, pilot training, and technical engineering curriculum.
        </p>
      </div>

      <div className="pt-2">
        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-6 rounded-xl shadow-xs"
        >
          <Link href="/courses" className="flex items-center gap-2">
            <span>Browse All Courses</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
