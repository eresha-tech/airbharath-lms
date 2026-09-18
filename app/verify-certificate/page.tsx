"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, Award, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function VerifyCertificateIndexPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/verify-certificate/${encodeURIComponent(code.trim())}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-28 max-w-3xl flex flex-col justify-center">
        <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden">
          {/* Header Banner */}
          <div className="bg-primary text-primary-foreground p-8 text-center space-y-3 relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-2">
                <ShieldCheck className="w-8 h-8 text-cyan-300" />
              </div>
              <span className="bg-white/15 text-white text-xs font-bold uppercase px-3 py-1 rounded-full border border-white/20 tracking-wider">
                Credential Verification Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white mt-2">
                Verify AirBharath LMS Certificate
              </h1>
              <p className="text-xs sm:text-sm text-primary-foreground/80 max-w-md mx-auto leading-relaxed">
                Enter the unique certificate code found on the bottom of any official AirBharath Certificate of Completion.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-10 space-y-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="certCode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Certificate Credential Code
                </label>
                <div className="relative">
                  <input
                    id="certCode"
                    type="text"
                    placeholder="e.g. AB-CERT-123456-789"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-input rounded-xl px-4 py-3 pl-11 text-sm font-mono font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary uppercase placeholder:normal-case placeholder:font-sans"
                    required
                  />
                  <Search className="w-5 h-5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-sm shadow-xs flex items-center justify-center gap-2"
              >
                <span>Verify Certificate</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant QR-code verification</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary shrink-0" />
                <span>Authentic digital credential records</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
