import Link from "next/link";
import { Mail, MapPin, Award, GraduationCap, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-100 py-16 border-t border-slate-800 relative overflow-hidden font-sans">
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-5">
            <Link href="/" className="flex items-center space-x-3">
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="Airbharath LMS"
                className="h-9 w-auto bg-white/10 p-1.5 rounded-xl border border-white/20"
              />
              <span className="text-2xl font-bold font-instrument-serif text-white">
                Air Bharath LMS
              </span>
            </Link>

            <div className="space-y-2">
              <h4 className="text-base font-bold font-instrument-serif text-cyan-300">
                Learn Today. Grow Tomorrow.
              </h4>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-md">
                Build skills. Create possibilities. Keep growing.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-white block">Open to:</span>
              <p className="text-slate-300">
                Students | Job Seekers | Professionals | Aviation Professionals | Entrepreneurs
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs md:text-sm text-slate-300">
              <li>
                <Link href="#courses" className="hover:text-white transition-colors font-medium">
                  Four Courses
                </Link>
              </li>
              <li>
                <Link href="/my-courses" className="hover:text-white transition-colors font-medium">
                  My Enrolled Courses
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-white transition-colors font-medium">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors font-medium">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Credibility */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Excellence Standard
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>30+ Years Aviation & Tech Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Taught by IIM Alumni & Practitioners</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href="mailto:support@airbharath.in" className="hover:text-white transition-colors">
                  support@airbharath.in
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Tagline & Copyright */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-semibold text-slate-200">
              Learn. Grow. Succeed — with Air Bharath.
            </p>
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Air Bharath LMS. All rights reserved.
            </p>
          </div>

          <div className="flex gap-6 text-[11px]">
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
