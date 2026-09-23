import React from "react";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import JobsClient, { FormattedJob } from "@/components/admin/JobsClient";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const jobsList = await db.query.jobs.findMany({
    orderBy: [desc(jobs.createdAt)],
  });

  const formattedJobs: FormattedJob[] = jobsList.map((j: any) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description,
    link: j.link,
    created_at: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <Briefcase className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              Jobs & Career Opportunities
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage career opportunities available to AirBharath learners.
          </p>
        </div>
      </div>

      <JobsClient initialJobs={formattedJobs} />
    </div>
  );
}
