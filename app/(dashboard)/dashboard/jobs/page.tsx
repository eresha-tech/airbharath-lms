import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Search, MapPin, Building, SlidersHorizontal, LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentJobBoard() {
  let dbJobs: any[] = [];
  try {
    dbJobs = await db.query.jobs.findMany({
      orderBy: [desc(jobs.createdAt)],
    });
  } catch (err) {
    console.error("Jobs fetch error:", err);
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62] leading-tight">
          Discover your next <span className="text-[#014a62] bg-[#014a62]/10 px-2.5 py-0.5 rounded-lg">career milestone.</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-sans">
          Connecting the next generation of engineers, pilots, and technical specialists with industry-leading opportunities worldwide.
        </p>
      </div>

      {/* Roster list */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg font-instrument-serif text-[#014a62]">
            Recent Postings
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dbJobs && dbJobs.length > 0 ? (
            dbJobs.map((job: any) => (
              <div key={job.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-[#014a62]/10 text-[#014a62] text-[10px] font-extrabold rounded-full uppercase">
                      New Opportunity
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground line-clamp-1 font-instrument-sans">{job.title}</h4>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                      <Building className="h-3.5 w-3.5 text-[#014a62]" /> {job.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-[#014a62]" />
                    <span>{job.location}</span>
                  </div>
                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed font-sans">{job.description}</p>
                  )}
                </div>
                {job.link && (
                  <a 
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2.5 bg-[#014a62] text-white rounded-xl text-xs font-bold hover:bg-[#01374a] transition-colors block mt-6"
                  >
                    Apply / View Details
                  </a>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-gray-50 border border-dashed rounded-3xl space-y-2">
              <Building className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <h4 className="font-bold text-sm text-foreground">No active job postings right now</h4>
              <p className="text-xs text-muted-foreground">Check back soon for new recruitment notices.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
