import Link from "next/link";
import { Mail, MapPin, ShieldCheck, BookOpen } from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/app-version";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-100 py-16 border-t border-slate-800/80 relative overflow-hidden font-sans">
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (2 columns wide) */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="flex items-center space-x-3 group">
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="AirBharath LMS"
                className="h-9 w-auto bg-white/10 p-1.5 rounded-xl border border-white/20 transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-bold font-outfit text-white tracking-tight">
                AirBharath <span className="text-primary-foreground/70 font-medium">LMS</span>
              </span>
            </Link>

            <div className="space-y-2">
              <h4 className="text-sm font-bold font-outfit text-slate-200">
                Practical Learning. Verifiable Outcomes.
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
                Industry-focused certificate programs built for working professionals, students, creators, and entrepreneurs. Taught by IIM Alumni and industry practitioners.
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href="mailto:academy@airbharath.in" className="hover:text-white transition-colors">
                  academy@airbharath.in
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Eresha Technology Innovators Pvt. Ltd., West Patel Nagar, New Delhi 110008</span>
              </div>
            </div>
          </div>

          {/* Programs Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
              Certificate Programs
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <Link href="/courses/combo-pack" className="hover:text-white transition-colors font-medium">
                  All-in-One Combo Pass
                </Link>
              </li>
              <li>
                <Link href="/courses/ai-skills" className="hover:text-white transition-colors font-medium">
                  AI Tools Masterclass
                </Link>
              </li>
              <li>
                <Link href="/courses/content-creation" className="hover:text-white transition-colors font-medium">
                  Digital Marketing &amp; Content
                </Link>
              </li>
              <li>
                <Link href="/courses/entrepreneurship" className="hover:text-white transition-colors font-medium">
                  Entrepreneurship Launch
                </Link>
              </li>
              <li>
                <Link href="/courses/ms-office" className="hover:text-white transition-colors font-medium">
                  MS Office &amp; Excel Suite
                </Link>
              </li>
              <li className="pt-1">
                <Link href="/courses" className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1">
                  <span>View All Programs</span>
                  <span>&rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white transition-colors font-medium">
                  Courses Catalog
                </Link>
              </li>
              <li>
                <Link href="/verify-certificate" className="hover:text-white transition-colors font-medium">
                  Verify Certificate
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors font-medium">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors font-medium">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors font-medium">
                  Student Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
              Support &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors font-medium">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors font-medium">
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors font-medium">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors font-medium">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors font-medium">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Tagline & Copyright */}
        <div className="border-t border-slate-800/80 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-semibold text-slate-200">
              Learn. Build. Succeed — with AirBharath LMS.
            </p>
            <p className="text-[11px] text-slate-500">
              &copy; {new Date().getFullYear()} Eresha Technology Innovators Pvt. Ltd. ({APP_NAME} v{APP_VERSION}). All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              Terms &amp; Conditions
            </Link>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <Link href="/contact" className="hover:text-slate-200 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


