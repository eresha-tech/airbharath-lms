'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  Shield,
  ArrowRight,
  CheckCircle2,
  User,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Loader2,
  Mail,
  Award,
  BookOpen,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');

  // Sanitize callback URL (must be internal relative path)
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//')
      ? rawCallbackUrl
      : null;

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.user) {
          const dest = callbackUrl || (data.user.role === 'admin' ? '/admin' : '/dashboard');
          router.replace(dest);
        } else if (isMounted) {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        if (isMounted) setCheckingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router, callbackUrl]);

  // 30s Countdown timer for OTP Resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Step 1: Send OTP
  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setMessage('Please enter a valid 10-digit Indian mobile number');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setStep('otp');
      setResendTimer(30);
      setMessage('A 4-digit verification OTP has been sent to your mobile.');
      setIsSuccess(true);
    } catch (err: any) {
      setMessage(err.message || 'Failed to send OTP. Please try again.');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOTP = async () => {
    if (resendTimer > 0 || resendLoading) return;
    setResendLoading(true);
    setMessage('');
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

      setResendTimer(30);
      setMessage('A fresh 4-digit OTP has been resent to your mobile number.');
      setIsSuccess(true);
    } catch (err: any) {
      setMessage(err.message || 'Failed to resend OTP');
      setIsSuccess(false);
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e?: React.FormEvent, customOtp?: string) => {
    if (e) e.preventDefault();
    const otpToVerify = customOtp || otp;
    if (!otpToVerify || otpToVerify.length < 4) {
      setMessage('Please enter the complete 4-digit OTP code');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpToVerify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      if (data.isNewUser || !data.user?.fullName) {
        setStep('profile');
        setMessage('Mobile verified! Please tell us your name to set up your learning profile.');
        setIsSuccess(true);
      } else {
        setIsSuccess(true);
        setMessage('Login successful! Redirecting to your destination...');
        const dest = callbackUrl || (data.user?.role === 'admin' ? '/admin' : '/dashboard');
        setTimeout(() => {
          router.push(dest);
          router.refresh();
        }, 400);
      }
    } catch (err: any) {
      setMessage(err.message || 'Invalid or expired OTP');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Profile
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage('Please enter your full name');
      setIsSuccess(false);
      return;
    }
    if (!email.trim()) {
      setMessage('Please enter a valid email address');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setIsSuccess(true);
      setMessage('Profile setup complete! Redirecting to your dashboard...');
      const dest = callbackUrl || (data.user?.role === 'admin' ? '/admin' : '/dashboard');
      setTimeout(() => {
        router.push(dest);
        router.refresh();
      }, 400);
    } catch (err: any) {
      setMessage(err.message || 'Failed to update profile');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50/80 font-sans text-foreground">
      {/* Top Floating Back Link */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors py-1.5 px-3 rounded-full hover:bg-slate-200/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to AirBharath LMS</span>
        </Link>
      </div>

      {/* Main Split Layout Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row transition-all duration-300">
          
          {/* Left Branding & Highlights Panel (Desktop / Tablet Large) */}
          <div className="hidden lg:flex lg:w-5/12 bg-primary text-white p-8 xl:p-10 flex-col justify-between relative overflow-hidden">
            {/* Background Aesthetic Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#01374a] via-[#014a62] to-[#026282] pointer-events-none" />
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-300/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header Brand */}
            <div className="relative z-10 flex items-center gap-3">
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="AirBharath LMS"
                className="h-10 w-auto bg-white/10 p-1.5 rounded-xl border border-white/20 shadow-xs"
              />
              <div>
                <span className="text-xl font-bold font-outfit tracking-tight text-white block">
                  AirBharath <span className="text-cyan-200 font-semibold text-lg">LMS</span>
                </span>
                <span className="text-[10px] text-cyan-200/90 uppercase tracking-widest font-extrabold">
                  Aviation &amp; Technical Learning
                </span>
              </div>
            </div>

            {/* Core Value Proposition */}
            <div className="relative z-10 my-8 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Future-Ready Skill Upgrades</span>
              </div>

              <div className="space-y-2.5">
                <h1 className="text-2xl xl:text-3xl font-bold font-outfit leading-tight text-white">
                  Learn, Certify &amp; Elevate Your Career.
                </h1>
                <p className="text-xs xl:text-sm text-cyan-100/90 leading-relaxed font-normal">
                  Self-paced certificate programs in AI tools, digital marketing, entrepreneurship, and workplace productivity. Taught by IIM alumni and industry practitioners.
                </p>
              </div>

              {/* Feature Badges */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl p-3 backdrop-blur-md">
                  <div className="bg-[#01374a] p-2 rounded-lg text-cyan-300 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Instant 4-Digit Mobile OTP</h4>
                    <p className="text-[11px] text-cyan-100/80">Fast, passwordless login with your mobile number.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl p-3 backdrop-blur-md">
                  <div className="bg-[#01374a] p-2 rounded-lg text-cyan-300 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">QR-Verifiable Credentials</h4>
                    <p className="text-[11px] text-cyan-100/80">Earn official certificates upon 100% completion.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl p-3 backdrop-blur-md">
                  <div className="bg-[#01374a] p-2 rounded-lg text-cyan-300 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">100% Self-Paced Access</h4>
                    <p className="text-[11px] text-cyan-100/80">Access HD videos, notes, and doubt Q&amp;A anytime.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="relative z-10 pt-4 border-t border-white/15 text-[11px] text-cyan-200/80 flex items-center justify-between">
              <span>Secure 256-Bit SSL Gateway</span>
              <span>ISO &amp; GST Compliant</span>
            </div>
          </div>

          {/* Right Auth Form Panel */}
          <div className="w-full lg:w-7/12 p-6 sm:p-10 xl:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-6">

              {/* Mobile Branding (Visible only on mobile/tablet) */}
              <div className="lg:hidden text-center space-y-2 pb-2">
                <img
                  src="https://assets.airbharath.in/logo.webp"
                  alt="AirBharath LMS"
                  className="h-9 w-auto mx-auto object-contain"
                />
                <h2 className="text-sm font-bold uppercase tracking-wider text-primary font-outfit">
                  AirBharath LMS
                </h2>
              </div>

              {/* Stepper Progress Bar */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step === 'phone'
                        ? 'bg-primary text-white ring-2 ring-primary/20'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {step === 'phone' ? '1' : '✓'}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">Mobile Number</span>
                </div>

                <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step === 'otp'
                        ? 'bg-primary text-white ring-2 ring-primary/20'
                        : step === 'profile'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step === 'profile' ? '✓' : '2'}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">Verification</span>
                </div>

                {step === 'profile' && (
                  <>
                    <div className="h-0.5 flex-1 bg-slate-200 mx-2" />
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white ring-2 ring-primary/20 flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Profile</span>
                    </div>
                  </>
                )}
              </div>

              {/* STEP 1: PHONE NUMBER INPUT */}
              {step === 'phone' && (
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
                      Sign In or Register
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground font-normal">
                      Enter your 10-digit mobile number to receive a secure OTP. No password required.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-input" className="text-xs font-bold text-slate-700">
                      Mobile Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 text-xs font-bold text-slate-600 flex items-center gap-1.5 border-r border-slate-200 pr-2.5 z-10 select-none">
                        <span>🇮🇳 +91</span>
                      </div>
                      <Input
                        id="phone-input"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        maxLength={10}
                        className="pl-20 pr-10 h-12 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-primary"
                        required
                        autoFocus
                        disabled={loading}
                      />
                      <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Works for both existing and new students automatically.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || phone.length < 10}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 4-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* STEP 2: 4-BOX INPUT OTP */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
                        Verify Phone
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('phone');
                          setOtp('');
                          setMessage('');
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer py-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Change Number</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-normal">
                      We sent a 4-digit code to{' '}
                      <span className="font-bold text-slate-900">
                        +91 {phone.slice(0, 3)}••••{phone.slice(-3)}
                      </span>
                    </p>
                  </div>

                  {/* 4-Box InputOTP Component */}
                  <div className="space-y-3 flex flex-col items-center justify-center py-2">
                    <Label className="text-xs font-bold text-slate-700 text-center">
                      Enter 4-Digit Verification Code
                    </Label>

                    <InputOTP
                      maxLength={4}
                      value={otp}
                      onChange={(value) => {
                        setOtp(value);
                        if (value.length === 4) {
                          handleVerifyOTP(undefined, value);
                        }
                      }}
                      autoFocus
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || otp.length < 4}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || resendLoading || loading}
                      className={`text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        resendTimer > 0 || resendLoading || loading
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-primary hover:underline cursor-pointer'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                      {resendLoading ? (
                        <span>Resending code...</span>
                      ) : resendTimer > 0 ? (
                        <span>Resend code in {resendTimer}s</span>
                      ) : (
                        <span>Didn&apos;t receive code? Resend OTP</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: PROFILE SETUP */}
              {step === 'profile' && (
                <form onSubmit={handleCompleteProfile} className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
                      Complete Your Profile
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground font-normal">
                      Welcome to AirBharath LMS! Please enter your details as they should appear on your completion certificates.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullname-input" className="text-xs font-bold text-slate-700">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="fullname-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Captain Rajesh Sharma"
                        className="pr-10 h-12 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-primary"
                        required
                        autoFocus
                        disabled={loading}
                      />
                      <User className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      This name will be printed on your official verifiable PDF certificate.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-input" className="text-xs font-bold text-slate-700">
                      Email Address <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rajesh.sharma@example.com"
                        className="pr-10 h-12 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-primary"
                        required
                        disabled={loading}
                      />
                      <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Used for enrollment invoices, course announcements, and certificate delivery.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !fullName.trim() || !email.trim()}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Profile &amp; Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Alert / Notification Feedback Message */}
              {message && (
                <div
                  role="alert"
                  aria-live="polite"
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all text-xs font-medium ${
                    isSuccess
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed">{message}</p>
                </div>
              )}

              {/* Footer Legal Agreement */}
              <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-muted-foreground">
                <p>
                  By continuing, you agree to AirBharath LMS{' '}
                  <Link href="/terms" className="text-primary font-semibold hover:underline">
                    Terms &amp; Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="w-full px-6 py-4 text-center text-xs text-slate-500 font-medium border-t border-slate-200/60 bg-white/50 backdrop-blur-xs">
        <p>&copy; {new Date().getFullYear()} AirBharath LMS. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">Loading AirBharath LMS...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

