import Link from "next/link";
import { db } from "@/lib/db";
import { certificates, users, courses } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import {
  ShieldCheck,
  XCircle,
  Award,
  Calendar,
  User,
  BookOpen,
  Download,
  ArrowRight,
  Search,
} from "lucide-react";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { id } = await params;

  // Search by certificateCode or id (UUID)
  const isUUID = UUID_REGEX.test(id);
  const cert = isUUID
    ? await db.query.certificates.findFirst({
        where: or(eq(certificates.certificateCode, id), eq(certificates.id, id)),
      })
    : await db.query.certificates.findFirst({
        where: eq(certificates.certificateCode, id),
      });

  const student = cert ? await db.query.users.findFirst({ where: eq(users.id, cert.userId) }) : null;
  const course = cert ? await db.query.courses.findFirst({ where: eq(courses.id, cert.courseId) }) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 pt-28 pb-16 sm:pt-32 sm:pb-20 max-w-3xl flex flex-col justify-center">
        <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden">
          {cert ? (
            <div>
              {/* Authenticity / Status Banner */}
              {cert.status === "revoked" ? (
                <div className="bg-destructive text-destructive-foreground p-8 sm:p-10 text-center space-y-3 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-2">
                      <XCircle className="w-9 h-9 text-rose-200" />
                    </div>
                    <span className="bg-rose-950/40 text-rose-200 text-xs font-extrabold uppercase px-3 py-1 rounded-full border border-rose-400/30 tracking-wider">
                      Certificate Revoked / Void
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white mt-2">
                      Credential Revoked
                    </h1>
                    <p className="text-xs sm:text-sm text-destructive-foreground/90 max-w-md mx-auto">
                      This certificate record was previously issued but has been formally revoked and is no longer valid.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-primary text-primary-foreground p-8 sm:p-10 text-center space-y-3 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-2">
                      <ShieldCheck className="w-9 h-9 text-emerald-300" />
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold uppercase px-3 py-1 rounded-full border border-emerald-400/30 tracking-wider">
                      Verified Authentic Credential
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white mt-2">
                      AirBharath LMS Official Credential
                    </h1>
                    <p className="text-xs sm:text-sm text-primary-foreground/80 max-w-md mx-auto">
                      This official certificate record is authentic, valid, and cryptographically registered in the AirBharath registry.
                    </p>
                  </div>
                </div>
              )}

              {/* Details List */}
              <div className="p-6 sm:p-10 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 flex items-start gap-3">
                    <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Recipient Name
                      </span>
                      <strong className="text-sm sm:text-base text-foreground font-outfit block truncate">
                        {student?.fullName || "AirBharath Student"}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 flex items-start gap-3">
                    <Award className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Certificate Code
                      </span>
                      <strong className="text-xs sm:text-sm font-mono text-foreground block truncate">
                        {cert.certificateCode}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 flex items-start gap-3 sm:col-span-2">
                    <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Course Program
                      </span>
                      <strong className="text-sm sm:text-base text-foreground font-outfit block">
                        {course?.title || "AirBharath Certified Program"}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 flex items-start gap-3 sm:col-span-2">
                    <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Date of Issuance
                      </span>
                      <strong className="text-xs sm:text-sm text-foreground block">
                        {new Date(cert.issuedAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-border/80 pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <Link
                    href="/verify-certificate"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 order-2 sm:order-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Verify Another Credential</span>
                  </Link>

                  {cert.pdfUrl && (
                    <Button
                      asChild
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-11 px-5 rounded-xl shadow-xs shrink-0 order-1 sm:order-2 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <a
                        href={cert.pdfUrl}
                        download={`Airbharath-Certificate-${cert.certificateCode}.pdf`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Original PDF</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 sm:p-14 text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h2 className="text-xl font-bold font-outfit text-foreground">
                  Certificate Not Found
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The certificate code <strong className="text-foreground font-mono">{id}</strong> could not be verified in our official records. Please verify the code or scan the official QR code on the certificate.
                </p>
              </div>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <Button asChild variant="outline" className="rounded-xl text-xs font-bold border-border">
                  <Link href="/verify-certificate">Search Again</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold">
                  <Link href="/">Back to AirBharath</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
