"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, Trash2, MapPin, Building, Globe, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to post job");
      }
    } catch (err: any) {
      alert(err.message || "Failed to post job");
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
      alert(err.message || "Failed to delete job");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Placement & Job Board Manager
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Post aviation industry job openings and internship opportunities for enrolled students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Create Job Form Card */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>Post New Opportunity</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Junior Aircraft Structural Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Hiring Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Airbharath Aerospace Ltd."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Location & Work Mode
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore / Remote (Hybrid)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Job Description & Qualifications
                </label>
                <textarea
                  placeholder="Responsibilities, CAD/FEM software requirements, and eligibility..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Application Link (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://careers.company.com/apply"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl text-xs font-bold shadow-sm"
              >
                {isSubmitting ? "Publishing..." : "Publish Job Opportunity"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Job Listings List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-outfit text-foreground">
              Active Job Openings ({jobs.length})
            </h3>
          </div>

          {loading ? (
            <Card className="rounded-2xl border-border/80 p-16 text-center text-xs text-muted-foreground">
              Loading active job listings...
            </Card>
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <Card
                key={job.id}
                className="rounded-2xl border-border/80 shadow-2xs p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start gap-4 hover:border-border transition-colors"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Active Listing
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-foreground font-outfit truncate">
                    {job.title}
                  </h4>

                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Building className="h-3.5 w-3.5 text-primary" />
                      {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {job.location}
                      </span>
                    )}
                  </div>

                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 pt-1 font-sans leading-relaxed">
                      {job.description}
                    </p>
                  )}

                  {job.link && (
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-1"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Application Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteJob(job.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  title="Delete Job"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl border border-dashed border-border/80 p-16 text-center text-muted-foreground bg-muted/10">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">No active job postings</p>
              <p className="text-xs text-muted-foreground mt-1">
                Post career openings using the form on the left to show them on student dashboards.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
