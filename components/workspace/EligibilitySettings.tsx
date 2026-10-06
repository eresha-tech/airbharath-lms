'use client';
import { useRef, useState } from 'react';
import { CATEGORIES, BUSINESS_TIMEZONE, type SettingsConfig, type Category } from '@/lib/workspace/eligibility/model';
export function EligibilitySettings({ initial }: { initial: { id: string; version: number; config: SettingsConfig } }) {
  const [settings, setSettings] = useState(initial); const [config, setConfig] = useState(initial.config);
  const [busy, setBusy] = useState(false); const [uncertain, setUncertain] = useState(false); const [message, setMessage] = useState('');
  const pending = useRef<string | null>(null);
  async function publish(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    if (!pending.current) pending.current = JSON.stringify({ expectedSettingsId: settings.id, requestKey: crypto.randomUUID(), config });
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/workspace/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pending.current, signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (response.ok && data.settings?.id) { setSettings(data.settings); setConfig(data.settings.config); pending.current = null; setUncertain(false); setMessage(`Published version ${data.settings.version}. Existing attempts retain their original rules and deadlines.`); }
      else { setMessage(data.error || 'Publication could not be confirmed.'); if ([400, 403, 409].includes(response.status)) { pending.current = null; setUncertain(false); } else setUncertain(true); }
    } catch { setUncertain(true); setMessage('Publication could not be confirmed. Retry the same publication or reload to inspect the current version.'); }
    finally { setBusy(false); }
  }
  const control = 'mt-2 block min-h-12 w-full rounded-lg border bg-background px-3 py-2';
  const localLaunch = new Date(Date.parse(config.launchAt) + 330 * 60000).toISOString().slice(0, 16);
  return <form onSubmit={publish} className="ph-no-capture max-w-3xl space-y-7"><p className="text-sm leading-7 text-muted-foreground">Current version {settings.version}. Publishing creates a new immutable version with an audit record. It affects future attempts only. The adult declaration cannot be disabled.</p>{message && <p role="status" className="rounded-xl border p-4 text-sm leading-6">{message} <a href="/admin/workspace/settings" className="underline">Reload settings</a></p>}
    <fieldset disabled={busy || uncertain} className="space-y-6 disabled:opacity-70"><div className="grid gap-5 sm:grid-cols-3">{(['minimumExperienceMonths', 'eligibilityValidityDays', 'cooldownDays'] as const).map(key => <label key={key} className="text-sm font-semibold">{{ minimumExperienceMonths: 'Minimum experience (months)', eligibilityValidityDays: 'Eligibility validity (days)', cooldownDays: 'Reapplication cooldown (days)' }[key]}<input required type="number" min={1} max={key === 'minimumExperienceMonths' ? 600 : 90} value={config[key]} onChange={e => setConfig({ ...config, [key]: Number(e.target.value) })} className={control} /></label>)}</div>
      <fieldset className="rounded-xl border p-5"><legend className="px-2 font-semibold">Categories open for onboarding</legend><p className="mb-4 text-xs leading-5 text-muted-foreground">At least one category must remain open. Both professional and teaching categories use this list.</p><div className="grid gap-4 sm:grid-cols-2">{CATEGORIES.map(([code, label]) => <label key={code} className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={config.allowedCategories.includes(code)} onChange={e => setConfig({ ...config, allowedCategories: e.target.checked ? [...config.allowedCategories, code] : config.allowedCategories.filter(value => value !== code) as Category[] })} className="mt-1 size-4 accent-primary" />{label}</label>)}</div></fieldset>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={config.profileRequired} onChange={e => setConfig({ ...config, profileRequired: e.target.checked })} className="size-4 accent-primary" />Require a professional HTTPS profile</label>
      <label className="block text-sm font-semibold">Planned launch ({BUSINESS_TIMEZONE})<input type="datetime-local" required value={localLaunch} onChange={e => { if (e.target.value) setConfig({ ...config, launchAt: new Date(`${e.target.value}:00+05:30`).toISOString() }); }} className={control} /><span className="mt-2 block text-xs font-normal text-muted-foreground">Scheduling information only. This does not activate creator tools or payments.</span></label>
    </fieldset><button disabled={busy} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Publishing…' : uncertain ? 'Retry same publication' : 'Publish new settings version'}</button>
  </form>;
}
