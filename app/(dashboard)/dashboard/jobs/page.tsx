import { createClient } from "@/lib/supabase-server";
import { Search, MapPin, Building, SlidersHorizontal, LayoutGrid } from "lucide-react";

export default async function StudentJobBoard() {
  const supabase = await createClient();

  // Fetch true job posts
  const { data: dbJobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          Discover your next <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-lg">career milestone.</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          Connecting the next generation of civil/structural engineers, architects, and designers with industry-leading opportunities worldwide.
        </p>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Role (e.g. Junior Design)" 
            className="pl-10 pr-4 py-2 w-full border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Location (e.g. Mumbai)" 
            className="pl-10 pr-4 py-2 w-full border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none text-muted-foreground font-semibold">
            <option>Industry</option>
            <option>Structural Engineering</option>
            <option>BIM / Drafting</option>
            <option>Site Management</option>
          </select>
        </div>
        <button className="py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm w-full">
          Search Jobs
        </button>
      </div>

      {/* Roster list */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground">
            Recent Postings
          </h3>
          <div className="flex gap-2">
            <button className="p-1.5 border rounded-lg hover:bg-muted text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button className="p-1.5 border rounded-lg hover:bg-muted text-primary bg-primary/10">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dbJobs && dbJobs.length > 0 ? (
            dbJobs.map((job) => (
              <div key={job.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      New Posting
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground line-clamp-1">{job.title}</h4>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                      <Building className="h-3.5 w-3.5 text-primary" /> {job.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{job.location}</span>
                  </div>
                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{job.description}</p>
                  )}
                </div>
                {job.link && (
                  <a 
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition-colors block mt-6"
                  >
                    View Details
                  </a>
                )}
              </div>
            ))
          ) : (
            <>
              {/* Mock 1 */}
              <div className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      New Posting
                    </span>
                    <span className="text-[10px] text-muted-foreground">Today</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">Junior Structural Engineer</h4>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                      <Building className="h-3.5 w-3.5 text-primary" /> Arup Group
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>London (Hybrid)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">Full-time</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">Internship</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">Competitive Pay</span>
                  </div>
                </div>
                <button className="w-full text-center py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition-colors mt-6">
                  View Details
                </button>
              </div>

              {/* Mock 2 */}
              <div className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      Active
                    </span>
                    <span className="text-[10px] text-muted-foreground">2 days ago</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">BIM Coordinator Intern</h4>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                      <Building className="h-3.5 w-3.5 text-primary" /> Foster + Partners
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Remote</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">3 Months</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">Architecture</span>
                  </div>
                </div>
                <button className="w-full text-center py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition-colors mt-6">
                  View Details
                </button>
              </div>

              {/* Mock 3 */}
              <div className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      Active
                    </span>
                    <span className="text-[10px] text-muted-foreground">4 days ago</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">Graduate Site Manager</h4>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                      <Building className="h-3.5 w-3.5 text-primary" /> Laing O&apos;Rourke
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Manchester (On-site)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">Graduate Scheme</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded">Engineering</span>
                  </div>
                </div>
                <button className="w-full text-center py-2 border rounded-lg text-xs font-semibold hover:bg-muted transition-colors mt-6">
                  View Details
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
