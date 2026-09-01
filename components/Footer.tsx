import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card text-foreground py-16 border-t border-border/80 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#014a62]/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-6">
            <Link href="/" className="flex items-center space-x-3">
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="Airbharath LMS"
                className="h-8 w-auto object-contain"
              />
              <span className="text-xl font-bold font-instrument-serif text-[#014a62]">Airbharath LMS</span>
            </Link>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed max-w-sm">
              Airbharath LMS is premier aviation & technical education ecosystem. Empowering students with industry-relevant skillsets, verified certification, and practical training.
            </p>
          </div>
          
          {/* Navigation links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Platform</h4>
            <ul className="space-y-3 text-xs md:text-sm text-muted-foreground">
              <li>
                <Link href="/my-courses" className="hover:text-[#014a62] transition-colors font-medium">My Courses</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#014a62] transition-colors font-medium">About Us</Link>
              </li>
            </ul>
          </div>
          
          {/* Help & Support info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Support</h4>
            <ul className="space-y-3 text-xs md:text-sm text-muted-foreground">
              <li>
                <Link href="/faq" className="hover:text-[#014a62] transition-colors font-medium">FAQ</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#014a62] transition-colors font-medium">Contact Us</Link>
              </li>
            </ul>
            <div className="space-y-2 pt-2 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#014a62] shrink-0" />
                <a href="mailto:support@airbharath.in" className="hover:text-[#014a62] transition-colors">support@airbharath.in</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#014a62] shrink-0" />
                <span className="text-muted-foreground">India</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer bottom bar */}
        <div className="border-t border-border/60 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] font-semibold text-muted-foreground gap-4">
          <p>© {new Date().getFullYear()} Airbharath. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#014a62] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#014a62] transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
