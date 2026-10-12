import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
import { CURRENT_CREATOR_TERMS, CREATOR_TERMS_CANONICAL_CONTENT, CREATOR_TERMS_DOCUMENT, creatorTermsHref } from '@/lib/workspace/terms/document';
import { currentCreatorTerms, parseCreatorTermsAcknowledgement, type CreatorTermsAcceptance } from '@/lib/workspace/terms/model';
import { createCreatorTermsService, type CreatorTermsStore } from '@/lib/workspace/terms/service';
import { CreatorTermsAcceptance as Agreement } from '@/components/workspace/CreatorTermsAcceptance';
import TermsPage from '@/app/(user)/workspace/creator-terms/page';
import { financialHarness, financeNow } from './workspace-payments-fixtures';

const etag = () => `"${CURRENT_CREATOR_TERMS.contentHash}"`;
function termsHarness() {
  const rows: CreatorTermsAcceptance[] = []; let tail = Promise.resolve();
  const terms = { ...currentCreatorTerms() };
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
  it('pins exact V1 metadata and hash across canonical text and generated migration', () => {
    expect(CREATOR_TERMS_DOCUMENT.version).toBe('workspace_creator_terms_2026_01');
    expect(CURRENT_CREATOR_TERMS.contentHash).toBe('7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac');
    expect(createHash('sha256').update(CREATOR_TERMS_CANONICAL_CONTENT).digest('hex')).toBe(CURRENT_CREATOR_TERMS.contentHash);
    expect(currentCreatorTerms().effectiveAt).toBe(CREATOR_TERMS_DOCUMENT.effectiveAt);
    const sql = readFileSync('drizzle/0018_ambiguous_khan.sql', 'utf8');
    expect(sql).toContain(`$workspace_terms$${CREATOR_TERMS_CANONICAL_CONTENT}$workspace_terms$`);
    expect(sql).toContain(CURRENT_CREATOR_TERMS.contentHash);
    expect(createHash('sha256').update(CREATOR_TERMS_CANONICAL_CONTENT.replace('manual renewal', 'automatic renewal')).digest('hex')).not.toBe(CURRENT_CREATOR_TERMS.contentHash);
  });
  it('renders the exact public version and refuses unknown version links', async () => {
    const html = renderToStaticMarkup(await TermsPage({ searchParams: Promise.resolve({ version: CURRENT_CREATOR_TERMS.version }) }));
    expect(html).toContain(CURRENT_CREATOR_TERMS.version); expect(html).toContain(CURRENT_CREATOR_TERMS.contentHash);
    expect(html).toContain('Draft awaiting owner/legal approval'); expect(html).toContain('Eresha Technology Innovators Pvt. Ltd.');
    expect(html).toContain('AirBharath Course Review Approved'); expect(html).toContain('IMPLEMENTATION PLACEHOLDER');
    await expect(TermsPage({ searchParams: Promise.resolve({ version: 'unregistered-version' }) })).rejects.toThrow('NOT_FOUND');
  });
  it('requires an unchecked explicit agreement and links its exact version without a refund checkbox', () => {
    const html = renderToStaticMarkup(React.createElement(Agreement, { onAccepted: vi.fn() }));
    const checkbox = html.match(/<input[^>]+type="checkbox"[^>]*>/)![0];
    expect(checkbox).not.toContain('checked'); expect(html).toContain(creatorTermsHref().replace('&', '&amp;'));
    expect(html).toContain('Save Creator Terms agreement'); expect(html).toContain('disabled=""'); expect(html).not.toContain('Refund Policy');
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
  it('old tabs cannot accept new text silently, and V2 acceptance retains V1 evidence', async () => {
    const h = termsHarness(), user = randomUUID();
    const v1 = await h.service.accept(user, { acknowledged: true }, etag());
    h.terms.version = 'workspace_creator_terms_2026_02'; h.terms.contentHash = 'b'.repeat(64);
    await expect(h.service.accept(user, { acknowledged: true }, etag())).rejects.toMatchObject({ code: 'terms_changed' });
    await h.service.accept(user, { acknowledged: true }, `"${h.terms.contentHash}"`);
    expect(h.rows).toHaveLength(2); expect(h.rows[0]).toEqual(v1);
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
  it('V1 cannot satisfy simulated V2 new order; already-created/historical orders recover unchanged', async () => {
    const h = financialHarness(), i = await h.input(undefined, false), order = await h.service.acceptOrder(i.userId, i.request);
    const snapshot = structuredClone(order);
    h.terms.version = 'workspace_creator_terms_2026_02'; h.terms.contentHash = 'd'.repeat(64);
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
      h.terms.version = 'workspace_creator_terms_2026_02'; h.terms.contentHash = 'e'.repeat(64);
      return old;
    } }));
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: 'terms_required' });
    expect(h.state.orders).toHaveLength(0); expect(h.provider.createOrder).not.toHaveBeenCalled();
  });
});
