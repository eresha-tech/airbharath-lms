'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Shield, ArrowRight, CheckCircle2, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setMessage('OTP sent successfully to your mobile number!');
      setIsSuccess(true);
    } catch (err: any) {
      setMessage(err.message);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setMessage('Please enter a valid OTP');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
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
    <div className="flex flex-col min-h-screen bg-[#fafbfc] text-[#0f172a]">
      {/* Centered Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[580px] transition-all duration-500">
          
          {/* Left Panel - Airbharath Branding */}
          <div className="md:w-1/2 bg-[#014a62] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#01374a] via-[#014a62] to-[#026282] opacity-95 z-0" />
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl z-0" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl z-0" />

            <div className="relative z-10 flex items-center gap-3">
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="Airbharath LMS"
                className="h-10 w-auto bg-white/10 p-1.5 rounded-xl border border-white/20"
              />
              <div>
                <span className="text-xl font-bold font-instrument-serif tracking-tight text-white block">
                  Airbharath LMS
                </span>
                <span className="text-[10px] text-cyan-200 uppercase tracking-wider font-semibold">
                  Aviation & Technical Excellence
                </span>
              </div>
            </div>

            <div className="relative z-10 my-10 space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold font-instrument-serif leading-tight text-white">
                Learn, Certify & Elevate Your Career.
              </h1>
              <p className="text-sm text-cyan-100 leading-relaxed max-w-md font-sans">
                Access industry-led courses, QR-verifiable certificates, and hands-on technical training all in one place.
              </p>
            </div>

            <div className="relative z-10 bg-white/10 border border-white/15 rounded-2xl p-4 flex gap-4 items-center backdrop-blur-md">
              <div className="bg-[#014a62] p-2.5 rounded-xl border border-white/20 shrink-0 text-cyan-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Instant Mobile OTP Auth</h4>
                <p className="text-[11px] text-cyan-100 mt-0.5">
                  Fast, passwordless login with your mobile phone number.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Auth Actions */}
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-6">

              {step === 'phone' && (
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Sign In / Sign Up</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your mobile number to receive an OTP via SMS
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Mobile Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-xs font-bold text-muted-foreground flex items-center gap-1.5 border-r border-border pr-2.5">
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        maxLength={10}
                        className="w-full border border-border rounded-xl pl-16 pr-4 py-3 text-sm font-semibold bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014a62] focus:border-[#014a62] transition-all"
                        required
                      />
                      <Phone className="absolute right-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-all shadow-md shadow-[#014a62]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Enter OTP</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      We sent a 6-digit code to <span className="font-bold text-foreground">+91 {phone}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      OTP Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter OTP (e.g. 123456)"
                      maxLength={6}
                      className="w-full text-center tracking-widest text-lg border border-border rounded-xl px-4 py-3 font-mono font-bold bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014a62] focus:border-[#014a62] transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-all shadow-md shadow-[#014a62]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify OTP & Continue'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-[#014a62]"
                  >
                    Change mobile number
                  </button>
                </form>
              )}

              {step === 'profile' && (
                <form onSubmit={handleCompleteProfile} className="space-y-5">
                  <div>
                    <h2 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Complete Your Profile</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Welcome to Airbharath LMS! Tell us your name to get started.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full border border-border rounded-xl px-4 py-3 pr-10 text-sm font-semibold bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014a62] focus:border-[#014a62] transition-all"
                        required
                      />
                      <User className="absolute right-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm font-semibold bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#014a62] focus:border-[#014a62] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-all shadow-md shadow-[#014a62]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Saving...' : 'Complete Registration'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {message && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isSuccess 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
                  <p className="text-xs font-semibold leading-relaxed">{message}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <footer className="w-full px-6 py-6 border-t border-border/40 bg-[#fafbfc] text-center text-xs text-muted-foreground font-medium">
        © {new Date().getFullYear()} Airbharath LMS. All rights reserved.
      </footer>
    </div>
  );
}
