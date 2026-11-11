import { CommerceError } from '@/lib/commerce/model';

export const ACADEMY_POLICY = 'academy-prospective-refund-v1' as const;
export type AcademyPolicy = { version: typeof ACADEMY_POLICY; effectiveAt: string };
export type AccessEvent = { kind: string; providerId: string; status: string; amountPaise: number; observedAt: Date };
export type AccessSource = {
  id: string; kind: 'purchase' | 'admin_grant'; ownsEnrollment: boolean; amountPaise: number;
  startsAt: Date; endsAt: Date | null; events: AccessEvent[];
};
export type AccessReason = 'refunded' | 'chargeback' | null;

// Prospective activation is explicit. Never infer a cohort from capture time or a matching old order.
export function prospectiveAcademyPolicy(env: Record<string, string | undefined> = process.env, now = new Date()): AcademyPolicy | null {
  if (env.ACADEMY_ENTITLEMENT_POLICY_ENABLED !== 'true') return null;
  const effectiveAt = env.ACADEMY_ENTITLEMENT_POLICY_EFFECTIVE_AT;
  if (!effectiveAt || !Number.isFinite(Date.parse(effectiveAt)) || new Date(effectiveAt).toISOString() !== effectiveAt) {
    throw new CommerceError(503, 'Academy purchase policy configuration is unavailable.');
  }
  return now < new Date(effectiveAt) ? null : { version: ACADEMY_POLICY, effectiveAt };
}

export function sourceReason(source: AccessSource): AccessReason {
  if (source.events.some(event => event.kind === 'full_refund')) return 'refunded';
  const terminal = new Map<string, AccessEvent>();
  for (const event of source.events) {
    if (event.kind !== 'dispute' || !['lost', 'won'].includes(event.status)) continue;
    const previous = terminal.get(event.providerId);
    if (!previous || event.observedAt > previous.observedAt || (event.observedAt.getTime() === previous.observedAt.getTime() && event.status === 'lost')) terminal.set(event.providerId, event);
  }
  return [...terminal.values()].some(event => event.status === 'lost' && event.amountPaise === source.amountPaise) ? 'chargeback' : null;
}

// ownsEnrollment is true only for a new aggregate row created atomically with its first known source.
// Existing unknown Academy rows remain independent, and prospective purchases never extend their dates.
export function effectiveEnrollment<T extends { status: string; expiresAt: Date | null; academySources?: AccessSource[] }>(row: T | undefined | null, now = new Date()): { enrollment: T | null; reason: AccessReason } {
  if (!row || !['active', 'expired'].includes(row.status)) return { enrollment: null, reason: null };
  const sources = row.academySources ?? [];
  const legacy = !sources.some(source => source.ownsEnrollment) && row.status === 'active' && (!row.expiresAt || row.expiresAt > now);
  const active = sources.filter(source => source.startsAt <= now && (!source.endsAt || source.endsAt > now) && !sourceReason(source));
  if (!legacy && !active.length) return { enrollment: null, reason: sources.map(sourceReason).find(Boolean) ?? null };
  const dates = [...(legacy ? [row.expiresAt] : []), ...active.map(source => source.endsAt)];
  const expiresAt = dates.includes(null) ? null : new Date(Math.max(...dates.map(date => date!.getTime())));
  return { enrollment: { ...row, status: 'active', expiresAt }, reason: null };
}
