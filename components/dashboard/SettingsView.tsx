"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Bell,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  LogOut,
  Calendar,
  Sparkles,
  ExternalLink,
  ArrowRight,
  Lock,
  Edit3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface SettingsUser {
  id: string;
  phone: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt?: string | Date | null;
}

export interface SettingsStats {
  enrolledCount: number;
  certificatesCount: number;
  completedLessonsCount: number;
}

interface SettingsViewProps {
  initialUser: SettingsUser;
  stats: SettingsStats;
}

export function SettingsView({ initialUser, stats }: SettingsViewProps) {
  const router = useRouter();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(initialUser.fullName || "");
  const [email, setEmail] = useState(initialUser.email || "");
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl || "");
  const [user, setUser] = useState<SettingsUser>(initialUser);

  // Status States
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Local Notification Preferences
  const [emailNotify, setEmailNotify] = useState(true);
  const [repliesNotify, setRepliesNotify] = useState(true);
  const [jobsNotify, setJobsNotify] = useState(true);
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const emailPref = localStorage.getItem("pref_email_notify") !== "false";
      const replyPref = localStorage.getItem("pref_reply_notify") !== "false";
      const jobsPref = localStorage.getItem("pref_jobs_notify") !== "false";
      setEmailNotify(emailPref);
      setRepliesNotify(replyPref);
      setJobsNotify(jobsPref);
    }
  }, []);

  // Format phone for privacy masking (e.g., +91 ••••• •4210)
  const formatMaskedPhone = (phoneStr?: string) => {
    if (!phoneStr) return "N/A";
    const cleaned = phoneStr.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      const last4 = cleaned.slice(-4);
      return `+91 ••••• •${last4}`;
    }
    return phoneStr;
  };

  // Formatted Member Since Date
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "September 2026";

  const initials =
    (user.fullName || "Student")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setUser((prev) => ({
        ...prev,
        fullName: data.user.fullName,
        email: data.user.email,
      }));

      setSuccessMsg("Profile information updated successfully.");
      setIsEditing(false);
      router.refresh();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Preferences Save
  const handleTogglePreference = (
    key: "email" | "replies" | "jobs",
    val: boolean
  ) => {
    if (key === "email") {
      setEmailNotify(val);
      localStorage.setItem("pref_email_notify", String(val));
    } else if (key === "replies") {
      setRepliesNotify(val);
      localStorage.setItem("pref_reply_notify", String(val));
    } else if (key === "jobs") {
      setJobsNotify(val);
      localStorage.setItem("pref_jobs_notify", String(val));
    }

    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 font-sans">
      {/* Page Title & Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Account &amp; Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
          Student Profile &amp; Preferences
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Manage your personal details, verifiable certificate identity, account security, and notification settings.
        </p>
      </div>

      {/* Global Status Messages */}
      {successMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: Profile Card (Display + Edit Mode) */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-primary/20 shadow-xs">
              {user.avatarUrl && (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.fullName || "Student"}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl font-bold rounded-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                  {user.fullName || "Student"}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary capitalize">
                  {user.role === "admin" ? "Administrator" : "Active Student"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{user.email || "No email registered"}</span>
              </p>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Member since {memberSince}</span>
              </p>
            </div>
          </div>

          <Button
            variant={isEditing ? "outline" : "default"}
            onClick={() => {
              setIsEditing(!isEditing);
              setErrorMsg("");
            }}
            className={`rounded-xl text-xs font-bold h-10 px-4 shrink-0 transition-all cursor-pointer ${
              isEditing
                ? "border-border text-foreground hover:bg-muted"
                : "bg-primary hover:bg-primary/90 text-white shadow-xs"
            }`}
          >
            {isEditing ? (
              <>
                <X className="w-3.5 h-3.5 mr-1.5" />
                <span>Cancel Editing</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                <span>Edit Profile</span>
              </>
            )}
          </Button>
        </div>

        {/* Profile Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-6 pt-2">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                <strong>Important:</strong> Your Full Legal Name will be printed on all your official verifiable PDF completion certificates. Please ensure accurate spelling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs font-bold text-foreground">
                  Full Legal Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="edit-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Captain Rajesh Sharma"
                    className="pr-10 h-11 text-xs font-semibold rounded-xl border-border bg-background focus-visible:ring-primary"
                    required
                    disabled={saving}
                  />
                  <User className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-xs font-bold text-foreground">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rajesh.sharma@example.com"
                    className="pr-10 h-11 text-xs font-semibold rounded-xl border-border bg-background focus-visible:ring-primary"
                    required
                    disabled={saving}
                  />
                  <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-xs font-bold text-foreground">
                Registered Mobile Number (Read-Only)
              </Label>
              <div className="relative">
                <Input
                  id="edit-phone"
                  type="text"
                  value={formatMaskedPhone(user.phone)}
                  disabled
                  className="pr-10 h-11 text-xs font-semibold rounded-xl bg-muted/60 border-border text-muted-foreground cursor-not-allowed select-none"
                />
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mobile number is tied to your primary OTP authentication identity and cannot be altered online.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="h-10 px-4 rounded-xl text-xs font-bold border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !fullName.trim() || !email.trim()}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-xs flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Profile Information Summary View */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Full Name
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                {user.fullName || "Not set"}
              </p>
            </div>

            <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                {user.email || "Not set"}
              </p>
            </div>

            <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Mobile Number
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground font-mono">
                {formatMaskedPhone(user.phone)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Learning Overview Summary */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Learning &amp; Academic Overview</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Summary of your active courses, completed lessons, and issued digital credentials.
            </p>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 self-start sm:self-auto rounded-xl"
          >
            <Link href="/dashboard/courses" className="flex items-center gap-1.5">
              <span>View Enrolled Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Enrolled Courses</span>
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
              {stats.enrolledCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Active learning programs
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-transparent border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">Verified Certificates</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
              {stats.certificatesCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              QR-verified PDF credentials
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-cyan-500/10 to-transparent border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-800">Completed Lessons</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
              {stats.completedLessonsCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tracked video modules
            </p>
          </div>
        </div>

        {stats.enrolledCount === 0 && (
          <div className="p-6 rounded-2xl bg-muted/20 border border-border/60 text-center space-y-3">
            <p className="text-xs text-muted-foreground font-medium">
              You haven&apos;t enrolled in any certificate programs yet.
            </p>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
            >
              <Link href="/courses">Explore All Courses</Link>
            </Button>
          </div>
        )}
      </div>

      {/* SECTION 3: Account Security & Authentication */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Account Security &amp; Authentication</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your login and authentication credentials for the AirBharath LMS portal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Authentication Method</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="text-xs font-semibold text-primary">Passwordless Mobile OTP</p>
            <p className="text-[11px] text-muted-foreground">
              Instant 4-digit code delivered via high-speed SMS OTP gateway.
            </p>
          </div>

          <div className="p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Session Encryption</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <Shield className="w-3 h-3" />
                HS256 JWT
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground">256-Bit Encrypted Cookie</p>
            <p className="text-[11px] text-muted-foreground">
              Secured with HTTP-only, SameSite lax session protection.
            </p>
          </div>
        </div>

        {/* Log Out Action */}
        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Sign Out of Session</h4>
            <p className="text-[11px] text-muted-foreground">
              Securely end your current login session on this device.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-10 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                <span>Log Out of Account</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* SECTION 4: Notification Preferences */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span>Notification Preferences</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize email and in-app alerts for course activities and updates.
            </p>
          </div>

          {prefSaved && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Course Announcements &amp; Updates</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive notifications when new lessons, assignments, or curriculum updates are published.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={(e) => handleTogglePreference("email", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
              aria-label="Toggle course announcements"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Lesson Doubts &amp; Discussion Replies</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive alerts when instructors or peers respond to your posted doubt questions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={repliesNotify}
              onChange={(e) => handleTogglePreference("replies", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
              aria-label="Toggle doubt replies"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Aviation Opportunities &amp; Job Board Alerts</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive weekly notifications regarding verified aviation, tech, and corporate openings.
              </p>
            </div>
            <input
              type="checkbox"
              checked={jobsNotify}
              onChange={(e) => handleTogglePreference("jobs", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
              aria-label="Toggle job alerts"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
