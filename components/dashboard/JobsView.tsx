"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building,
  MapPin,
  ExternalLink,
  Search,
  Calendar,
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  FileText,
  Compass,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface JobItemData {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  description?: string | null;
  link?: string | null;
  createdAt: string | Date;
}

export interface JobsViewProps {
  jobs: JobItemData[];
}

export function JobsView({ jobs }: JobsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<JobItemData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique locations for filtering
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    jobs.forEach((j) => {
      if (j.location && j.location.trim()) {
        locSet.add(j.location.trim());
      }
    });
    return Array.from(locSet);
  }, [jobs]);

  // Unique companies count
  const uniqueCompaniesCount = useMemo(() => {
    return new Set(jobs.map((j) => j.company.toLowerCase())).size;
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Location filter
      if (selectedLocation !== "all") {
        if (!job.location || !job.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(query);
        const matchCompany = job.company.toLowerCase().includes(query);
        const matchLoc = job.location?.toLowerCase().includes(query);
        const matchDesc = job.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchCompany && !matchLoc && !matchDesc) return false;
      }

      return true;
    });
  }, [jobs, selectedLocation, searchQuery]);

  const handleCopyLink = (job: JobItemData) => {
    const text = job.link || (typeof window !== "undefined" ? window.location.href : "");
    navigator.clipboard.writeText(text);
    setCopiedId(job.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Opportunities</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            Career Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Explore opportunities and take the next step in your career.
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <span>{jobs.length} Available Opportunities</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Building className="w-3.5 h-3.5 text-cyan-600" />
              <span>{uniqueCompaniesCount} Organizations</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{uniqueLocations.length} Hub Locations</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
          <Button
            asChild
            variant="outline"
            className="border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-100 font-bold h-11 px-4 rounded-xl text-xs"
          >
            <Link href="/dashboard/certificates" className="flex items-center gap-1.5">
              <span>View Credentials</span>
              <Compass className="w-3.5 h-3.5" />
            </Link>
          </Button>

          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-5 rounded-xl text-xs shadow-xs cursor-pointer"
          >
            <Link href="/dashboard/courses" className="flex items-center gap-2">
              <span>My Learning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Location Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Location Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedLocation("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedLocation === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Locations ({jobs.length})
            </button>
            {uniqueLocations.map((loc) => {
              const count = jobs.filter(
                (j) => j.location && j.location.toLowerCase().includes(loc.toLowerCase())
              ).length;
              const isSelected = selectedLocation.toLowerCase() === loc.toLowerCase();

              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{loc}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles, companies, locations..."
              className="pl-10 pr-8 h-10 text-xs font-semibold rounded-xl border-slate-200 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Global Empty State: Zero Jobs in DB */}
        {jobs.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 sm:p-16 text-center space-y-5 shadow-xs">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold font-outfit text-foreground">
                No opportunities available right now
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Check back later for newly posted career openings and announcements.
              </p>
            </div>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs px-6 h-11 shadow-xs cursor-pointer"
            >
              <Link href="/dashboard/courses">Return to My Learning</Link>
            </Button>
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Empty State: Zero Search/Filter Matches */
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-4 shadow-xs">
            <div className="space-y-1">
              <h4 className="text-base font-bold font-outfit text-foreground">
                No opportunities match your search
              </h4>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search query or removing location filters.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedLocation("all");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          /* Job Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => {
              const formattedDate = new Date(job.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const companyInitial = job.company.charAt(0).toUpperCase();

              return (
                <div
                  key={job.id}
                  className="bg-card border border-border/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    {/* Card Top: Company Avatar & Date */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary font-bold font-outfit text-base flex items-center justify-center border border-primary/20 shrink-0">
                          {companyInitial}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-primary font-outfit truncate">
                            {job.company}
                          </h4>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            <span>Posted {formattedDate}</span>
                          </span>
                        </div>
                      </div>

                      <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0">
                        Verified
                      </Badge>
                    </div>

                    {/* Job Title & Location */}
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base font-outfit text-foreground line-clamp-2 leading-snug">
                        {job.title}
                      </h3>

                      {job.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Description excerpt */}
                    {job.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {job.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-border/60 flex items-center gap-2.5">
                    {job.link ? (
                      <Button
                        asChild
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <a href={job.link} target="_blank" rel="noopener noreferrer">
                          <span>View Opportunity</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setSelectedJob(job)}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View Opportunity</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setSelectedJob(job)}
                      className="border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-100 text-xs font-semibold h-10 px-3.5 rounded-xl cursor-pointer"
                      title="Read full job description"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Details Modal Dialog */}
      {selectedJob && (
        <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                  Verified Opportunity
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold font-outfit text-foreground leading-snug">
                {selectedJob.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 pt-0.5">
                <span className="font-semibold text-primary flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{selectedJob.company}</span>
                </span>
                {selectedJob.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedJob.location}</span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Content Body */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Posting Information
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Date Posted</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedJob.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Location</span>
                    <span className="font-semibold text-foreground">
                      {selectedJob.location || "Remote / Hybrid"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedJob.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Role Overview &amp; Requirements
                  </h4>
                  <div className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap bg-card p-4 rounded-2xl border border-border/80">
                    {selectedJob.description}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              {selectedJob.link ? (
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-11 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <a href={selectedJob.link} target="_blank" rel="noopener noreferrer">
                    <span>Apply on Partner Portal</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              ) : (
                <Button
                  onClick={() => handleCopyLink(selectedJob)}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-11 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === selectedJob.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Opportunity Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Share Opportunity</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
