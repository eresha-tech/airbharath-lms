"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, Trash2, MapPin, Building, Globe, ExternalLink } from "lucide-react";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs");
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          location: location.trim(),
          description: description.trim(),
          link: link.trim(),
        }),
      });

      if (res.ok) {
        setTitle("");
        setCompany("");
        setLocation("");
        setDescription("");
        setLink("");
        fetchJobs();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    try {
      const res = await fetch(`/api/admin/jobs?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Job Board Manager</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Post new job openings and opportunities for Airbharath LMS students.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Job Form */}
        <div className="bg-card p-6 border rounded-2xl shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2 font-instrument-serif text-[#014a62]">
            <Plus className="h-5 w-5 text-[#014a62]" /> Post New Job
          </h3>
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">JOB TITLE</label>
              <input
                type="text"
                placeholder="e.g. Junior Systems Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">COMPANY NAME</label>
              <input
                type="text"
                placeholder="e.g. Airbharath Aviation"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">LOCATION</label>
              <input
                type="text"
                placeholder="e.g. Mumbai (Hybrid) or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">JOB DESCRIPTION</label>
              <textarea
                placeholder="e.g. Key responsibilities and qualifications..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">APPLY LINK (URL)</label>
              <input
                type="url"
                placeholder="e.g. https://careers.company.com/job"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Posting..." : "Publish Job"}
            </button>
          </form>
        </div>

        {/* Job Listings List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card p-6 border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg font-instrument-serif text-[#014a62]">Active Opportunities</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl shadow-sm text-xs font-semibold">
              Loading active job listings...
            </div>
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="bg-card p-6 border rounded-2xl shadow-sm flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#014a62]/10 text-[#014a62] text-[10px] font-bold rounded-full uppercase">
                      New Opportunity
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-foreground font-instrument-sans">{job.title}</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-[#014a62]" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[#014a62]" />
                      {job.location}
                    </span>
                  </div>
                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 pt-2 font-sans">{job.description}</p>
                  )}
                  {job.link && (
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#014a62] hover:underline pt-2"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Application Details
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors mt-1"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground bg-gray-50 border border-dashed rounded-3xl">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-xs font-bold">No active job postings found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
