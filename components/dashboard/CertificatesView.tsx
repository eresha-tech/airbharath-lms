"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  BookOpen,
  Play,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  User,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface EarnedCertificateData {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug?: string | null;
  thumbnailUrl?: string | null;
  certificateCode: string;
  studentName: string;
  issuedAt: string | Date;
  pdfUrl: string;
}

export interface InProgressTrackData {
  courseId: string;
  courseTitle: string;
  courseSlug?: string | null;
  thumbnailUrl?: string | null;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  resumeLessonId: string;
  resumeLessonTitle?: string;
}

export interface CertificatesViewProps {
  earnedCertificates: EarnedCertificateData[];
  inProgressTracks: InProgressTrackData[];
  totalEnrolledCount: number;
  studentName: string;
}

export function CertificatesView({
  earnedCertificates,
  inProgressTracks,
  totalEnrolledCount,
  studentName,
}: CertificatesViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "earned" | "in-progress">("all");
  const [selectedCert, setSelectedCert] = useState<EarnedCertificateData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const earnedCount = earnedCertificates.length;
  const inProgressCount = inProgressTracks.length;
  const totalCredentialsCount = earnedCount + inProgressCount;

  const handleCopy = (text: string, type: "id" | "link") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const getVerificationUrl = (code: string) => {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "https://lms.airbharath.in");
    return `${base}/verify-certificate/${code}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Credential Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            My Certificates &amp; Credentials
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Access, download, share, and verify your official tamper-proof AirBharath LMS completion certificates with QR-verifiable authenticity.
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 text-xs font-semibold border border-emerald-500/20">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>{earnedCount} Certificates Earned</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>{inProgressCount} Tracks In Progress</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{totalEnrolledCount} Enrolled Courses</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
          <Button
            asChild
            variant="outline"
            className="border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-100 font-bold h-11 px-4 rounded-xl text-xs"
          >
            <Link href="/verify-certificate" target="_blank" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Public Verification Portal</span>
            </Link>
          </Button>

          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-5 rounded-xl text-xs shadow-xs cursor-pointer"
          >
            <Link href="/dashboard/courses" className="flex items-center gap-2">
              <span>My Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/60 self-start w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-white text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Credentials ({totalCredentialsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("earned")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "earned"
              ? "bg-white text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Earned ({earnedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("in-progress")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "in-progress"
              ? "bg-white text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          In Progress ({inProgressCount})
        </button>
      </div>

      {/* SECTION 1: Earned Certificates */}
      {(activeTab === "earned" || (activeTab === "all" && earnedCount > 0)) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm sm:text-base font-bold font-outfit text-foreground uppercase tracking-wider">
                Earned Certificates ({earnedCount})
              </h2>
            </div>
          </div>

          {earnedCount === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-3xl p-8 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                <Award className="h-7 w-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  Your first certificate is waiting
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Complete 100% of the lessons in any enrolled course to automatically generate your official verified PDF certificate.
                </p>
              </div>
              {inProgressCount > 0 ? (
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs px-6 h-10 shadow-xs cursor-pointer"
                >
                  <Link href={`/dashboard/courses/${inProgressTracks[0].courseId}`}>
                    Resume In-Progress Course
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs px-6 h-10 shadow-xs cursor-pointer"
                >
                  <Link href="/courses">Browse Course Catalog</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {earnedCertificates.map((cert) => {
                const formattedDate = new Date(cert.issuedAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <div
                    key={cert.id}
                    className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    {/* Visual Academic Certificate Preview Card */}
                    <div className="p-3.5 sm:p-6 bg-gradient-to-b from-[#014a62]/[0.04] to-card border-b border-border/60 relative overflow-hidden">
                      {/* Decorative Background Framing */}
                      <div className="border-2 border-primary/20 rounded-2xl p-3 sm:p-5 bg-card/90 dark:bg-zinc-900/90 backdrop-blur-xs relative shadow-inner">
                        <div className="border border-[#d4af37]/40 rounded-xl p-3.5 sm:p-5 space-y-3 text-center">
                          {/* Header Insignia */}
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] uppercase text-primary font-outfit">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>AirBharath LMS Finishing School</span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#d4af37]">
                              Certificate of Completion
                            </span>
                          </div>

                          {/* Recipient & Course */}
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground italic font-serif">
                              This is to certify that
                            </p>
                            <h4 className="text-base sm:text-xl font-bold font-outfit text-primary tracking-tight leading-tight break-words">
                              {cert.studentName || studentName || "AirBharath Student"}
                            </h4>
                            <p className="text-[10px] text-muted-foreground italic font-serif">
                              has successfully completed 100% curriculum of
                            </p>
                            <h5 className="text-xs sm:text-sm font-bold text-foreground leading-snug break-words max-w-sm mx-auto">
                              {cert.courseTitle}
                            </h5>
                          </div>

                          {/* Footer Signatory & Code */}
                          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <div className="text-left font-mono leading-tight">
                              <span className="block text-[9px] uppercase font-bold text-muted-foreground/70">Issued</span>
                              <span className="font-semibold text-foreground/90">{formattedDate}</span>
                            </div>
                            <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Verified</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Credential Code
                          </div>
                          <div className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{cert.certificateCode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(cert.certificateCode, "id")}
                              className="text-muted-foreground hover:text-primary p-1 rounded-md transition-colors cursor-pointer"
                              title="Copy Certificate Code"
                              aria-label="Copy Certificate Code"
                            >
                              {copiedId === cert.certificateCode ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold self-start sm:self-auto shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Tamper-Proof Credential</span>
                        </Badge>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Download PDF */}
                        {cert.pdfUrl ? (
                          <Button
                            asChild
                            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <a
                              href={cert.pdfUrl}
                              download={`Airbharath-Certificate-${cert.certificateCode}.pdf`}
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download PDF</span>
                            </a>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Link href={`/verify-certificate/${cert.certificateCode}`}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>View Record</span>
                            </Link>
                          </Button>
                        )}

                        {/* View Credential Details Modal */}
                        <Button
                          variant="outline"
                          onClick={() => setSelectedCert(cert)}
                          className="border-slate-200 dark:border-zinc-700 text-foreground hover:text-primary hover:bg-muted/60 text-xs font-semibold h-10 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span>Credential Info</span>
                        </Button>

                        {/* Verify on Web */}
                        <Button
                          asChild
                          variant="outline"
                          className="border-slate-200 dark:border-zinc-700 text-foreground hover:text-primary hover:bg-muted/60 text-xs font-semibold h-10 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Link
                            href={`/verify-certificate/${cert.certificateCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span>Verify Online</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: In-Progress Tracks / Certificates to Earn */}
      {(activeTab === "in-progress" || (activeTab === "all" && inProgressCount > 0)) && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold font-outfit text-foreground uppercase tracking-wider">
                Certificates in Progress ({inProgressCount})
              </h2>
            </div>
          </div>

          {inProgressCount === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-xs">
              <p className="text-sm font-semibold text-foreground">
                No courses currently in progress.
              </p>
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs px-6 h-10 shadow-xs cursor-pointer"
              >
                <Link href="/courses">Browse AirBharath Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressTracks.map((track) => (
                <div
                  key={track.courseId}
                  className="bg-card border border-border/80 rounded-3xl p-4 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Badge & Course Title */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                        Certificate Track
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {track.percent}%
                      </span>
                    </div>

                    <h3 className="font-bold text-base font-outfit text-foreground leading-snug line-clamp-2">
                      {track.courseTitle}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {track.resumeLessonTitle ? (
                        <span>
                          <strong className="text-foreground">Next Up:</strong> {track.resumeLessonTitle}
                        </span>
                      ) : (
                        <span>{track.totalLessons - track.completedLessons} lessons remaining</span>
                      )}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                        <span>Curriculum Progress</span>
                        <span>{track.completedLessons} / {track.totalLessons} Lessons</span>
                      </div>
                      <Progress value={track.percent} className="h-2" />
                    </div>
                  </div>

                  {/* Resume CTA */}
                  <div className="pt-3 border-t border-border/60">
                    <Button
                      asChild
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Link
                        href={
                          track.resumeLessonId
                            ? `/dashboard/courses/${track.courseId}/lessons/${track.resumeLessonId}`
                            : `/dashboard/courses/${track.courseId}`
                        }
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Resume Lesson &amp; Earn</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Empty State: Zero Enrollments & Zero Credentials */}
      {totalCredentialsCount === 0 && (
        <div className="bg-card border border-dashed border-border rounded-3xl p-8 sm:p-16 text-center space-y-5 shadow-xs">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
            <Award className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold font-outfit text-foreground">
              Your credential journey begins here
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Enroll in any AirBharath LMS masterclass to begin mastering industry skills and earn tamper-proof verified completion certificates.
            </p>
          </div>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs px-6 h-11 shadow-xs cursor-pointer"
          >
            <Link href="/courses">Browse Course Catalog</Link>
          </Button>
        </div>
      )}

      {/* Credential Details Modal */}
      {selectedCert && (
        <Dialog open={Boolean(selectedCert)} onOpenChange={(open) => !open && setSelectedCert(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5">
            <DialogHeader className="space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-lg font-bold font-outfit text-foreground">
                Certificate Credential Details
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                Official verified qualification issued by AirBharath LMS Finishing School.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 bg-muted/40 p-3.5 sm:p-4 rounded-2xl border border-border/60 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Student Full Name
                </span>
                <span className="font-bold text-foreground text-sm">
                  {selectedCert.studentName || studentName || "AirBharath Student"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Course Program
                </span>
                <span className="font-semibold text-foreground">
                  {selectedCert.courseTitle}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Issue Date
                </span>
                <span className="font-medium text-foreground">
                  {new Date(selectedCert.issuedAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Unique Certificate ID */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Unique Certificate ID
                </span>
                <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-background rounded-xl border border-border/70">
                  <span className="font-mono text-xs font-bold text-foreground flex-1 min-w-0 truncate select-all">
                    {selectedCert.certificateCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedCert.certificateCode, "id")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                    aria-label="Copy Certificate Code"
                  >
                    {copiedId === selectedCert.certificateCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Verification Link */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Verification Link
                </span>
                <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-background rounded-xl border border-border/70">
                  <span className="font-mono text-[11px] text-muted-foreground truncate select-all flex-1 min-w-0">
                    {getVerificationUrl(selectedCert.certificateCode)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(getVerificationUrl(selectedCert.certificateCode), "link")
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                    aria-label="Copy Verification Link"
                  >
                    {copiedLink === getVerificationUrl(selectedCert.certificateCode) ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {selectedCert.pdfUrl && (
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-11 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <a
                    href={selectedCert.pdfUrl}
                    download={`Airbharath-Certificate-${selectedCert.certificateCode}.pdf`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Official PDF Document</span>
                  </a>
                </Button>
              )}

              <Button
                asChild
                variant="outline"
                className="w-full border-slate-200 dark:border-zinc-700 text-foreground hover:text-primary hover:bg-muted/60 text-xs font-semibold h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link
                  href={`/verify-certificate/${selectedCert.certificateCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Public Verification Page</span>
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
