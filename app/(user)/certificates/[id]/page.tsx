import { createClient } from "@/lib/supabase-server";
import { ArrowLeft, Award, CheckCircle2, Download, Linkedin, Shield } from "lucide-react";
import Link from "next/link";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch certificate details
  const { data: cert } = await supabase
    .from("certificates")
    .select(`
      *,
      users (
        full_name,
        email
      ),
      courses (
        title,
        description
      )
    `)
    .eq("id", id)
    .single();

  const studentName = cert?.users?.full_name || "Alex Jensen";
  const courseTitle = cert?.courses?.title || "Mastering Structural Integrity";
  const issueDate = cert?.issued_at 
    ? new Date(cert.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) 
    : "March 24, 2024";
  const pdfUrl = cert?.pdf_url || "#";

  return (
    <div className="container mx-auto px-4 py-24 max-w-6xl">
      {/* Back button */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Certificate Frame Area */}
        <div className="lg:col-span-2 bg-white text-zinc-900 border-[12px] border-zinc-200 p-8 md:p-12 rounded-3xl relative shadow-xl min-h-[500px] flex flex-col justify-between items-center text-center font-serif">
          {/* Certificate Badge Frame decoration */}
          <div className="absolute inset-4 border border-zinc-300 pointer-events-none rounded-xl" />
          
          {/* Top Logo / Icon */}
          <div className="relative z-10 flex flex-col items-center gap-2 mt-4">
            <div className="h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-300">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <div className="text-[10px] tracking-[0.2em] uppercase font-sans font-bold text-zinc-400">
              IRII Finishing School
            </div>
          </div>

          {/* Core Content */}
          <div className="relative z-10 space-y-6 my-8">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-wide uppercase text-zinc-800 font-sans">
              Certificate of Completion
            </h2>
            <p className="text-sm italic text-zinc-500 font-sans">This is to certify that</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary py-2 border-b-2 border-zinc-100 max-w-md mx-auto">
              {studentName}
            </h1>
            <p className="text-sm italic text-zinc-500 font-sans">has successfully mastered</p>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-800">
              {courseTitle}
            </h3>
          </div>

          {/* Footer Signatures */}
          <div className="relative z-10 w-full grid grid-cols-2 gap-8 border-t border-zinc-200/80 pt-8 font-sans mt-4">
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm italic font-semibold text-zinc-700">{issueDate}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 mt-1">Date of Completion</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm italic font-semibold text-zinc-700">Dr. Elias Thorne</span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 mt-1">Chief Architect</span>
            </div>
          </div>

          {/* Certificate Verification Code */}
          <div className="relative z-10 text-[9px] text-zinc-400 tracking-wider font-sans mt-8 uppercase">
            Certificate ID: {cert?.id || "AA-SI-2824-9843-1182"} • Authenticity verified at verify.irii.in
          </div>
        </div>

        {/* Certificate Right Panel Info & Actions */}
        <div className="space-y-6">
          <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-xl text-foreground">Bravo, Engineer!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You&apos;ve completed one of our most rigorous tracks. Your credentials are now live and ready to be showcased to the world.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 border rounded-xl">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Top Performers</h4>
                  <p className="text-[10px] text-muted-foreground">Top 2% of the cohort</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/40 border rounded-xl">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Skill Badge Earned</h4>
                  <p className="text-[10px] text-muted-foreground">Integrity Specialist</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-3">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
              <button className="w-full flex items-center justify-center gap-2 py-3 border border-border bg-card font-semibold rounded-lg text-sm hover:bg-muted transition-colors">
                <Linkedin className="h-4 w-4 text-blue-600" />
                Share to LinkedIn
              </button>
            </div>
          </div>

          {/* Course Insights */}
          <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-foreground">Course Insights</h4>
            <div className="divide-y divide-border text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">42 Hours</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Difficulty</span>
                <span className="font-semibold text-accent">ADVANCED</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Instructor</span>
                <span className="font-semibold">Dr. Elias Thorne</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic pt-2">
              &quot;Architecture is a visual art, and the buildings speak for themselves.&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
