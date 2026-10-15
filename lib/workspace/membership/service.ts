import { normalizeEmail } from '../email/model';
import { createHash } from 'node:crypto';
import { and, asc, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceMembershipPlans as plans, workspaceCoupons as coupons, workspaceCouponPlans as applicability, workspaceInfluencers as influencers, workspaceCouponRedemptions as redemptions, workspaceAuditEvents as audits, workspaceEligibilityAttempts as attempts, workspaceEligibilitySettings as settings, workspacePolicyVersions as policies } from '@/lib/db/schema';
import { resolveJourney, UUID, validateSettings, EVALUATOR_VERSION, ELIGIBILITY_POLICY_VERSION } from '../eligibility/model';
import { calculatePrice, couponFailure, membershipStartInfo, PLAN_CODES, QUOTE_VERSION, validPlan, validateCouponDefinition, parseQuoteInput, isBoundedInteger, COUPON_STATUSES, type CouponDefinition, type CouponStatus, type QuoteInput } from './model';

export class MembershipError extends Error {
  constructor(public code: 'authentication' | 'forbidden' | 'eligibility_required' | 'stale_plan' | 'plan_unavailable' | 'validation' | 'conflict' | 'unavailable' | import('./model').CouponError, public destination?: string) { super(code); }
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function getCurrentPlans() {
  const current = await db.query.workspaceMembershipPlans.findMany({ where: eq(plans.isCurrent, true) });
  if (current.length !== 3 || current.some(plan => !validPlan(plan))) throw new MembershipError('unavailable');
  return PLAN_CODES.map(code => { const plan = current.find(plan => plan.code === code); if (!plan) throw new MembershipError('unavailable'); return plan; });
}
export async function getWorkspaceMembershipQuote(userId: string, input: QuoteInput, clock = () => new Date()) {
  if (!UUID.test(userId)) throw new MembershipError('authentication');
  const normalized = parseQuoteInput(input);
  if (!normalized) throw new MembershipError('validation');
  input = normalized;
  // One read-only snapshot; preview never writes an order, hold, use counter or entitlement.
  return db.transaction(async tx => {
    return (await readMembershipQuote(tx, userId, input, clock)).quote;
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}
// Reuse the same economics/hash inside accepted-order transactions after financial locks.
export async function readMembershipQuote(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string, input: QuoteInput, clock = () => new Date()) {
  const user = await tx.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true, email: true } });
  if (!user) throw new MembershipError('authentication');
  const attempt = await tx.query.workspaceEligibilityAttempts.findFirst({ where: eq(attempts.userId, userId), orderBy: [desc(attempts.decidedAt), desc(attempts.id)] });
  const [plan, currentSettings, policy, coupon] = await Promise.all([
    tx.query.workspaceMembershipPlans.findFirst({ where: and(eq(plans.code, input.planCode), eq(plans.isCurrent, true)) }),
    tx.query.workspaceEligibilitySettings.findFirst({ where: eq(settings.isCurrent, true) }),
    tx.query.workspacePolicyVersions.findFirst({ where: eq(policies.isCurrent, true) }),
    input.couponCode ? tx.query.workspaceCoupons.findFirst({ where: and(eq(coupons.scope, 'workspace_membership'), eq(coupons.code, input.couponCode)) }) : Promise.resolve(undefined),
  ]);
  const couponPlans = coupon ? await tx.query.workspaceCouponPlans.findMany({ where: eq(applicability.couponId, coupon.id) }) : [];
  const now = clock();
  const journey = resolveJourney(true, attempt || null, now);
  if (journey.state !== 'eligibility_active') throw new MembershipError('eligibility_required', journey.destination);
  if (!plan || plan.id !== input.planVersionId) throw new MembershipError('stale_plan');
  if (!validPlan(plan) || !currentSettings || !policy || !validateSettings(currentSettings.config) || currentSettings.evaluatorVersion !== EVALUATOR_VERSION || policy.version !== ELIGIBILITY_POLICY_VERSION) throw new MembershipError('unavailable');
  if (!plan.available) throw new MembershipError('plan_unavailable');
  if (input.couponCode) {
    const failure = couponFailure(coupon ? { ...coupon, planCodes: couponPlans.map(row => row.planCode) } : null, plan, now);
    if (failure) throw new MembershipError(failure);
    if (coupon!.influencerId) {
      const influencer = await tx.query.workspaceInfluencers.findFirst({ where: eq(influencers.id, coupon!.influencerId) });
      if (influencer?.status !== 'active') throw new MembershipError('paused');
    }
    const use = await tx.query.workspaceCouponRedemptions.findFirst({ where: and(eq(redemptions.couponId, coupon!.id), eq(redemptions.userId, userId), inArray(redemptions.status, ['reserved', 'redeemed'])) });
    if (use) throw new MembershipError('coupon_used');
    if (coupon!.usageLimit !== null) {
      const [occupied] = await tx.select({ n: count() }).from(redemptions).where(and(eq(redemptions.couponId, coupon!.id), inArray(redemptions.status, ['reserved', 'redeemed'])));
      if (occupied.n >= coupon!.usageLimit) throw new MembershipError('capacity');
    }
  }
  const amounts = calculatePrice(plan.basePricePaise, plan.taxRateBps, coupon);
  const expiry = Math.min(now.getTime() + 10 * 60_000, attempt!.eligibleUntil!.getTime(), coupon?.expiresAt?.getTime() ?? Infinity);
  const quote = { quoteVersion: QUOTE_VERSION, planCode: plan.code, planVersionId: plan.id, planVersion: plan.version, planName: plan.displayName, durationMonths: plan.durationMonths, currency: plan.currency,
    ...amounts, couponApplied: !!coupon, couponCode: coupon?.code || null, generatedAt: now.toISOString(), expiresAt: new Date(expiry).toISOString(),
    membershipStart: membershipStartInfo(currentSettings.config.launchAt, now), advisory: true as const, reserved: false as const };
  // Bound economics, offer/version, qualification and applicable start/policy versions without exposing IDs in analytics.
  const { generatedAt: _generatedAt, expiresAt: _expiresAt, ...economics } = quote;
  const result = { ...quote, quoteHash: hash({ emailContact: normalizeEmail(user.email), quote: economics, couponId: coupon?.id, couponVersion: coupon?.version, settingsId: currentSettings.id, settingsHash: currentSettings.configurationHash, policyId: policy.id, policyHash: policy.contentHash, eligibilityAttemptId: attempt!.id, acceptedPolicyId: attempt!.policyId, eligibilityValidUntil: attempt!.eligibleUntil }) };
  return { quote: result, context: { contactEmail: normalizeEmail(user.email), attempt: attempt!, plan, currentSettings, policy, coupon } };
}
export type MembershipQuoteContext = Awaited<ReturnType<typeof readMembershipQuote>>;
export type MembershipQuote = Awaited<ReturnType<typeof getWorkspaceMembershipQuote>>;
export async function listWorkspaceCoupons(query = '', status = 'all', page = 1, size = 20, sort: 'newest'|'oldest'|'name' = 'newest', actorId?: string) {
  if (!Number.isInteger(page)||page<1||page>500||![20,25,50].includes(size)||!['newest','oldest','name'].includes(sort)||query.length>32||(status!=='all'&&!(COUPON_STATUSES as readonly string[]).includes(status))) throw new MembershipError('validation');
  async function read(reader: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
    const rows = await reader.query.workspaceCoupons.findMany({ where: and(eq(coupons.scope, 'workspace_membership'), query ? ilike(coupons.code, `${query.replace(/[\\%_]/g,'\\$&')}%`) : undefined, status === 'all' ? undefined : eq(coupons.status, status as CouponStatus)), orderBy: sort==='name'?[asc(coupons.code),asc(coupons.id)]:sort==='oldest'?[asc(coupons.createdAt),asc(coupons.id)]:[desc(coupons.createdAt),desc(coupons.id)], limit: size+1, offset: (page - 1) * size });
    const shown=rows.slice(0,size);
    const links = shown.length ? await reader.query.workspaceCouponPlans.findMany({ where: inArray(applicability.couponId, shown.map(row => row.id)) }) : [];
    return { coupons: shown.map(row => ({ ...row, planCodes: links.filter(link => link.couponId === row.id).map(link => link.planCode) })), hasNext: rows.length > size, page };
  }
  return actorId ? db.transaction(async tx=>{await lockAdmin(tx,actorId);return read(tx);}) : read(db);
}
async function lockAdmin(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], actorId: string) {
  const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
  if (actor?.role !== 'admin') throw new MembershipError('forbidden');
}
export async function createWorkspaceCoupon(actorId: string, definition: CouponDefinition, requestKey: string) {
  const validated = validateCouponDefinition(definition);
  if (!validated || !UUID.test(requestKey)) throw new MembershipError('validation');
  const payloadHash = hash({ action: 'coupon_created', definition: validated });
  try {
    return await db.transaction(async tx => {
      await lockAdmin(tx, actorId);
      const prior = await tx.query.workspaceAuditEvents.findFirst({ where: and(eq(audits.actorId, actorId), eq(audits.requestKey, requestKey)) });
      if (prior) {
        if (prior.action !== 'coupon_created' || prior.payloadHash !== payloadHash || !prior.couponId) throw new MembershipError('conflict');
        return await tx.query.workspaceCoupons.findFirst({ where: eq(coupons.id, prior.couponId) });
      }
      if (validated.influencerId) {
        const [influencer] = await tx.select().from(influencers).where(eq(influencers.id, validated.influencerId)).for('share');
        if (influencer?.status !== 'active') throw new MembershipError('validation');
      } else if (validated.sourceType === 'influencer') throw new MembershipError('validation');
      const current = await tx.select().from(plans).where(and(eq(plans.isCurrent, true), inArray(plans.code, validated.planCodes))).for('share');
      if (current.length !== validated.planCodes.length || current.some(plan => !validPlan(plan))) throw new MembershipError('unavailable');
      try { for (const plan of current) calculatePrice(plan.basePricePaise, plan.taxRateBps, validated); } catch { throw new MembershipError('discount_invalid'); }
      const { planCodes, startsAt, expiresAt, ...fields } = validated;
      const [coupon] = await tx.insert(coupons).values({ ...fields, startsAt: startsAt ? new Date(startsAt) : null, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: actorId }).returning();
      await tx.insert(applicability).values(planCodes.map(planCode => ({ couponId: coupon.id, planCode })));
      await tx.insert(audits).values({ actorId, couponId: coupon.id, action: 'coupon_created', afterStatus: 'active', requestKey, payloadHash });
      return coupon;
    });
  } catch (error) {
    const cause = error as { code?: string; cause?: { code?: string } };
    if (cause.code === '23505' || cause.cause?.code === '23505') throw new MembershipError('conflict');
    throw error;
  }
}
export async function changeWorkspaceCouponStatus(actorId: string, id: string, status: CouponStatus, expectedVersion: number, requestKey: string) {
  if (!UUID.test(id) || !UUID.test(requestKey) || !COUPON_STATUSES.includes(status) || !isBoundedInteger(expectedVersion, 2_147_483_646)) throw new MembershipError('validation');
  const payloadHash = hash({ action: 'coupon_status_changed', id, status, expectedVersion });
  return db.transaction(async tx => {
    await lockAdmin(tx, actorId);
    const [coupon] = await tx.select().from(coupons).where(eq(coupons.id, id)).for('update');
    const prior = await tx.query.workspaceAuditEvents.findFirst({ where: and(eq(audits.actorId, actorId), eq(audits.requestKey, requestKey)) });
    if (prior) {
      if (prior.action !== 'coupon_status_changed' || prior.payloadHash !== payloadHash || prior.couponId !== id) throw new MembershipError('conflict');
      return coupon;
    }
    if (!coupon || coupon.version !== expectedVersion || coupon.status === 'archived' || coupon.status === status) throw new MembershipError('conflict');
    const beforeStatus = coupon.status;
    const [changed] = await tx.update(coupons).set({ status, version: coupon.version + 1, updatedAt: sql`greatest(date_trunc('milliseconds', clock_timestamp()), date_trunc('milliseconds', ${coupons.updatedAt}) + interval '1 millisecond')` }).where(eq(coupons.id, id)).returning();
    await tx.insert(audits).values({ actorId, couponId: id, action: 'coupon_status_changed', beforeStatus, afterStatus: status, requestKey, payloadHash, createdAt: changed.updatedAt });
    return changed;
  });
}
