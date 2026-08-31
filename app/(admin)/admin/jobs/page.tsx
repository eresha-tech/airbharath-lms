/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, Trash2, MapPin, Building, Globe, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company) return;

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("jobs").insert({
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || "Remote",
      description: description.trim(),
      link: link.trim(),
      posted_by: user?.id,
    });

    setIsSubmitting(false);

    if (error) {
      alert(error.message);
    } else {
      setTitle("");
      setCompany("");
      setLocation("");
      setDescription("");
      setLink("");
      fetchJobs();
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      fetchJobs();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Job Board Manager</h1>
        <p className="text-muted-foreground text-sm">Post new job openings, placements, and internships for enrolled students.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Job Form */}
        <div className="bg-card p-6 border rounded-2xl shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Post New Job
          </h3>
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">JOB TITLE</label>
              <input
                type="text"
                placeholder="e.g. Junior Structural Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">COMPANY NAME</label>
              <input
                type="text"
                placeholder="e.g. Arup Group"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">LOCATION</label>
              <input
                type="text"
                placeholder="e.g. Mumbai (Hybrid) or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">JOB DESCRIPTION</label>
              <textarea
                placeholder="e.g. Requirements: Staad Pro, ETABS. Batch: 2024..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">APPLY LINK (URL)</label>
              <input
                type="url"
                placeholder="e.g. https://careers.company.com/job"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Posting..." : "Publish Job"}
            </button>
          </form>
        </div>

        {/* Job Listings List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card p-6 border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg">Active Opportunities</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl shadow-sm">
              Loading active job listings...
            </div>
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="bg-card p-6 border rounded-2xl shadow-sm flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                      New Posting
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg text-foreground">{job.title}</h4>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-primary" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {job.location}
                    </span>
                  </div>
                  {job.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 pt-2">{job.description}</p>
                  )}
                  {job.link && (
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Application Details
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteJob(job.id)}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors mt-1"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl shadow-sm">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No active placement or internship postings found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
