'use client';
import { useRef, useState } from 'react';
export type InfluencerRow = { id: string; displayName: string; description: string | null; status: 'active' | 'inactive'; version: number };
const field = 'mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm';
export function WorkspaceInfluencers({ rows, onChange }: { rows: InfluencerRow[]; onChange: (rows: InfluencerRow[]) => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const key = useRef<{ signature: string; id: string } | null>(null);
  async function save(definition: Omit<InfluencerRow, 'id' | 'version'>, row?: InfluencerRow) {
    setBusy(true); setMessage('');
    const signature = JSON.stringify(definition);
    if (!key.current || key.current.signature !== signature) key.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await fetch('/api/admin/workspace/influencers', { method: row ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row?.id || key.current.id, definition, ...(row ? { expectedVersion: row.version } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Influencer could not be saved.');
      const refreshed = await fetch('/api/admin/workspace/influencers', { cache: 'no-store' });
      if (!refreshed.ok) throw new Error('Saved. Reload to refresh influencer records.');
      onChange((await refreshed.json()).influencers); key.current = null; setMessage('Influencer saved. Existing attributed purchases retain their original identity.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Influencers unavailable.'); } finally { setBusy(false); }
  }
  return <section className="ph-no-capture rounded-xl border border-border bg-card p-6"><h2 className="font-outfit text-xl font-semibold">Influencer directory</h2><p className="mt-2 text-sm text-muted-foreground">Internal attribution only. Inactive campaigns cannot accept new discounts.</p><p role="status" aria-live="polite" className="mt-3 text-sm">{message}</p>
    <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Create influencer</summary><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void save({ displayName: String(data.get('name')), description: String(data.get('description') || '').trim() || null, status: 'active' }); }}><label className="text-sm">Display name<input name="name" required maxLength={120} className={field} /></label><label className="text-sm">Internal campaign description (optional)<input name="description" maxLength={500} className={field} /></label><button disabled={busy} className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Create influencer</button></form></details>
    <div className="mt-5 space-y-3">{rows.map(row => <details key={`${row.id}-${row.version}`} className="border-t border-border pt-3"><summary className="cursor-pointer text-sm">{row.displayName} · {row.status}</summary><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void save({ displayName: String(data.get('name')), description: String(data.get('description') || '').trim() || null, status: data.get('status') as InfluencerRow['status'] }, row); }}><label className="text-sm">Display name<input name="name" required maxLength={120} defaultValue={row.displayName} className={field} /></label><label className="text-sm">Internal description<input name="description" maxLength={500} defaultValue={row.description || ''} className={field} /></label><label className="text-sm">Status<select name="status" defaultValue={row.status} className={field}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button disabled={busy} className="self-end justify-self-start rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">Save influencer</button></form></details>)}</div>
  </section>;
}
