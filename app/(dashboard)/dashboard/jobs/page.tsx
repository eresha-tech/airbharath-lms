import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { JobsView, type JobItemData } from "@/components/dashboard/JobsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Career Hub | AirBharath",
  description: "Explore career opportunities, aviation roles, and technical openings.",
};

export default async function StudentJobBoardPage() {
  let dbJobs: any[] = [];

  try {
    dbJobs = await db.query.jobs.findMany({
      orderBy: [desc(jobs.createdAt)],
    });
  } catch (err) {
    console.error("Jobs fetch error:", err);
  }

  // Format real DB jobs into clean data structures
  const formattedJobs: JobItemData[] = dbJobs.map((j) => ({
    id: j.id,
    title: j.title || "Untitled Role",
    company: j.company || "Company",
    location: j.location || null,
    description: j.description || null,
    link: j.link || null,
    createdAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
  }));

  return <JobsView jobs={formattedJobs} />;
}
