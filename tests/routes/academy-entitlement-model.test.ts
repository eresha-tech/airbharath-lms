import { expect, it } from 'vitest';
import { effectiveEnrollment, sourceReason, prospectiveAcademyPolicy, type AccessSource } from '@/lib/academy-entitlements/model';

it('a refunded managed purchase cannot regrant access through its retained aggregate enrollment', () => {
  const row = { status: 'active', expiresAt: null, academySources: [{
    id: 'purchase', ownsEnrollment: true, kind: 'purchase' as const, amountPaise: 10000,
    startsAt: new Date('2026-01-01'), endsAt: null,
    events: [{ kind: 'full_refund', providerId: 'payment', status: 'processed', amountPaise: 10000, observedAt: new Date('2026-02-01') }],
  }] };
  expect(effectiveEnrollment(row, new Date('2026-03-01'))).toMatchObject({ enrollment: null, reason: 'refunded' });
  expect(row.status).toBe('active'); // Preserve the historical row; gate access through its sources.
});

const now = new Date('2026-03-01T00:00:00.000Z');
const source = (overrides: Partial<AccessSource> = {}): AccessSource => ({ id: 'purchase', ownsEnrollment: true, kind: 'purchase', amountPaise: 10000, startsAt: new Date('2026-01-01'), endsAt: null, events: [], ...overrides });
const event = (status: string, observedAt = new Date('2026-02-01')) => ({ kind: 'dispute', providerId: 'disp_one', status, amountPaise: 10000, observedAt });

it('partial processed refunds and non-final disputes do not revoke a purchase', () => {
  for (const events of [[{ kind: 'refund_processed', providerId: 'rfnd_one', status: 'processed', amountPaise: 5000, observedAt: now }], [event('open')], [event('under_review')], [event('closed')]]) {
    expect(effectiveEnrollment({ status: 'active', expiresAt: null, academySources: [source({ events })] }, now).enrollment).not.toBeNull();
  }
});

it('a full lost chargeback blocks only its source; won restores it while a full refund still prevails', () => {
  const purchase = source({ events: [event('lost')] });
  expect(sourceReason(purchase)).toBe('chargeback');
  purchase.events.push(event('won', now));
  expect(sourceReason(purchase)).toBeNull();
  purchase.events.push({ kind: 'full_refund', providerId: 'payment', status: 'processed', amountPaise: 10000, observedAt: now });
  expect(sourceReason(purchase)).toBe('refunded');
});

it('late open observations cannot undo a terminal loss, and partial chargebacks do not remove the purchase', () => {
  expect(sourceReason(source({ events: [event('lost'), event('open', now)] }))).toBe('chargeback');
  expect(sourceReason(source({ events: [{ ...event('lost'), amountPaise: 5000 }] }))).toBeNull();
  expect(sourceReason(source({ events: [event('won'), event('lost')] }))).toBe('chargeback');
  expect(sourceReason(source({ events: [event('lost'), event('won')] }))).toBe('chargeback');
});

it('a second valid purchase or independent Admin grant survives another source refund', () => {
  const refunded = source({ events: [{ kind: 'full_refund', providerId: 'payment', status: 'processed', amountPaise: 10000, observedAt: now }] });
  for (const independent of [source({ id: 'second', ownsEnrollment: false }), source({ id: 'grant', kind: 'admin_grant', amountPaise: 0, ownsEnrollment: false })]) {
    expect(effectiveEnrollment({ status: 'active', expiresAt: null, academySources: [refunded, independent] }, now).enrollment).not.toBeNull();
  }
});

it('unknown historical enrollment stays independent, without assigning it to a refunded purchase', () => {
  const purchase = source({ ownsEnrollment: false, events: [{ kind: 'full_refund', providerId: 'payment', status: 'processed', amountPaise: 10000, observedAt: now }] });
  expect(effectiveEnrollment({ status: 'active', expiresAt: null, academySources: [purchase] }, now).enrollment).not.toBeNull();
  expect(effectiveEnrollment({ status: 'expired', expiresAt: new Date('2025-01-01'), academySources: [purchase] }, now).enrollment).toBeNull();
});

it('a new source can grant access beside an expired legacy row without rewriting its duration', () => {
  const original = new Date('2025-01-01'), endsAt = new Date('2026-04-01');
  const row = { status: 'expired', expiresAt: original, academySources: [source({ ownsEnrollment: false, endsAt })] };
  expect(effectiveEnrollment(row, now).enrollment).toMatchObject({ status: 'active', expiresAt: endsAt });
  expect(row.expiresAt).toBe(original);
  expect(effectiveEnrollment(row, endsAt).enrollment).toBeNull();
});

it('restricted aggregate status is not bypassed by a source', () => {
  expect(effectiveEnrollment({ status: 'blocked', expiresAt: null, academySources: [source()] }, now).enrollment).toBeNull();
});

it('prospective activation requires explicit valid configuration and includes the exact effective instant', () => {
  expect(prospectiveAcademyPolicy({}, now)).toBeNull();
  expect(() => prospectiveAcademyPolicy({ ACADEMY_ENTITLEMENT_POLICY_ENABLED: 'true' }, now)).toThrow();
  const config = { ACADEMY_ENTITLEMENT_POLICY_ENABLED: 'true', ACADEMY_ENTITLEMENT_POLICY_EFFECTIVE_AT: now.toISOString() };
  expect(prospectiveAcademyPolicy(config, new Date(now.getTime() - 1))).toBeNull();
  expect(prospectiveAcademyPolicy(config, now)).toEqual({ version: 'academy-prospective-refund-v1', effectiveAt: '2026-03-01T00:00:00.000Z' });
});
