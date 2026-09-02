'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Shield, ArrowRight, CheckCircle2, User, RefreshCw, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function LoginPage() {
  const router = useRouter();
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
    if (cleanPhone.length < 10) {
      setMessage('Please enter a valid 10-digit mobile number');
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
      setMessage('OTP sent successfully to your mobile number!');
      setIsSuccess(true);
    } catch (err: any) {
      setMessage(err.message);
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
      setMessage('A new OTP has been sent to your mobile number!');
      setIsSuccess(true);
    } catch (err: any) {
      setMessage(err.message);
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
      setMessage('Please enter a valid 4-digit OTP');
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
        setMessage('Verification complete! Please enter your full name to set up your profile.');
        setIsSuccess(true);
      } else {
        setIsSuccess(true);
        setMessage('Successfully logged in! Redirecting...');
        setTimeout(() => {
          router.push(data.user?.role === 'admin' ? '/admin' : '/dashboard');
          router.refresh();
        }, 500);
      }
    } catch (err: any) {
      setMessage(err.message);
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
      setMessage('Please enter your email address');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setIsSuccess(true);
      setMessage('Profile setup complete! Redirecting to dashboard...');
      setTimeout(() => {
        router.push(data.user?.role === 'admin' ? '/admin' : '/dashboard');
        router.refresh();
      }, 500);
    } catch (err: any) {
      setMessage(err.message);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70 text-slate-900 font-sans">
      {/* Centered Auth Container */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col md:flex-row transition-all duration-300">
          
          {/* Desktop Left Branding Banner (Hidden on Mobile) */}
          <div className="hidden md:flex md:w-1/2 bg-[#014a62] text-white p-10 lg:p-12 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#01374a] via-[#014a62] to-[#026282] opacity-95 pointer-events-none" />
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3">
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="Airbharath LMS"
                className="h-10 w-auto bg-white/10 p-1.5 rounded-xl border border-white/20 shadow-xs"
              />
              <div>
                <span className="text-xl font-bold font-instrument-serif tracking-tight text-white block">
                  Airbharath LMS
                </span>
                <span className="text-[10px] text-cyan-200 uppercase tracking-widest font-extrabold">
                  Aviation &amp; Technical Excellence
                </span>
              </div>
            </div>

            <div className="relative z-10 my-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Future-Ready Skill Upgrades</span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold font-instrument-serif leading-tight text-white">
                Learn, Certify &amp; Elevate Your Career.
              </h1>
              <p className="text-sm text-cyan-100 leading-relaxed font-sans">
                Access industry-led courses, QR-verifiable PDF certificates, and practical technical modules all in one place.
              </p>
            </div>

            <div className="relative z-10 bg-white/10 border border-white/15 rounded-2xl p-4 flex gap-4 items-center backdrop-blur-md">
              <div className="bg-[#014a62] p-2.5 rounded-xl border border-white/20 shrink-0 text-cyan-300 shadow-xs">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">Instant 4-Digit Mobile OTP</h4>
                <p className="text-[11px] text-cyan-100 mt-0.5 font-medium">
                  Passwordless, instant authentication using your 10-digit mobile number.
                </p>
              </div>
            </div>
          </div>

          {/* Right Auth Form Panel (Compact & Concise on Mobile) */}
          <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-sm w-full mx-auto space-y-6">

              {/* Mobile Concise Header (Logo + 1-Line Subtitle) */}
              <div className="md:hidden text-center space-y-2 pb-2">
                <img
                  src="https://assets.airbharath.in/logo.webp"
                  alt="Airbharath LMS"
                  className="h-10 w-auto mx-auto object-contain"
                />
                <p className="text-xs font-bold uppercase tracking-wider text-[#014a62]">
                  Aviation &amp; Technical Excellence
                </p>
              </div>

              {/* STEP 1: PHONE NUMBER INPUT */}
              {step === 'phone' && (
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-bold font-instrument-serif text-[#014a62]">Sign In / Sign Up</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Enter your 10-digit mobile number to receive an OTP
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-input">Mobile Phone Number</Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 text-xs font-bold text-slate-600 flex items-center gap-1.5 border-r border-slate-200 pr-2.5 z-10">
                        <span>+91</span>
                      </div>
                      <Input
                        id="phone-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        maxLength={10}
                        className="pl-16 pr-10 h-12 text-sm font-semibold"
                        required
                        autoFocus
                      />
                      <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#014a62] hover:bg-[#01374a] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-[#014a62]/15 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* STEP 2: 4-BOX INPUT OTP WITH SHADCN */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl md:text-3xl font-bold font-instrument-serif text-[#014a62]">Enter 4-Digit OTP</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('phone');
                          setOtp('');
                        }}
                        className="text-xs font-bold text-[#014a62] hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Edit Number</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      We sent a 4-digit code to <span className="font-bold text-slate-900">+91 {phone}</span>
                    </p>
                  </div>

                  {/* 4-Box InputOTP Component */}
                  <div className="space-y-3 flex flex-col items-center justify-center py-2">
                    <Label className="text-center">Enter 4-Digit Verification Pin</Label>
                    
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
                    className="w-full h-12 bg-[#014a62] hover:bg-[#01374a] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-[#014a62]/15 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify OTP &amp; Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || resendLoading}
                      className={`text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        resendTimer > 0 || resendLoading
                          ? "text-slate-400 cursor-not-allowed"
                          : "text-[#014a62] hover:underline"
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                      {resendLoading ? (
                        <span>Resending...</span>
                      ) : resendTimer > 0 ? (
                        <span>Resend OTP in {resendTimer}s</span>
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
                    <h2 className="text-2xl md:text-3xl font-bold font-instrument-serif text-[#014a62]">Complete Profile</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Welcome to Airbharath LMS! Tell us your full name to get started.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullname-input">Full Name *</Label>
                    <div className="relative">
                      <Input
                        id="fullname-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="pr-10 h-12 text-sm font-semibold"
                        required
                        autoFocus
                      />
                      <User className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-input">Email Address *</Label>
                    <Input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="h-12 text-sm font-semibold"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#014a62] hover:bg-[#01374a] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-[#014a62]/15 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Alert / Notification Feedback Message */}
              {message && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  isSuccess 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
                  <p className="text-xs font-semibold leading-relaxed">{message}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <footer className="w-full px-6 py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 font-medium">
        © {new Date().getFullYear()} Airbharath LMS. All rights reserved.
      </footer>
    </div>
  );
}
