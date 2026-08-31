/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase-server";
import { Award, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function StudentCertificates() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch certificates
  const { data: certificates } = await supabase
    .from("certificates")
    .select(`
      id,
      pdf_url,
      issued_at,
      courses (
        title
      )
    `)
    .eq("user_id", user.id);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Credentials</h1>
        <p className="text-muted-foreground text-sm">View, download, and share your earned professional credentials.</p>
      </div>

      {certificates && certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert: any) => (
            <div key={cert.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{cert.courses?.title}</h3>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Issued on {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Link
                  href={`/certificates/${cert.id}`}
                  className="flex-1 text-center py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Verify Certificate
                </Link>
                {cert.pdf_url && (
                  <a
                    href={cert.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="font-bold text-lg">No certificates earned</h3>
            <p className="text-sm text-muted-foreground">Complete any enrolled course syllabus to 100% to generate your credential.</p>
          </div>
          <Link href="/dashboard" className="inline-block py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm">
            Resume Learning
          </Link>
        </div>
      )}
    </div>
  );
}
