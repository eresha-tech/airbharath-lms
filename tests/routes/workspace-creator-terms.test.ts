import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
import { CURRENT_CREATOR_TERMS, CREATOR_TERMS_CANONICAL_CONTENT, CREATOR_TERMS_DOCUMENT, creatorTermsHref } from '@/lib/workspace/terms/document';
import { CREATOR_TERMS_DOCUMENT as V1_DOCUMENT, CREATOR_TERMS_CANONICAL_CONTENT as V1_CANONICAL, CURRENT_CREATOR_TERMS as V1_IDENTITY } from '@/lib/workspace/terms/v1';
import { currentCreatorTerms, parseCreatorTermsAcknowledgement, type CreatorTermsAcceptance } from '@/lib/workspace/terms/model';
import { createCreatorTermsService, type CreatorTermsStore } from '@/lib/workspace/terms/service';
import { CreatorTermsAcceptance as Agreement } from '@/components/workspace/CreatorTermsAcceptance';
import TermsPage from '@/app/(user)/workspace/creator-terms/page';
import { financialHarness, financeNow } from './workspace-payments-fixtures';

const etag = () => `"${CURRENT_CREATOR_TERMS.contentHash}"`;
function termsHarness(initial = currentCreatorTerms()) {
  const rows: CreatorTermsAcceptance[] = []; let tail = Promise.resolve();
  const terms = { ...initial };
  const store: CreatorTermsStore = { async accept(userId, current, now) {
    const before = tail; let release!: () => void; tail = new Promise(resolve => { release = resolve; }); await before;
    try {
      const prior = rows.find(row => row.userId === userId && row.termsVersion === current.version);
      if (prior) return prior;
      const row = { id: randomUUID(), userId, termsVersion: current.version, termsContentHash: current.contentHash, acceptedAt: now, createdAt: now }; rows.push(row); return row;
    } finally { release(); }
  } };
  return { rows, terms, service: createCreatorTermsService(store, () => financeNow, () => terms) };
}
describe('versioned Creator Terms content and controls', () => {
  it('preserves V1 and 0018 byte-for-byte while pinning exact V2/current metadata and migration content', () => {
    expect(V1_DOCUMENT.version).toBe('workspace_creator_terms_2026_01');
    expect(V1_IDENTITY.contentHash).toBe('7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac');
    expect(V1_IDENTITY.effectiveAt).toBe('2026-10-12T00:00:00.000Z');
    expect(createHash('sha256').update(V1_CANONICAL).digest('hex')).toBe(V1_IDENTITY.contentHash);
    expect(createHash('sha256').update(readFileSync('lib/workspace/terms/v1.ts')).digest('hex')).toBe('d9aa70389bcdcba3969e8c4cf1eedcb4faad98f249ead70872d5bb65d2685c16');
    const oldSql = readFileSync('drizzle/0018_ambiguous_khan.sql', 'utf8');
    expect(createHash('sha256').update(oldSql).digest('hex')).toBe('f96d3fba6b4234717d40f7325e4d1dea0e4c530175278dd7bfe27979c491ec53');
    expect(oldSql).toContain(`$workspace_terms$${V1_CANONICAL}$workspace_terms$`);
    expect(CREATOR_TERMS_DOCUMENT.version).toBe('workspace_creator_terms_2026_02');
    expect(CURRENT_CREATOR_TERMS.contentHash).toBe('8e0c57baad0ebffb9223635c35f4ec9d490dbe9a3c3d1ee9100c70baa042fca8');
    expect(createHash('sha256').update(CREATOR_TERMS_CANONICAL_CONTENT).digest('hex')).toBe(CURRENT_CREATOR_TERMS.contentHash);
    expect(currentCreatorTerms().effectiveAt).toBe('2026-10-12T06:51:32.000Z');
    const sql = readFileSync('drizzle/0019_workspace_creator_terms_v2.sql', 'utf8');
    expect(sql).toContain(`$workspace_terms$${CREATOR_TERMS_CANONICAL_CONTENT}$workspace_terms$`);
    expect(sql).toContain(CURRENT_CREATOR_TERMS.contentHash); expect(sql).toContain(CURRENT_CREATOR_TERMS.effectiveAt);
    expect(createHash('sha256').update(CREATOR_TERMS_CANONICAL_CONTENT.replace('manual renewal', 'automatic renewal')).digest('hex')).not.toBe(CURRENT_CREATOR_TERMS.contentHash);
    const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
    expect(journal.entries[18].tag).toBe('0018_ambiguous_khan'); expect(journal.entries[19].tag).toBe('0019_workspace_creator_terms_v2');
    expect(sql).not.toMatch(/DELETE|DROP|TRUNCATE|DISABLE TRIGGER|UPDATE workspace_(?:creator_terms_acceptances|membership_orders)/i);
    const updates = sql.match(/UPDATE[^;]+;/g)!;
    expect(updates).toHaveLength(2); for (const update of updates) expect(update).toMatch(/^UPDATE workspace_creator_terms_versions SET is_current = (?:false|true) WHERE terms_version = 'workspace_creator_terms_2026_0[12]';$/);
  });
  it('renders finalized V2 by default and exact link, without draft placeholders or invented business mechanics', async () => {
    const render = async (version?: string) => renderToStaticMarkup(await TermsPage({ searchParams: Promise.resolve({ version }) }));
    const html = await render(); expect(html).toBe(await render(CURRENT_CREATOR_TERMS.version));
    for (const text of [CURRENT_CREATOR_TERMS.version, CURRENT_CREATOR_TERMS.contentHash, 'Effective:', '12 October 2026', 'Eresha Technology Innovators Pvt. Ltd.', 'operating the AirBharath brand', 'West Patel Nagar, New Delhi 110008, India', 'academy@airbharath.in', 'courts of competent jurisdiction in New Delhi, India', 'Creators retain ownership of original content', 'AirBharath Course Review Approved']) expect(html).toContain(text);
    for (const text of ['IMPLEMENTATION PLACEHOLDER', 'Proposed effective date', 'Historical draft', 'awaiting owner/legal approval', 'CIN', 'GSTIN', 'compulsory arbitration', 'exclusive jurisdiction']) expect(html).not.toContain(text);
    for (const text of ['privately display', 'technically deliver', 'airline internal manuals', 'defence information', 'Changes Requested and Resubmission', 'future functionality', 'manual renewal', 'not recurring billing or autopay', '9 November 2026, 00:00 Asia/Kolkata', 'separate Refund Policy', 'not automatic refund forfeiture']) expect(html).toContain(text);
    expect(html).toContain('text-sm leading-7'); expect(html).toContain('px-5'); expect(html).toContain('break-all');
  });
  it('retains V1 historical exact rendering and rejects unknown/prototype versions', async () => {
    const html = renderToStaticMarkup(await TermsPage({ searchParams: Promise.resolve({ version: V1_IDENTITY.version }) }));
    expect(html).toContain('Historical draft'); expect(html).toContain('IMPLEMENTATION PLACEHOLDER');
    expect(html).toContain(V1_IDENTITY.contentHash); expect(html).not.toContain(CURRENT_CREATOR_TERMS.contentHash);
    for (const version of ['unregistered-version', '__proto__', 'constructor', '']) await expect(TermsPage({ searchParams: Promise.resolve({ version }) })).rejects.toThrow('NOT_FOUND');
  });
  it('requires an unchecked explicit agreement and links its exact version without a refund checkbox', () => {
    const html = renderToStaticMarkup(React.createElement(Agreement, { onAccepted: vi.fn() }));
    const checkbox = html.match(/<input[^>]+type="checkbox"[^>]*>/)![0];
    expect(checkbox).not.toContain('checked'); expect(html).toContain(creatorTermsHref().replace('&', '&amp;'));
    expect(html).toContain('Save Creator Terms agreement'); expect(html).toContain('disabled=""'); expect(html).not.toContain('Refund Policy');
  });
  it('shows saved server evidence after reload without prechecking, and never represents V1 as current', () => {
    const receipt = { termsVersion: CURRENT_CREATOR_TERMS.version, termsContentHash: CURRENT_CREATOR_TERMS.contentHash, acceptedAt: financeNow.toISOString() };
    const html = renderToStaticMarkup(React.createElement(Agreement, { onAccepted: vi.fn(), initialAcceptance: receipt }));
    expect(html).toContain('Your Creator Terms agreement has been recorded.');
    expect(html.match(/<input[^>]+type="checkbox"[^>]*>/)![0]).not.toContain('checked');
    const stale = renderToStaticMarkup(React.createElement(Agreement, { onAccepted: vi.fn(), initialAcceptance: { ...receipt, termsVersion: V1_IDENTITY.version, termsContentHash: V1_IDENTITY.contentHash } }));
    expect(stale).not.toContain('Your Creator Terms agreement has been recorded.');
  });
});
describe('durable acceptance service contract', () => {
  it('only permits explicit acknowledgement, not client identity/version/hash/timestamps or changed-command retries', async () => {
    const h = termsHarness(), user = randomUUID();
    for (const command of [{ acknowledged: false }, {}, { acknowledged: 'true' }, { acknowledged: true, userId: user }, { acknowledged: true, termsVersion: 'v2' }, { acknowledged: true, termsContentHash: 'a'.repeat(64) }, { acknowledged: true, acceptedAt: financeNow }, { acknowledged: true, requestKey: randomUUID() }]) {
      expect(parseCreatorTermsAcknowledgement(command)).toBe(false);
      await expect(h.service.accept(user, command, etag())).rejects.toMatchObject({ code: 'validation' });
    }
    expect(h.rows).toHaveLength(0);
    await h.service.accept(user, { acknowledged: true }, etag());
    await expect(h.service.accept(user, { acknowledged: false }, etag())).rejects.toMatchObject({ code: 'validation' });
    expect(h.rows).toHaveLength(1);
  });
  it('same-user concurrent acceptances and retries converge on the original timestamp and server-selected version', async () => {
    const h = termsHarness(), user = randomUUID();
    const results = await Promise.all(Array.from({ length: 8 }, () => h.service.accept(user, { acknowledged: true }, etag())));
    expect(new Set(results.map(row => row.id)).size).toBe(1); expect(h.rows).toHaveLength(1);
    expect(results[0]).toMatchObject({ userId: user, termsVersion: CURRENT_CREATOR_TERMS.version, termsContentHash: CURRENT_CREATOR_TERMS.contentHash, acceptedAt: financeNow });
  });
  it('old V1 tabs cannot accept V2 silently, and V2 acceptance retains historical V1 evidence', async () => {
    const h = termsHarness(V1_IDENTITY), user = randomUUID();
    const oldEtag = `"${V1_IDENTITY.contentHash}"`;
    const v1 = await h.service.accept(user, { acknowledged: true }, oldEtag);
    Object.assign(h.terms, CURRENT_CREATOR_TERMS);
    await expect(h.service.accept(user, { acknowledged: true }, oldEtag)).rejects.toMatchObject({ code: 'terms_changed' });
    const v2 = await h.service.accept(user, { acknowledged: true }, etag());
    expect(h.rows).toHaveLength(2); expect(h.rows[0]).toEqual(v1); expect(v2.termsVersion).toBe('workspace_creator_terms_2026_02');
  });
  it('does not report success for storage failure, forged owner or future acceptance', async () => {
    const bad = createCreatorTermsService({ accept: async () => { throw new Error('synthetic storage failure'); } }, () => financeNow);
    await expect(bad.accept(randomUUID(), { acknowledged: true }, etag())).rejects.toThrow('synthetic storage failure');
    const wrong = createCreatorTermsService({ accept: async (_u, t) => ({ id: randomUUID(), userId: randomUUID(), termsVersion: t.version, termsContentHash: t.contentHash, acceptedAt: financeNow, createdAt: financeNow }) }, () => financeNow);
    await expect(wrong.accept(randomUUID(), { acknowledged: true }, etag())).rejects.toMatchObject({ code: 'unavailable' });
    const future = createCreatorTermsService({ accept: async (userId, t) => ({ id: randomUUID(), userId, termsVersion: t.version, termsContentHash: t.contentHash, acceptedAt: new Date(financeNow.getTime() + 1), createdAt: new Date(financeNow.getTime() + 1) }) }, () => financeNow);
    await expect(future.accept(randomUUID(), { acknowledged: true }, etag())).rejects.toMatchObject({ code: 'unavailable' });
    await expect(termsHarness().service.accept('JWT-claim-not-a-user-id', { acknowledged: true }, etag())).rejects.toMatchObject({ code: 'authentication' });
  });
});
describe('prospective commercial order gate', () => {
  it.each([false, true])('historical V1 cannot satisfy a new V2 order; V2 evidence can (coupon=%s)', async coupon => {
    const h = financialHarness(), i = await h.input(undefined, coupon), v2 = h.termsAcceptances.get(i.userId)!;
    const historical = { ...v2, id: randomUUID(), termsVersion: V1_IDENTITY.version, termsContentHash: V1_IDENTITY.contentHash };
    h.termsAcceptances.set(i.userId, historical);
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: 'terms_required' });
    expect(h.state.orders).toHaveLength(0); expect(h.state.redemptions).toHaveLength(0);
    h.termsAcceptances.set(i.userId, v2);
    const order = await h.service.acceptOrder(i.userId, i.request);
    expect(order).toMatchObject({ creatorTermsVersion: CURRENT_CREATOR_TERMS.version, creatorTermsContentHash: CURRENT_CREATOR_TERMS.contentHash });
    expect(historical.termsVersion).toBe('workspace_creator_terms_2026_01');
  });
  it.each([false, true])('missing or stale acceptance cannot create an order or reserve a coupon (coupon=%s)', async coupon => {
    const h = financialHarness({ acceptTerms: false }), i = await h.input(undefined, coupon);
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: 'terms_required' });
    h.termsAcceptances.set(i.userId, { id: randomUUID(), userId: i.userId, termsVersion: 'workspace_creator_terms_old', termsContentHash: 'c'.repeat(64), acceptedAt: financeNow, createdAt: financeNow });
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: 'terms_required' });
    expect(h.state.orders).toHaveLength(0); expect(h.state.redemptions).toHaveLength(0); expect(h.provider.createOrder).not.toHaveBeenCalled();
  });
  it('current acceptance snapshots immutable governing evidence and reaches the unchanged provider stage', async () => {
    const h = financialHarness(), i = await h.input(), row = h.termsAcceptances.get(i.userId)!;
    const order = await h.service.acceptOrder(i.userId, i.request);
    expect(order).toMatchObject({ creatorTermsAcceptanceId: row.id, creatorTermsVersion: row.termsVersion, creatorTermsContentHash: row.termsContentHash, creatorTermsAcceptedAt: row.acceptedAt });
    await h.service.ensureProviderOrder(i.userId, order.id); expect(h.provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it('current V2 orders recover unchanged across future versions, including historical null snapshots', async () => {
    const h = financialHarness(), i = await h.input(undefined, false), order = await h.service.acceptOrder(i.userId, i.request);
    const snapshot = structuredClone(order);
    h.terms.version = 'workspace_creator_terms_2026_03'; h.terms.contentHash = 'd'.repeat(64);
    expect(await h.service.acceptOrder(i.userId, i.request)).toEqual(snapshot);
    const other = await h.input(undefined, false); h.termsAcceptances.set(other.userId, { ...h.termsAcceptances.get(i.userId)!, userId: other.userId });
    await expect(h.service.acceptOrder(other.userId, other.request)).rejects.toMatchObject({ code: 'terms_required' });
    // Simulate a retained pre-feature order with the nullable additive columns.
    Object.assign(h.state.orders.find(row => row.id === order.id)!, { creatorTermsAcceptanceId: null, creatorTermsVersion: null, creatorTermsContentHash: null, creatorTermsAcceptedAt: null });
    const historical = structuredClone(h.state.orders.find(row => row.id === order.id)!);
    expect(await h.service.acceptOrder(i.userId, i.request)).toEqual(historical); expect(await h.store.readOrder(order.id, i.userId)).toEqual(historical);
  });
  it('acceptance and order creation serialize on the same owner lock without duplicate effects', async () => {
    const h = financialHarness({ acceptTerms: false }), i = await h.input(undefined, false);
    const service = createCreatorTermsService({ accept: (userId, terms, now) => h.store.transaction({ userId }, async () => {
      const old = h.termsAcceptances.get(userId); if (old) return old;
      const row = { id: randomUUID(), userId, termsVersion: terms.version, termsContentHash: terms.contentHash, acceptedAt: now, createdAt: now }; h.termsAcceptances.set(userId, row); return row;
    }) }, () => financeNow);
    // Order-first cannot slip through while acceptance is queued behind its transaction.
    const first = await Promise.allSettled([h.service.acceptOrder(i.userId, i.request), service.accept(i.userId, { acknowledged: true }, etag())]);
    expect(first[0]).toMatchObject({ status: 'rejected', reason: { code: 'terms_required' } }); expect(first[1].status).toBe('fulfilled');
    const orders = await Promise.all([h.service.acceptOrder(i.userId, i.request), h.service.acceptOrder(i.userId, i.request)]);
    expect(orders[0].id).toBe(orders[1].id); expect(h.state.orders).toHaveLength(1); expect(h.termsAcceptances.size).toBe(1);
  });
  it('a current-version transition during the acceptance read cannot fund a stale new order', async () => {
    const h = financialHarness(), i = await h.input(undefined, false), transaction = h.store.transaction.bind(h.store);
    h.store.transaction = (locks, work) => transaction(locks, tx => work({ ...tx, readCreatorTermsAcceptance: async userId => {
      const old = await tx.readCreatorTermsAcceptance(userId, h.terms);
      h.terms.version = 'workspace_creator_terms_2026_03'; h.terms.contentHash = 'e'.repeat(64);
      return old;
    } }));
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: 'terms_required' });
    expect(h.state.orders).toHaveLength(0); expect(h.provider.createOrder).not.toHaveBeenCalled();
  });
});
