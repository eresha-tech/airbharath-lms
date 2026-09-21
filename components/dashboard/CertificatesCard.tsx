import Link from "next/link";
import { Award, GraduationCap, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CertificateItem {
  id: string;
  certificateCode: string;
  issuedAt: string | Date;
}

interface CertificatesCardProps {
  certificates: CertificateItem[];
}

export function CertificatesCard({ certificates }: CertificatesCardProps) {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit">
              Verified Certificates
            </h3>
            <p className="text-[11px] text-muted-foreground">
              QR-verifiable credentials
            </p>
          </div>
        </div>

        {certificates.length > 0 && (
          <Link
            href="/dashboard/certificates"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {certificates.length > 0 ? (
        <div className="space-y-2.5">
          {certificates.slice(0, 3).map((cert) => (
            <div
              key={cert.id}
              className="p-3.5 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between gap-3 hover:bg-muted/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground truncate font-mono">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{cert.certificateCode}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Issued {new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 px-2.5 shrink-0 rounded-lg"
              >
                <Link
                  href={`/verify-certificate/${cert.certificateCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <span>Verify</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-muted/20 border border-dashed border-border rounded-xl space-y-2.5">
          <div className="h-10 w-10 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">No certificates yet</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Complete 100% of lessons in any enrolled course to generate your verified certificate with tamper-proof QR verification.
          </p>
        </div>
      )}
    </div>
  );
}
