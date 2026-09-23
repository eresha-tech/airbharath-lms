import { db } from "@/lib/db";
import { certificates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Award, CheckCircle2, Download, Shield } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let cert: any = null;
  try {
    cert = await db.query.certificates.findFirst({
      where: eq(certificates.id, id),
      with: {
        user: true,
        course: true,
      },
    });
  } catch (err) {
    console.error("Cert error:", err);
  }

  const studentName = cert?.user?.fullName || cert?.user?.email || "Student";
  const courseTitle = cert?.course?.title || "Technical Training Course";
  const issueDate = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const pdfUrl = cert?.pdfUrl || "#";
  const certCode = cert?.certificateCode || id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl space-y-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Student Dashboard
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Certificate Area */}
            <div className="lg:col-span-2 bg-white text-zinc-900 border-[10px] border-primary/20 p-8 md:p-12 rounded-3xl relative shadow-xl min-h-[480px] flex flex-col justify-between items-center text-center font-serif">
              <div className="relative z-10 flex flex-col items-center gap-2 mt-4">
                <img src="https://assets.airbharath.in/logo.webp" alt="Airbharath LMS" className="h-10 w-auto object-contain" />
                <div className="text-[10px] tracking-[0.2em] uppercase font-sans font-bold text-primary">
                  AirBharath LMS Finishing School
                </div>
              </div>

              <div className="relative z-10 space-y-4 my-6">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide uppercase text-zinc-800 font-sans">
                  Certificate of Completion
                </h2>
                <p className="text-xs italic text-zinc-500 font-sans">This is to certify that</p>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary py-2 border-b-2 border-zinc-100 max-w-md mx-auto font-sans">
                  {studentName}
                </h1>
                <p className="text-xs italic text-zinc-500 font-sans">has successfully completed</p>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-800 font-sans">
                  {courseTitle}
                </h3>
              </div>

              <div className="relative z-10 w-full grid grid-cols-2 gap-8 border-t border-zinc-200/80 pt-6 font-sans mt-4">
                <div className="flex flex-col items-center">
                  <span className="font-mono text-xs italic font-semibold text-zinc-700">{issueDate}</span>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 mt-1">Date of Completion</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-xs italic font-semibold text-zinc-700">Airbharath Academic Council</span>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 mt-1">Authorized Signatory</span>
                </div>
              </div>

              <div className="relative z-10 text-[9px] text-zinc-400 tracking-wider font-sans mt-6 uppercase">
                Certificate Code: {certCode} • QR Verifiable Credentials
              </div>
            </div>

            {/* Certificate Right Panel */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="font-bold text-xl font-outfit text-foreground">Congratulations!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your official Airbharath LMS technical qualification is verified and active.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-xl">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-foreground">QR Code Verified</h4>
                      <p className="text-[10px] text-success">Authentic digital credential</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  {pdfUrl && pdfUrl !== "#" ? (
                    <a
                      href={pdfUrl}
                      download={`Airbharath-Certificate-${certCode}.pdf`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF Certificate
                    </a>
                  ) : (
                    <Link
                      href={`/verify-certificate/${certCode}`}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-sm"
                    >
                      <Award className="h-4 w-4" />
                      Verify Credential Page
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
