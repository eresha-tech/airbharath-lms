"use client";

import React, { useState, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Search,
  X,
  MapPin,
  Building,
  Globe,
  ExternalLink,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FormattedJob {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  description?: string | null;
  link?: string | null;
  created_at: string;
}

interface JobsClientProps {
  initialJobs: FormattedJob[];
}

export default function JobsClient({ initialJobs }: JobsClientProps) {
  const [jobsList, setJobsList] = useState<FormattedJob[]>(initialJobs || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLink, setFormLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Details Modal State
  const [selectedJob, setSelectedJob] = useState<FormattedJob | null>(null);

  // Delete Confirmation State
  const [targetDeleteJob, setTargetDeleteJob] = useState<FormattedJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute KPI metrics from real data
  const metrics = useMemo(() => {
    const total = jobsList.length;
    const uniqueCompanies = new Set(
      jobsList.map((j) => j.company.trim().toLowerCase()).filter(Boolean)
    ).size;
    const uniqueLocations = new Set(
      jobsList.map((j) => (j.location || "Remote").trim().toLowerCase()).filter(Boolean)
    ).size;
    const withDirectLink = jobsList.filter((j) => !!j.link && j.link.trim().length > 0).length;

    return {
      total,
      uniqueCompanies,
      uniqueLocations,
      withDirectLink,
    };
  }, [jobsList]);

  // Filtered and Sorted Jobs
  const filteredJobs = useMemo(() => {
    return jobsList
      .filter((job) => {
        const term = searchTerm.toLowerCase().trim();
        const titleMatch = job.title.toLowerCase().includes(term);
        const companyMatch = job.company.toLowerCase().includes(term);
        const locationMatch = (job.location || "").toLowerCase().includes(term);
        const descMatch = (job.description || "").toLowerCase().includes(term);

        const matchesSearch = !term || titleMatch || companyMatch || locationMatch || descMatch;
        if (!matchesSearch) return false;

        // Filter tabs
        if (filterTab === "with-link") {
          return !!job.link && job.link.trim().length > 0;
        }
        if (filterTab === "remote") {
          return (job.location || "").toLowerCase().includes("remote");
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "title-asc") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "company-asc") {
          return a.company.localeCompare(b.company);
        }
        return 0;
      });
  }, [jobsList, searchTerm, filterTab, sortBy]);

  // Handle Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCompany.trim()) {
      setFormError("Job title and company name are required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          company: formCompany.trim(),
          location: formLocation.trim() || "Remote",
          description: formDescription.trim() || null,
          link: formLink.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create job posting");

      if (data.job) {
        setJobsList((prev) => [
          {
            id: data.job.id,
            title: data.job.title,
            company: data.job.company,
            location: data.job.location,
            description: data.job.description,
            link: data.job.link,
            created_at: data.job.createdAt
              ? new Date(data.job.createdAt).toISOString()
              : new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      // Reset form and close modal
      setFormTitle("");
      setFormCompany("");
      setFormLocation("");
      setFormDescription("");
      setFormLink("");
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to create job posting");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Job
  const handleDeleteJob = async () => {
    if (!targetDeleteJob) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/jobs?id=${targetDeleteJob.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete job posting");
      }

      setJobsList((prev) => prev.filter((j) => j.id !== targetDeleteJob.id));
      setTargetDeleteJob(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete job posting");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Opportunities */}
        <Card className="rounded-2xl border-border/80 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Opportunities
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.total}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            Published career openings
          </p>
        </Card>

        {/* Organizations / Companies */}
        <Card className="rounded-2xl border-border/80 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Organizations
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.uniqueCompanies}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            Aviation hiring partners
          </p>
        </Card>

        {/* Work Locations */}
        <Card className="rounded-2xl border-border/80 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Locations
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.uniqueLocations}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
            Operating job regions
          </p>
        </Card>

        {/* External Portals */}
        <Card className="rounded-2xl border-border/80 p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Direct Portals
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.withDirectLink}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
            With direct application links
          </p>
        </Card>
      </div>

      {/* Search, Filter & Actions Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search jobs, companies, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-10 rounded-xl text-xs bg-muted/30 border-border/80 focus:bg-background focus:ring-2 focus:ring-primary"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 py-1.5 pr-8 border border-border/80 rounded-xl text-xs font-semibold bg-background hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title-asc">Role: A → Z</option>
                <option value="company-asc">Company: A → Z</option>
              </select>
            </div>

            {/* Primary CTA: Post a Job */}
            <Button
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold gap-2 shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Post a Job</span>
            </Button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-4 pt-3.5 border-t border-border/40">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
              filterTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            All Opportunities ({jobsList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("with-link")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
              filterTab === "with-link"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            With Direct Portal ({metrics.withDirectLink})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("remote")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
              filterTab === "remote"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Remote / Hybrid
          </button>
        </div>
      </Card>

      {/* Main Jobs Listing (Table on Desktop, Cards on Mobile) */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/60 bg-card flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Career Openings
            </span>
            <Badge variant="secondary" className="text-[11px] font-bold">
              {filteredJobs.length} {filteredJobs.length === 1 ? "opening" : "openings"}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Showing real published opportunities
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {filteredJobs.length === 0 ? (
            <div className="p-12 sm:p-16 text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-bold text-foreground">
                {searchTerm || filterTab !== "all"
                  ? "No jobs match your search"
                  : "No career opportunities posted yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchTerm || filterTab !== "all"
                  ? "Try clearing your search query or switching filter tabs."
                  : "Create a new aviation role or internship opportunity to feature it on the student Career Hub."}
              </p>
              {searchTerm || filterTab !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterTab("all");
                  }}
                  className="mt-4 rounded-xl text-xs"
                >
                  Reset Filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 rounded-xl text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Post First Job</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                      <th className="px-6 py-3.5">Opportunity</th>
                      <th className="px-6 py-3.5">Company</th>
                      <th className="px-6 py-3.5">Location</th>
                      <th className="px-6 py-3.5">Posted</th>
                      <th className="px-6 py-3.5">Application</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/20 transition-colors group">
                        {/* Opportunity Title & Preview */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                            {job.title}
                          </div>
                          {job.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-sans">
                              {job.description}
                            </p>
                          )}
                        </td>

                        {/* Company */}
                        <td className="px-6 py-4 text-xs font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{job.company}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{job.location || "Remote"}</span>
                          </div>
                        </td>

                        {/* Posted Date */}
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                            <span>
                              {job.created_at
                                ? new Date(job.created_at).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Recently"}
                            </span>
                          </div>
                        </td>

                        {/* Application Portal Link */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {job.link ? (
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors"
                            >
                              <span>Open Portal</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Direct / No URL
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedJob(job)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              title="View Full Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setTargetDeleteJob(job)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              title="Delete Job"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Based Layout */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredJobs.map((job) => (
                  <div key={job.id} className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-foreground">{job.title}</div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Building className="h-3.5 w-3.5" />
                          <span>{job.company}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                        Active
                      </Badge>
                    </div>

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground font-medium">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60">
                        <MapPin className="h-3 w-3 text-primary" />
                        {job.location || "Remote"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60">
                        <Calendar className="h-3 w-3" />
                        {job.created_at
                          ? new Date(job.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recently"}
                      </span>
                    </div>

                    {/* Description preview */}
                    {job.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1">
                      {job.link ? (
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>Application Portal</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No external portal link
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTargetDeleteJob(job)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* CREATE JOB MODAL DIALOG */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Post Career Opportunity
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Publish an aviation role or internship for enrolled learners.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Job / Internship Title <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Junior Aircraft Structural Engineer"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="rounded-xl text-xs font-semibold bg-background"
                  required
                />
              </div>

              {/* Company and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Hiring Organization <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Airbharath Aerospace Ltd."
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="rounded-xl text-xs font-semibold bg-background"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Location / Work Mode
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Bangalore / Remote (Hybrid)"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="rounded-xl text-xs font-medium bg-background"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Job Description & Eligibility
                </label>
                <textarea
                  placeholder="Key responsibilities, CAD/FEM software requirements, and ground school prerequisites..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              {/* Application URL */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  External Application Link (URL)
                </label>
                <Input
                  type="url"
                  placeholder="https://careers.company.com/apply/role-123"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="rounded-xl text-xs font-mono bg-background"
                />
              </div>

              {/* Live Opportunity Preview Card */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Live Preview Card</span>
                </div>
                <div className="p-3 bg-card border border-border/80 rounded-xl space-y-1">
                  <div className="font-bold text-xs text-foreground">
                    {formTitle || "Job Opportunity Title"}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                    <span className="text-primary font-semibold">
                      {formCompany || "Company Name"}
                    </span>
                    <span>•</span>
                    <span>{formLocation || "Location / Remote"}</span>
                  </div>
                  {formDescription && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pt-0.5">
                      {formDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-bold shadow-2xs gap-1.5"
                >
                  {isSubmitting ? (
                    "Publishing..."
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Publish Opportunity</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOB DETAILS MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Opportunity Details
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Full career specification and application criteria.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <div className="text-base font-bold text-foreground font-outfit">
                  {selectedJob.title}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1">
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Building className="h-3.5 w-3.5" />
                    {selectedJob.company}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedJob.location || "Remote"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(selectedJob.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Description section */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description & Requirements
                </span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedJob.description || "No specific description provided."}
                </p>
              </div>

              {/* External Link Section */}
              {selectedJob.link && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Application Destination
                    </span>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {selectedJob.link}
                    </p>
                  </div>
                  <a
                    href={selectedJob.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {targetDeleteJob && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground font-outfit">
                  Delete this job posting?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will permanently remove{" "}
                  <span className="font-semibold text-foreground">
                    &quot;{targetDeleteJob.title}&quot;
                  </span>{" "}
                  from the student Career Hub.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetDeleteJob(null)}
                disabled={isDeleting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteJob}
                disabled={isDeleting}
                className="rounded-xl text-xs font-bold shadow-2xs"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
