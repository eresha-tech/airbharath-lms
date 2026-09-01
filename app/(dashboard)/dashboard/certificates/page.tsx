import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { certificates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Award, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentCertificates() {
  const session = await getSession();

  if (!session) return redirect("/login");

  let studentCertificates: any[] = [];
  try {
    studentCertificates = await db.query.certificates.findMany({
      where: eq(certificates.userId, session.id),
      with: {
        course: true,
      },
    });
  } catch (err) {
    console.error("Certificates fetch error:", err);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">My Verified Credentials</h1>
        <p className="text-muted-foreground text-sm mt-0.5">View, download, and share your official Airbharath LMS certificates.</p>
      </div>

      {studentCertificates && studentCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studentCertificates.map((cert: any) => (
            <div key={cert.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="h-10 w-10 bg-[#014a62]/10 text-[#014a62] rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground font-instrument-serif">{cert.course?.title || "Technical Training"}</h3>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                    <Calendar className="h-3.5 w-3.5 text-[#014a62]" /> Issued on {new Date(cert.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Link
                  href={`/verify-certificate/${cert.certificateCode || cert.id}`}
                  className="flex-1 text-center py-2.5 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-colors shadow-sm"
                >
                  Verify Certificate
                </Link>
                {cert.pdfUrl && (
                  <a
                    href={cert.pdfUrl}
                    download={`Airbharath-Certificate-${cert.certificateCode || cert.id}.pdf`}
                    className="px-3.5 py-2.5 border rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="font-bold text-lg text-foreground">No certificates earned yet</h3>
            <p className="text-xs text-muted-foreground">Complete 100% of any enrolled course syllabus to generate your verified certificate.</p>
          </div>
          <Link href="/dashboard" className="inline-block py-2.5 px-5 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-all shadow-sm">
            Resume Learning
          </Link>
        </div>
      )}
    </div>
  );
}
