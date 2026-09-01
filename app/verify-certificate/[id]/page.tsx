import Link from 'next/link';
import { db } from '@/lib/db';
import { certificates, users, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CheckCircle2, ShieldCheck, XCircle, Award, Calendar, User, BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import { Footer } from '@/components/Footer';

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { id } = await params;

  // Search by certificateCode or id
  const cert = await db.query.certificates.findFirst({
    where: eq(certificates.certificateCode, id),
  });

  const student = cert ? await db.query.users.findFirst({ where: eq(users.id, cert.userId) }) : null;
  const course = cert ? await db.query.courses.findFirst({ where: eq(courses.id, cert.courseId) }) : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-28 max-w-3xl">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          
          {cert ? (
            <div>
              {/* Authenticity Header */}
              <div className="bg-[#014a62] text-white p-8 text-center space-y-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#01374a] via-[#014a62] to-[#026282] opacity-90" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-2">
                    <ShieldCheck className="w-10 h-10 text-emerald-400" />
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold uppercase px-3 py-1 rounded-full border border-emerald-400/30 tracking-wider">
                    Verified Authentic Certificate
                  </span>
                  <h1 className="text-2xl md:text-3xl font-bold font-instrument-serif text-white mt-2">
                    Airbharath LMS Official Credential
                  </h1>
                </div>
              </div>

              {/* Details List */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                    <User className="w-5 h-5 text-[#014a62] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Student Name</span>
                      <strong className="text-base text-[#014a62]">{student?.fullName || 'Airbharath Student'}</strong>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                    <Award className="w-5 h-5 text-[#014a62] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Certificate Code</span>
                      <strong className="text-sm font-mono text-foreground">{cert.certificateCode}</strong>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3 md:col-span-2">
                    <BookOpen className="w-5 h-5 text-[#014a62] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Course Name</span>
                      <strong className="text-base text-[#014a62]">{course?.title || 'Airbharath Certified Course'}</strong>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3 md:col-span-2">
                    <Calendar className="w-5 h-5 text-[#014a62] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Date of Issuance</span>
                      <strong className="text-sm text-foreground">
                        {new Date(cert.issuedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </strong>
                    </div>
                  </div>

                </div>

                <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This certificate is cryptographically recorded and verified by Airbharath LMS.
                  </p>
                  
                  {cert.pdfUrl && (
                    <a
                      href={cert.pdfUrl}
                      download={`Certificate-${cert.certificateCode}.pdf`}
                      className="px-5 py-2.5 bg-[#014a62] text-white text-xs font-bold rounded-xl hover:bg-[#01374a] transition-all shadow-md shrink-0"
                    >
                      Download Original PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold font-instrument-serif text-rose-900">Certificate Not Found</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                The certificate code <strong>{id}</strong> could not be verified in our records. Please verify the code and scan the official QR code on the certificate.
              </p>
              <div className="pt-4">
                <Link href="/" className="px-6 py-3 bg-[#014a62] text-white text-xs font-bold rounded-xl hover:bg-[#01374a] transition-all">
                  Back to Airbharath LMS
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
