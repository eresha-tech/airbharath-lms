'use client';
import { WorkspaceInfluencers, type InfluencerRow } from './WorkspaceInfluencers';
import { useRef, useState } from 'react';
import { COUPON_STATUSES, PLAN_CODES, SOURCE_TYPES, formatPaise, parseDecimalUnits, type CouponStatus, type PlanCode } from '@/lib/workspace/membership/model';
import { formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
import type { listWorkspaceCoupons } from '@/lib/workspace/membership/service';
type List = Awaited<ReturnType<typeof listWorkspaceCoupons>>;
type Row = Omit<List['coupons'][number], 'createdAt' | 'updatedAt' | 'startsAt' | 'expiresAt'> & { createdAt: string; updatedAt: string; startsAt: string | null; expiresAt: string | null };
type SerializedList = Omit<List, 'coupons'> & { coupons: Row[] };
const field = 'mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const button = 'rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-50';
export function WorkspaceCoupons({ initial, initialInfluencers }: { initial: SerializedList; initialInfluencers: InfluencerRow[] }) {
  const [influencers, setInfluencers] = useState(initialInfluencers);
  const [sourceType, setSourceType] = useState('internal');
  const [list, setList] = useState(initial), [query, setQuery] = useState(''), [status, setStatus] = useState('all');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [planCodes, setPlanCodes] = useState<PlanCode[]>([...PLAN_CODES]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const command = useRef<{ signature: string; key: string } | null>(null);
  function keyFor(input: unknown) { const signature = JSON.stringify(input); if (!command.current || command.current.signature !== signature) command.current = { signature, key: crypto.randomUUID() }; return command.current.key; }
  async function load(page = 1) {
    const response = await fetch(`/api/admin/workspace/coupons?${new URLSearchParams({ q: query, status, page: String(page) })}`, { cache: 'no-store' });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Coupons could not be loaded.'); setList(data);
  }
  async function refresh(page = 1) { setBusy(true); setNotice(''); try { await load(page); } catch (error) { setNotice(error instanceof Error ? error.message : 'Coupons unavailable.'); } finally { setBusy(false); } }
  async function change(row: Row, next: CouponStatus) {
    setBusy(true); setNotice('');
    const payload = { status: next, expectedVersion: row.version };
    try {
      const response = await fetch(`/api/admin/workspace/coupons/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, requestKey: keyFor({ id: row.id, ...payload }) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Status could not be confirmed.');
      await load(list.page); setNotice(`Coupon ${next}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Status could not be confirmed. Retry the same action or reload.'); } finally { setBusy(false); }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, input = new FormData(form);
    const text = (name: string) => String(input.get(name) || '').trim();
    const date = (name: string) => text(name) ? new Date(`${text(name)}:00+05:30`).toISOString() : null;
    setBusy(true); setNotice('');
    try {
      const influencer = influencers.find(row => row.id === text('influencerId'));
      const definition = { ...(sourceType === 'influencer' ? { influencerId: influencer?.id } : {}), code: text('code'), discountType, discountValue: parseDecimalUnits(text('discount')), usageLimit: text('usageLimit') ? Number(text('usageLimit')) : null,
        startsAt: date('startsAt'), expiresAt: date('expiresAt'), campaignName: text('campaignName'), sourceName: sourceType === 'influencer' ? influencer?.displayName : text('sourceName'), sourceType, planCodes };
      const response = await fetch('/api/admin/workspace/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ definition, requestKey: keyFor(definition) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Creation could not be confirmed.');
      await load(); form.reset(); command.current = null; setNotice('Coupon created. No capacity was consumed or reserved.');
    } catch (error) { setNotice(error instanceof Error && error.name !== 'RangeError' ? error.message : 'Check the dates. Values use IST.'); } finally { setBusy(false); }
  }
  return <div className="ph-no-capture space-y-8"><p role="status" aria-live="polite" className="text-sm">{notice}</p>
    <WorkspaceInfluencers rows={influencers} onChange={setInfluencers} />
    <details className="rounded-xl border border-border bg-card p-6"><summary className="cursor-pointer font-semibold">Create a Workspace coupon</summary><form onSubmit={create} className="mt-6 space-y-5"><div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm">Code<input name="code" required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,31}" autoComplete="off" className={field} /></label>
      <label className="text-sm">Discount type<select value={discountType} onChange={event => setDiscountType(event.target.value as 'fixed' | 'percentage')} className={field}><option value="fixed">Fixed amount (₹)</option><option value="percentage">Percentage (%)</option></select></label>
      <label className="text-sm">{discountType === 'fixed' ? 'Discount in rupees (up to 2 decimals)' : 'Discount percentage (up to 2 decimals)'}<input name="discount" required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" className={field} /><span className="mt-2 block text-xs text-muted-foreground">Must leave a positive paid base on every selected plan.</span></label>
      <label className="text-sm">Usage limit<input name="usageLimit" type="number" min={1} max={2147483647} step={1} className={field} /><span className="mt-2 block text-xs text-muted-foreground">Leave blank for unlimited. Accepted checkout reservations also consume capacity.</span></label>
      <label className="text-sm">Starts at (IST, optional)<input name="startsAt" type="datetime-local" step={60} className={field} /></label><label className="text-sm">Expires at (IST, optional)<input name="expiresAt" type="datetime-local" step={60} className={field} /></label>
      <label className="text-sm">Campaign name<input name="campaignName" required maxLength={120} className={field} /></label>{sourceType === 'influencer' ? <label className="text-sm">Influencer<select name="influencerId" required className={field}><option value="">Select active influencer</option>{influencers.filter(row => row.status === 'active').map(row => <option key={row.id} value={row.id}>{row.displayName}</option>)}</select></label> : <label className="text-sm">Source name<input name="sourceName" required maxLength={120} className={field} /></label>}
      <label className="text-sm">Source type<select name="sourceType" value={sourceType} onChange={e => setSourceType(e.target.value)} className={field}>{SOURCE_TYPES.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
    </div><fieldset><legend className="text-sm font-medium">Applicable plans</legend><div className="mt-3 flex flex-wrap gap-5">{PLAN_CODES.map(code => <label key={code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planCodes.includes(code)} onChange={event => setPlanCodes(event.target.checked ? [...planCodes, code] : planCodes.filter(value => value !== code))} />{code.replaceAll('_', ' ')}</label>)}</div><p className="mt-3 text-xs text-muted-foreground">Select all three for all current Workspace plans. Applicability and economics cannot be edited after creation.</p></fieldset>
      <button disabled={busy || !planCodes.length} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Saving…' : 'Create active coupon'}</button>
    </form></details>
    <form onSubmit={event => { event.preventDefault(); void refresh(); }} className="flex flex-wrap items-end gap-3"><label className="text-sm">Code prefix<input value={query} onChange={event => setQuery(event.target.value)} maxLength={32} className={field} /></label><label className="text-sm">Status<select value={status} onChange={event => setStatus(event.target.value)} className={field}><option value="all">All</option>{COUPON_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label><button disabled={busy} className={button}>Search / filter</button></form>
    {!list.coupons.length && <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">No Workspace coupons match this view.</p>}
    <div className="space-y-4">{list.coupons.map(row => <article key={row.id} className="rounded-xl border border-border bg-card p-6"><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-all font-mono text-lg font-semibold">{row.code}</h2><span className="rounded-full border border-border px-3 py-1 text-xs">{row.status} · v{row.version}</span></header><p className="mt-3 text-sm">{row.discountType === 'fixed' ? formatPaise(row.discountValue) : `${Math.floor(row.discountValue / 100)}.${String(row.discountValue % 100).padStart(2, '0')}%`} off the pre-GST base · {row.planCodes.map(code => code.replaceAll('_', ' ')).join(', ')}</p>
      <details className="mt-4"><summary className="cursor-pointer text-sm underline underline-offset-4">Inspect campaign and validity</summary><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[['Campaign', row.campaignName], ['Source', `${row.sourceType} / ${row.sourceName}`], ['Starts (IST)', row.startsAt ? formatWorkspaceDate(row.startsAt) : 'Immediately'], ['Expires (IST, exclusive)', row.expiresAt ? formatWorkspaceDate(row.expiresAt) : 'No expiry'], ['Usage limit', row.usageLimit ?? 'Unlimited'], ['Created (IST)', formatWorkspaceDate(row.createdAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}<div><dt className="text-xs text-muted-foreground">Financial usage</dt><dd className="mt-1"><CouponFinancialCounts couponId={row.id} /></dd></div></dl></details>
      {row.status !== 'archived' && <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void change(row, row.status === 'active' ? 'paused' : 'active')} className={button}>{row.status === 'active' ? 'Pause' : 'Reactivate'}</button><button disabled={busy} onClick={() => void change(row, 'archived')} className={button}>Archive permanently</button></div>}
    </article>)}</div><nav aria-label="Coupon pages" className="flex items-center gap-4"><button disabled={busy || list.page <= 1} onClick={() => void refresh(list.page - 1)} className={button}>Previous</button><span className="text-sm">Page {list.page}</span><button disabled={busy || !list.hasNext} onClick={() => void refresh(list.page + 1)} className={button}>Next</button></nav>
  </div>;
}

function CouponFinancialCounts({ couponId }: { couponId: string }) {
  const [counts, setCounts] = useState<Record<string, string | null> | null>(null);
  const [mode, setMode] = useState<'live' | 'test'>('live');
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/workspace/coupons/${couponId}/financial?mode=${mode}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Financial counts are unavailable. Retry after migration readiness is confirmed.');
      setCounts(await response.json());
    } catch { setError('Financial counts are unavailable. Retry after migration readiness is confirmed.'); }
    finally { setLoading(false); }
  }
  const money = (value: string | null) => { const n = BigInt(value || '0'); return `₹${(n / BigInt(100)).toLocaleString('en-IN')}.${String(n % BigInt(100)).padStart(2, '0')}`; };
  return <div><label className="block text-sm">Financial mode<select value={mode} onChange={e => { setMode(e.target.value as 'live' | 'test'); setCounts(null); }} disabled={loading} className={field}><option value="live">Live commercial revenue</option><option value="test">Test evidence only</option></select></label><button type="button" disabled={loading} onClick={() => void load()} className="mt-3 underline underline-offset-4 disabled:opacity-50">{loading ? 'Loading…' : counts ? 'Refresh financial report' : 'Load financial report'}</button>
    {error && <p role="status" className="mt-2">{error}</p>}
    {counts && <><p className="mt-3 text-xs">Influencer: {counts.influencerName || 'Historical / unattributed'}. Revenue mode: {counts.providerMode}. Capacity includes all modes and retains refunded uses.</p><dl className="mt-3 grid gap-3 sm:grid-cols-2">{[['releasedReservations', 'Safely released reservations'], ['capturedHeldOrders', 'Held captures (excluded)'], ['reservedCapacity', 'Reserved capacity'], ['consumedPaidCapacity', 'Consumed paid capacity (historical ledger)'], ['remainingSafeCapacity', 'Safely available slots'], ['confirmedPaidOrders', 'Confirmed paid orders'], ['paidMembershipConversions', 'Paid membership conversions'], ['fullyRefundedConversions', 'Fully refunded conversions'], ['netRetainedMembershipConversions', 'Net retained memberships'], ['originalBasePaise', 'Original base'], ['discountPaise', 'Discount granted'], ['originalGstPaise', 'Original GST on sales'], ['grossCapturedPaise', 'Gross captured'], ['confirmedRefundedPaise', 'Confirmed full refunds'], ['netCapturedPaise', 'Net captured after refunds']].map(([key, label]) => <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 tabular-nums">{key.endsWith('Paise') ? money(counts[key]) : counts[key] ?? 'Unlimited'}</dd></div>)}</dl><p className="mt-4 text-xs leading-6 text-muted-foreground">Paid orders require verified capture timing and a redeemed reservation; held orders are excluded. Membership conversions additionally require fulfillment. Refunds require immutable full-refund completion. Net captured revenue is not profit. Historical consumed capacity can include earlier held captures; it is never released by a refund.</p></>}
  </div>;
}
