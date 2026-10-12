import { createHmac, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { addCalendarMonthsIST, membershipState, membershipTerm, resolveMembershipAccess, WORKSPACE_LAUNCH_AT } from '@/lib/workspace/activation/model';
import { createWorkspaceActivationService, type ActivationStore, type CreatorProfile, type Membership } from '@/lib/workspace/activation/service';
import { callbackSecret, financialHarness, testContext } from './workspace-payments-fixtures';
const hmac = (value: string, secret: string) => createHmac('sha256', secret).update(value).digest('hex');
async function fixture(coupon = true, paidAt?: Date) {
  const finance = financialHarness();
  if (paidAt) { finance.now.value = paidAt; finance.eligibleUntil.value = new Date(paidAt.getTime() + 30 * 86_400_000); }
  const order = await finance.ready(coupon), payment = finance.captured(order);
  await finance.service.confirmPayment(order.userId, order.id, payment.id, hmac(`${order.providerOrderId}|${payment.id}`, callbackSecret), callbackSecret);
  const rows = { profiles: [] as CreatorProfile[], memberships: [] as Membership[] };
  let tail: Promise<unknown> = Promise.resolve(), fail: string | null = null;
  const store: ActivationStore = {
    async transaction(userId, orderId, work) {
      const prior = tail; let release!: () => void; tail = new Promise<void>(r => release = r); await prior;
      const snapshot = structuredClone({ rows, financial: finance.state });
      const owned = finance.state.orders.find(o => o.id === orderId && o.userId === userId);
      try { return await work({
        order: async () => owned || null,
        profile: async () => rows.profiles.find(p => p.userId === userId) || null,
        membership: async () => rows.memberships.find(m => m.membershipOrderId === orderId) || null,
        payment: async () => finance.state.payments.find(p => p.membershipOrderId === orderId && p.winner) || null,
        redemption: async () => finance.state.redemptions.find(r => r.membershipOrderId === orderId) || null,
        otherMemberships: async () => rows.memberships.filter(m => m.userId === userId),
        createProfile: async now => { const p: CreatorProfile = { id: randomUUID(), userId, status: 'enabled', createdAt: now, firstActivatedAt: now }; rows.profiles.push(p); return p; },
        createMembership: async values => { if (fail === 'membership') throw new Error('synthetic activation failure'); const m = { ...values, id: randomUUID() }; rows.memberships.push(m); return m; },
        fulfill: async now => { if (fail === 'order') throw new Error('synthetic activation failure'); Object.assign(owned!, { activationState: 'fulfilled', fulfilledAt: now, version: owned!.version + 1 }); },
        hold: async reason => { Object.assign(owned!, { activationState: 'held_for_review', reviewReason: reason }); },
      }); } catch (error) { Object.assign(rows, snapshot.rows); Object.assign(finance.state, snapshot.financial); throw error; } finally { release(); }
    },
    pending: async (limit, context) => finance.state.orders.filter(o => o.providerAccountId === context.accountId && o.providerMode === context.mode && o.financialState === 'captured' && o.activationState === 'pending_activation' && o.paidAt && o.refundEligibleUntil).slice(0, limit).map(o => ({ id: o.id, userId: o.userId })),
  };
  const service = createWorkspaceActivationService(store, 'test', () => finance.now.value, testContext);
  const fulfill = () => service.fulfill(order.userId, order.id);
  return { finance, order, payment, rows, service, store, fulfill, fail: (value: string | null) => { fail = value; } };
}
describe('Workspace Kolkata calendar terms', () => {
  it.each([3, 6, 12])('uses %i calendar months from canonical launch for prelaunch payment', months => {
    const term = membershipTerm(new Date('2026-10-06T12:00Z'), months);
    expect(term.startsAt.toISOString()).toBe(WORKSPACE_LAUNCH_AT);
    expect(term.endsAt).toEqual(addCalendarMonthsIST(new Date(WORKSPACE_LAUNCH_AT), months));
  });
  it.each([
    ['2026-11-30T19:45:23.456Z', 3, '2027-02-28T19:45:23.456Z'], // IST December 1 → March 1, not UTC November 30.
    ['2026-11-30T12:45:23.456Z', 3, '2027-02-28T12:45:23.456Z'],
    ['2027-11-30T12:45:23.456Z', 3, '2028-02-29T12:45:23.456Z'],
    ['2028-02-29T12:00:00.123Z', 12, '2029-02-28T12:00:00.123Z'],
    ['2026-08-31T12:00:00.999Z', 6, '2027-02-28T12:00:00.999Z'],
  ])('clamps the IST civil month while retaining time/milliseconds: %s', (start, months, end) => {
    expect(addCalendarMonthsIST(new Date(start), months).toISOString()).toBe(end);
  });
  it.each([-1, 0, 1])('resolves capture %i millisecond from launch exactly', offset => { const paidAt = new Date(Date.parse(WORKSPACE_LAUNCH_AT) + offset); expect(membershipTerm(paidAt, 3).startsAt.getTime()).toBe(Math.max(paidAt.getTime(), Date.parse(WORKSPACE_LAUNCH_AT))); });
  it('uses capture time at/after launch, with exclusive expiry and exact launch boundary', () => {
    for (const at of [WORKSPACE_LAUNCH_AT, '2026-11-09T06:01:02.003Z']) {
      const term = membershipTerm(new Date(at), 3); expect(term.startsAt.toISOString()).toBe(at);
      expect(membershipState(term.startsAt, term.endsAt, new Date(term.startsAt.getTime() - 1))).toBe('early_access');
      expect(membershipState(term.startsAt, term.endsAt, term.startsAt)).toBe('active');
      expect(membershipState(term.startsAt, term.endsAt, new Date(term.endsAt.getTime() - 1))).toBe('active');
      expect(membershipState(term.startsAt, term.endsAt, term.endsAt)).toBe('expired');
    }
  });
  it('rejects day-based or invalid durations', () => { expect(() => addCalendarMonthsIST(new Date(), 90)).toThrow(); expect(() => addCalendarMonthsIST(new Date('invalid'), 3)).toThrow(); });
});
describe('safe fulfillment, separate financial commit, and recovery', () => {
  it('atomically creates one profile/term/fulfillment marker and tolerates simultaneous retries', async () => {
    const h = await fixture(); const results = await Promise.all([h.fulfill(), h.fulfill(), h.fulfill()]);
    expect(results.map(r => r.state)).toEqual(['fulfilled', 'already_fulfilled', 'already_fulfilled']);
    expect(h.rows.profiles).toHaveLength(1); expect(h.rows.memberships).toHaveLength(1);
    expect(h.order.activationState).toBe('fulfilled'); expect(h.order.fulfilledAt).toEqual(h.finance.now.value);
    expect(h.rows.memberships[0]).toMatchObject({ paidAt: h.order.paidAt, planVersionId: h.order.planVersionId, creatorProfileId: h.rows.profiles[0].id });
    h.finance.now.value = new Date('2026-12-20'); await h.fulfill(); expect(h.rows.memberships[0].startsAt.toISOString()).toBe(WORKSPACE_LAUNCH_AT);
  });
  it.each(['membership', 'order'])('rolls activation back at %s without changing captured truth or coupon redemption; independent retry succeeds', async step => {
    const h = await fixture(); h.fail(step); await expect(h.fulfill()).rejects.toThrow();
    expect(h.rows.profiles).toHaveLength(0); expect(h.rows.memberships).toHaveLength(0);
    expect(h.finance.state.orders[0]).toMatchObject({ financialState: 'captured', activationState: 'pending_activation', paidAt: h.payment.capturedAt, winningPaymentId: h.payment.id });
    expect(h.finance.state.redemptions[0].status).toBe('redeemed'); h.fail(null);
    expect(await h.service.runBatch()).toMatchObject({ fulfilled: 1, failed: 0 });
  });
  it('late fulfillment never resets a post-launch paid term', async () => { const paidAt = new Date('2026-11-10T06:01:02.003Z'); const h = await fixture(false, paidAt); h.finance.now.value = new Date('2026-12-20'); await h.fulfill(); expect(h.rows.memberships[0].startsAt).toEqual(paidAt); expect(h.rows.memberships[0].endsAt).toEqual(addCalendarMonthsIST(paidAt, 3)); });
  it('reuses an enabled identity without overwriting its history', async () => {
    const h = await fixture(); const profile: CreatorProfile = { id: randomUUID(), userId: h.order.userId, status: 'enabled', createdAt: new Date('2025-01-01'), firstActivatedAt: new Date('2025-01-01') }; h.rows.profiles.push(profile);
    await h.fulfill(); expect(h.rows.profiles).toEqual([profile]); expect(h.rows.memberships[0].creatorProfileId).toBe(profile.id);
  });
  it.each(['suspended', 'terminated'] as const)('holds %s identities without re-enabling or creating a term', async status => {
    const h = await fixture(); h.rows.profiles.push({ id: randomUUID(), userId: h.order.userId, status, createdAt: new Date('2025-01-01'), firstActivatedAt: new Date('2025-01-01') });
    expect((await h.fulfill()).state).toBe('held_for_review'); expect(h.order.reviewReason).toBe(`creator_${status}`); expect(h.rows.profiles[0].status).toBe(status); expect(h.rows.memberships).toHaveLength(0);
  });
  it('rejects wrong owner and production/unknown environment with no mutations', async () => {
    const h = await fixture(); await expect(h.service.fulfill(randomUUID(), h.order.id)).rejects.toThrow('activation_not_found');
    for (const environment of ['production', undefined]) await expect(createWorkspaceActivationService(h.store, environment).fulfill(h.order.userId, h.order.id)).rejects.toThrow('activation_environment_disabled');
    expect(h.rows.profiles).toHaveLength(0);
  });
  it.each(['unpaid', 'held_for_review', 'unknown_capture', 'deadline', 'winner', 'owner', 'account', 'provider_order', 'mode', 'amount', 'currency', 'refunded', 'coupon', 'start_rule', 'launch', 'duration', 'future_capture'])('fails closed on %s', async scenario => {
    const h = await fixture(); const storedPayment = h.finance.state.payments[0];
    switch (scenario) {
      case 'unpaid': h.order.financialState = 'unpaid'; break;
      case 'held_for_review': h.order.activationState = 'held_for_review'; h.order.reviewReason = 'capture_time_unverified'; break;
      case 'unknown_capture': h.order.paidAt = null; h.order.refundEligibleUntil = null; break;
      case 'deadline': h.order.refundEligibleUntil = new Date(); break;
      case 'winner': storedPayment.winner = false; break;
      case 'owner': storedPayment.userId = randomUUID(); break;
      case 'account': storedPayment.providerAccountId = 'other'; break;
      case 'provider_order': storedPayment.providerOrderId = 'order_WRONG15B'; break;
      case 'mode': h.order.providerMode = 'live'; break;
      case 'amount': storedPayment.amountPaise++; break;
      case 'currency': storedPayment.currency = 'USD'; break;
      case 'refunded': storedPayment.refundedPaise = 1; break;
      case 'coupon': h.finance.state.redemptions[0].status = 'reserved'; break;
      case 'start_rule': h.order.membershipStartRuleVersion = 'forged'; break;
      case 'launch': h.order.launchAt = new Date('2027-01-01'); break;
      case 'duration': h.order.durationMonths = 90; break;
      case 'future_capture': h.order.paidAt = new Date('2027-01-01'); break;
    }
    if (scenario === 'mode') await expect(h.fulfill()).rejects.toThrow('activation_provider_context_mismatch');
    else expect((await h.fulfill()).state).not.toBe('fulfilled'); expect(h.rows.profiles).toHaveLength(0); expect(h.rows.memberships).toHaveLength(0);
  });
  it('rejects a second nonexpired/overlapping initial membership under the owner lock', async () => {
    const h = await fixture(); await h.fulfill();
    const original = h.finance.state.orders[0]; const second = { ...original, id: randomUUID(), fulfilledAt: null, activationState: 'pending_activation' as const };
    h.finance.state.orders.push(second); h.finance.state.payments.push({ ...h.finance.state.payments[0], id: randomUUID(), membershipOrderId: second.id });
    h.finance.state.redemptions.push({ ...h.finance.state.redemptions[0], id: randomUUID(), membershipOrderId: second.id });
    expect((await h.service.fulfill(second.userId, second.id)).state).toBe('held_for_review'); expect(second.reviewReason).toBe('membership_overlap'); expect(h.rows.memberships).toHaveLength(1);
  });
  it('keeps fulfilled history and access on a refund observation until full-refund confirmation', async () => {
    const h = await fixture(); await h.fulfill(); const term = structuredClone(h.rows.memberships[0]);
    await h.finance.service.reconcileOrder(h.order.userId, h.order.id); expect(h.order.activationState).toBe('fulfilled');
    h.payment.refundedPaise = 1; await h.finance.service.reconcileOrder(h.order.userId, h.order.id);
    // Blocker B: a partial observation is not authoritative full-refund completion.
    expect(h.order.activationState).toBe('fulfilled'); expect(h.rows.memberships[0]).toEqual(term);
  });
  it('requires explicit provider scope and never activates another account', async () => {
    const h = await fixture(); const foreign = { ...testContext, accountId: 'acc_OTHER_SYNTHETIC' };
    expect(await createWorkspaceActivationService(h.store, 'test', () => h.finance.now.value, foreign).runBatch()).toEqual({ attempted: 0, fulfilled: 0, held: 0, failed: 0 });
    await expect(createWorkspaceActivationService(h.store, 'test').runBatch()).rejects.toThrow('activation_provider_context_required');
    await expect(createWorkspaceActivationService(h.store, 'test', () => h.finance.now.value, foreign).fulfill(h.order.userId, h.order.id)).rejects.toThrow('activation_provider_context_mismatch');
    expect(h.rows.profiles).toHaveLength(0); expect(h.rows.memberships).toHaveLength(0);
  });
  it('bounds recovery and isolates failures without a browser or provider call', async () => {
    const h = await fixture(); h.fail('membership'); expect(await h.service.runBatch(1)).toEqual({ attempted: 1, fulfilled: 0, held: 0, failed: 1 });
    h.fail(null); expect((await h.service.runBatch()).fulfilled).toBe(1); expect((await h.service.runBatch()).attempted).toBe(0);
    for (const limit of [0, 26, 1.5]) await expect(h.service.runBatch(limit)).rejects.toThrow('activation_invalid_limit');
  });
});
describe('persisted capability derivation', () => {
  it('grants immediate early access, transitions at start, expires at end and retains identity', async () => {
    const h = await fixture(); await h.fulfill(); const membership = h.rows.memberships[0];
    const evidence = { profileStatus: h.rows.profiles[0].status, activationState: h.order.activationState, providerMode: h.order.providerMode, commercialPolicyVersion: h.order.commercialPolicyVersion, membership };
    expect(resolveMembershipAccess(evidence, h.finance.now.value, 'test')).toEqual({ state: 'early_access', hasCreatorAccess: true, hasPaidEntitlement: true });
    expect(resolveMembershipAccess(evidence, membership.startsAt, 'test')).toEqual({ state: 'active', hasCreatorAccess: true, hasPaidEntitlement: true });
    expect(resolveMembershipAccess(evidence, membership.endsAt, 'test')).toEqual({ state: 'expired', hasCreatorAccess: false, hasPaidEntitlement: false });
    expect(h.rows.profiles[0].status).toBe('enabled');
    for (const status of ['suspended', 'terminated'] as const) expect(resolveMembershipAccess({ ...evidence, profileStatus: status }, membership.startsAt, 'test').hasCreatorAccess).toBe(false);
    for (const state of ['pending_activation', 'held_for_review'] as const) expect(resolveMembershipAccess({ ...evidence, activationState: state }, membership.startsAt, 'test').hasCreatorAccess).toBe(false);
    expect(resolveMembershipAccess(evidence, h.finance.now.value, 'production').hasCreatorAccess).toBe(false);
    expect(resolveMembershipAccess(evidence, h.finance.now.value, undefined).hasCreatorAccess).toBe(false);
    expect(resolveMembershipAccess(null, h.finance.now.value, 'test').hasCreatorAccess).toBe(false);
  });
});
