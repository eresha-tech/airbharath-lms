"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  MapPin,
  Clock,
  Building,
  Send,
  Check,
  Copy,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactView() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("General Academic Inquiry");
  const [message, setMessage] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const officialEmail = "academy@airbharath.in";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(officialEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${category}] Inquiry from ${name || "Student"}`);
    const body = encodeURIComponent(
      `Hello AirBharath LMS Team,\n\nName: ${name}\nEmail: ${email}\nProgram / Topic: ${category}\n\nMessage:\n${message}\n\n--\nSent from AirBharath LMS Contact Page`
    );
    window.location.href = `mailto:${officialEmail}?subject=${subject}&body=${body}`;
    setIsSent(true);
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground pb-20">
      {/* Hero Section */}
      <section className="pt-28 pb-14 border-b border-border">
        <div className="container mx-auto px-4 max-w-5xl space-y-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
            <Mail className="h-4 w-4" />
            <span>Get in Touch</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-outfit tracking-tight text-foreground">
            Let&apos;s <span className="text-primary">Talk.</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Have questions regarding course admissions, curriculum structure, verifiable certificates, or corporate partnerships? Our team is here to assist.
          </p>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className="container mx-auto px-4 max-w-6xl mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                Send Us a Message
              </h2>
              <p className="text-xs text-muted-foreground">
                Fill out the details below to launch an email directly to our academic desk.
              </p>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Your Name
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl text-xs font-medium border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl text-xs font-medium border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Inquiry Topic
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3.5 py-2 rounded-xl text-xs font-semibold bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="General Academic Inquiry">General Academic Inquiry</option>
                  <option value="Course Enrollment & Access">Course Enrollment &amp; Access</option>
                  <option value="All-in-One Combo Pass">All-in-One Combo Pass</option>
                  <option value="Certificate & QR Verification">Certificate &amp; QR Verification</option>
                  <option value="Tax Invoice & Payments">Tax Invoice &amp; Payments</option>
                  <option value="Placement & Job Board">Placement &amp; Job Board</option>
                  <option value="Institutional & Corporate Training">Institutional &amp; Corporate Training</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Message
                </label>
                <Textarea
                  required
                  rows={5}
                  placeholder="How can we help you today? Please include any course names or specific questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl text-xs font-medium border-border leading-relaxed"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Email to academy@airbharath.in</span>
              </Button>

              {isSent && (
                <p className="text-xs text-emerald-600 font-semibold text-center pt-1">
                  Email client opened with prefilled message. You can also email us directly at {officialEmail}.
                </p>
              )}
            </form>
          </div>

          {/* Right Column: Verified Entity & Contact Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Direct Email Card */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-outfit text-foreground">
                    Academic Helpdesk
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Primary channel for student queries
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-muted/50 rounded-2xl border border-border/60 flex items-center justify-between gap-3">
                <span className="font-mono font-bold text-xs text-primary truncate">
                  {officialEmail}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="h-8 px-2.5 text-xs text-slate-700 hover:text-primary rounded-lg shrink-0 cursor-pointer"
                  title="Copy email address"
                >
                  {copiedEmail ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold">
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Corporate Location Card */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-outfit text-foreground">
                    Corporate Entity
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Registered office &amp; operations
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed pt-1">
                <p className="font-bold text-foreground">
                  Eresha Technology Innovators Pvt. Ltd.
                </p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    20/36D, Ground Floor, West Patel Nagar, New Delhi, Delhi, India — 110008
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-foreground/80">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Support Hours: Mon – Sat, 10:00 AM – 6:00 PM IST</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation / Knowledge Card */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 shadow-xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                Quick Answers
              </span>
              <h4 className="text-sm font-bold font-outfit text-foreground">
                Looking for immediate answers?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Check our Frequently Asked Questions or verify an issued credential directly.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/faq"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" />
                    <span>Frequently Asked Questions</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/verify-certificate"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verify a Certificate</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
