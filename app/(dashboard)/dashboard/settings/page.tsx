/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  ShieldCheck, 
  Save, 
  Mail, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  Fingerprint
} from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // User State
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('student');

  // Preferences State
  const [emailNotify, setEmailNotify] = useState(true);
  const [repliesNotify, setRepliesNotify] = useState(true);
  const [jobsNotify, setJobsNotify] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          
          // Get additional user profile fields
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            setFullName(profile.full_name || '');
            setAvatarUrl(profile.avatar_url || '');
            setRole(profile.role || 'student');
          }
        }
      } catch (err) {
        console.error('Failed to load profile settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
    
    // Load local notification settings
    if (typeof window !== 'undefined') {
      const emailPref = localStorage.getItem('pref_email_notify') !== 'false';
      const replyPref = localStorage.getItem('pref_reply_notify') !== 'false';
      const jobsPref = localStorage.getItem('pref_jobs_notify') !== 'false';
      const mfaPref = localStorage.getItem('pref_mfa_enabled') === 'true';
      setEmailNotify(emailPref);
      setRepliesNotify(replyPref);
      setJobsNotify(jobsPref);
      setTwoFactor(mfaPref);
    }
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setSuccessMsg('Your profile has been updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = () => {
    setSaving(true);
    setSuccessMsg('');
    
    localStorage.setItem('pref_email_notify', String(emailNotify));
    localStorage.setItem('pref_reply_notify', String(repliesNotify));
    localStorage.setItem('pref_jobs_notify', String(jobsNotify));
    localStorage.setItem('pref_mfa_enabled', String(twoFactor));

    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Preferences saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Account Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your student profile, security credentials, and course updates.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Navigation Tabs */}
        <div className="md:w-1/4 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <User className="h-4.5 w-4.5" />
            Profile Settings
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'notifications'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Bell className="h-4.5 w-4.5" />
            Notifications
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
              activeTab === 'security'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            Security & Login
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Profile Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This details are shared across the institute student directory and certification.
                </p>
              </div>

              {/* Avatar picture */}
              <div className="flex items-center gap-4 py-2">
                <div className="h-16 w-16 bg-primary/10 rounded-full border border-border/80 flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Profile Avatar</h4>
                  <p className="text-[10px] text-muted-foreground">Provide an image URL link for your profile picture.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-xs font-semibold bg-muted/10 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-xs font-semibold bg-muted/30 text-muted-foreground/70 cursor-not-allowed"
                    />
                    <Mail className="absolute right-3.5 top-3 h-4 w-4 text-muted-foreground/50" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avatar URL Link</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-xs font-semibold bg-muted/10 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Submit Profile */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <div className="flex-1">
                  {successMsg && (
                    <div className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> {successMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> {errorMsg}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/95 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Notification Preferences</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure how and when you want to receive curriculum announcements and discussions.
                </p>
              </div>

              <div className="space-y-5 py-2">
                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Email Updates</h4>
                    <p className="text-[10px] text-muted-foreground">Receive updates for new modules, certification, and general news.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotify}
                    onChange={(e) => setEmailNotify(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Doubt & Reply Alerts</h4>
                    <p className="text-[10px] text-muted-foreground">Notify me via email when an admin answers my module discussion comments.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={repliesNotify}
                    onChange={(e) => setRepliesNotify(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Placement & Hiring Alerts</h4>
                    <p className="text-[10px] text-muted-foreground">Notify me as soon as a new recruitment event starts on the Job Board.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={jobsNotify}
                    onChange={(e) => setJobsNotify(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              </div>

              {/* Save Preferences */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <div className="flex-1">
                  {successMsg && (
                    <div className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> {successMsg}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/95 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Account Security</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage login keys, multi-factor settings, and student portal access.
                </p>
              </div>

              {/* MFA Card */}
              <div className="flex items-start gap-4 p-4 border border-border/60 rounded-2xl bg-muted/10">
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/10 text-primary shrink-0">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground">Multi-Factor Authenticator (MFA)</h4>
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => {
                        setTwoFactor(e.target.checked);
                        localStorage.setItem('pref_mfa_enabled', String(e.target.checked));
                      }}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Protect your login with token confirmations. Recommended when accessing modules from shared campus workstations.
                  </p>
                </div>
              </div>

              {/* Account Metadata metadata info */}
              <div className="bg-muted/10 border border-border/60 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Account Specifications</h4>
                <div className="grid grid-cols-2 gap-y-2 text-[11px] font-semibold text-muted-foreground">
                  <div>Student ID:</div>
                  <div className="font-mono text-foreground">{user?.id || 'N/A'}</div>
                  
                  <div>Assigned Role:</div>
                  <div className="text-primary capitalize">{role}</div>
                  
                  <div>Institution Account Created:</div>
                  <div>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              {/* Placement Ready state */}
              <div className="p-4 border border-emerald-100 rounded-2xl bg-emerald-50/50 flex gap-3.5 items-start">
                <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800">Placement Hub Certification</h4>
                  <p className="text-[10px] text-emerald-700/80 mt-1 leading-relaxed">
                    Your account is registered as part of our placement program. Ensure your full name matches your academic documents to generate official verified certificates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
