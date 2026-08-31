'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Mail, Shield, Compass, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSuccess(false);
    } else {
      setMessage(
        mode === 'signin'
          ? 'A secure login link has been sent to your email.'
          : 'A secure registration link has been sent to your email.'
      );
      setIsSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafbfc] text-[#1e293b]">
      {/* Centered Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-all duration-500">
          {/* Left panel - Dark Teal Branding */}
          <div className="md:w-1/2 bg-[#023d4c] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#012631] via-[#023d4c] to-[#045265] opacity-95 z-0"></div>
            
            {/* Ambient decorative glowing spots */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl z-0" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl z-0" />

            <div className="relative z-10 flex items-center gap-2.5">
              <Compass className="h-7 w-7 text-emerald-400 animate-pulse" />
              <div>
                <span className="text-sm font-black tracking-wider uppercase text-emerald-300 block">IRII</span>
                <span className="text-[10px] text-gray-300 font-medium tracking-wide uppercase">Finishing School</span>
              </div>
            </div>

            <div className="relative z-10 my-12 space-y-6">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-emerald-200">
                Curate your own brilliance.
              </h1>
              <p className="text-sm md:text-base text-gray-300 font-medium leading-relaxed max-w-md">
                Experience the next generation of learning management, designed for structural clarity and academic prestige.
              </p>
            </div>

            <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start backdrop-blur-md">
              <div className="bg-[#023d4c]/80 p-2.5 rounded-xl border border-white/10 shrink-0 text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wider uppercase text-white">Secure Access</h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-normal">
                  Multi-layer encryption and passwordless authentication protecting your study history and dashboard access.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel - Credentials and login actions */}
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto space-y-8">
              {/* Header Toggle */}
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-[#023d4c] transition-all duration-300">
                  {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-xs font-medium text-muted-foreground transition-all duration-300">
                  {mode === 'signin'
                    ? 'Please enter your email to access your learning dashboard.'
                    : 'Create a student profile to start structural engineering training.'}
                </p>
              </div>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 p-1 bg-muted rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setMessage('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-[#023d4c] shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setMessage('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-[#023d4c] shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Google OAuth button - Fixed Logo Size (h-5 w-5) */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 border border-border/80 rounded-xl hover:bg-muted/40 hover:border-border transition-all font-bold text-xs text-foreground bg-background shadow-sm hover:shadow-md"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.38c0,-0.68 -0.06,-1.33 -0.17,-2H21.35z" fill="#4285F4" />
                  <path d="M12,20.6c2.32,0 4.27,-0.77 5.7,-2.09l-3.3,-2.58c-0.91,0.61 -2.08,0.97 -3.3,0.97c-2.54,0 -4.69,-1.71 -5.46,-4.02H2.21v2.67C3.63,18.39 7.55,20.6 12,20.6z" fill="#34A853" />
                  <path d="M6.54,12.88c-0.2,-0.6 -0.31,-1.24 -0.31,-1.9s0.11,-1.3 0.31,-1.9V6.41H2.21c-0.78,1.57 -1.21,3.33 -1.21,5.19s0.43,3.62 1.21,5.19L6.54,12.88z" fill="#FBBC05" />
                  <path d="M12,6.5c1.26,0 2.39,0.43 3.28,1.28l2.46,-2.46C16.27,3.94 14.32,3.17 12,3.17c-4.45,0 -8.37,2.21 -9.79,6.01l4.33,3.35c0.77,-2.31 2.92,-4.02 5.46,-4.02z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/80"></div>
                </div>
                <div className="relative bg-white px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Or use institutional email
                </div>
              </div>

              {/* Login Email Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full border border-border/80 rounded-xl px-4 py-3.5 pr-10 text-xs font-semibold bg-muted/20 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#023d4c] focus:border-[#023d4c] transition-all"
                      required
                    />
                    <Mail className="absolute right-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-border text-[#023d4c] focus:ring-[#023d4c]"
                    defaultChecked
                  />
                  <label htmlFor="remember" className="text-[11px] font-semibold text-muted-foreground">
                    Keep me signed in for 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-[#023d4c] text-white font-bold rounded-xl text-xs hover:bg-[#035165] focus:outline-none transition-all shadow-md shadow-[#023d4c]/10 disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  <span>{loading ? 'Sending Verification Link...' : (mode === 'signin' ? 'Access Dashboard' : 'Register Account')}</span>
                  {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>

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

              <div className="text-center pt-2">
                {mode === 'signin' ? (
                  <p className="text-xs text-muted-foreground font-semibold">
                    New to the institute?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-[#023d4c] hover:underline font-bold"
                    >
                      Create an Account
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-semibold">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-[#023d4c] hover:underline font-bold"
                    >
                      Sign In here
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding Area */}
      <footer className="w-full px-6 py-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground font-semibold border-t border-border/40 bg-[#fafbfc] mt-auto">
        <div className="flex items-center gap-2">
          <Compass className="h-4.5 w-4.5 text-[#023d4c]" />
          <span className="text-[#023d4c] font-bold">IRII Finishing School</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</a>
          <a href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</a>
          <a href="/contact" className="hover:text-foreground transition-colors">Contact Us</a>
        </div>
        <div>
          © 2026 IRII Finishing School. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
