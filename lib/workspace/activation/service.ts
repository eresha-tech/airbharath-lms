import type { ProviderContext } from '../payments/model';
import type { Order, Payment, Redemption } from '../payments/repository';
import type { workspaceCreatorProfiles, workspaceMemberships } from '@/lib/db/schema';
import { activationReviewReason, membershipTerm } from './model';
export type CreatorProfile = typeof workspaceCreatorProfiles.$inferSelect;
export type Membership = typeof workspaceMemberships.$inferSelect;
export interface ActivationTransaction {
  refunded?(): Promise<boolean>;
  order(): Promise<Order | null>;
  profile(): Promise<CreatorProfile | null>;
  membership(): Promise<Membership | null>;
  payment(): Promise<Payment | null>;
  redemption(): Promise<Redemption | null>;
  otherMemberships(): Promise<Membership[]>;
  createProfile(now: Date): Promise<CreatorProfile>;
  createMembership(values: Omit<Membership, 'id'>): Promise<Membership>;
  fulfill(now: Date): Promise<void>;
  hold(reason: string): Promise<void>;
}
export interface ActivationStore {
  transaction<T>(userId: string, orderId: string, work: (tx: ActivationTransaction) => Promise<T>): Promise<T>;
  pending(limit: number, context: ProviderContext): Promise<{ userId: string; id: string }[]>;
}
export function createWorkspaceActivationService(store: ActivationStore, environment: string | undefined, clock = () => new Date(), context?: ProviderContext) {
  function requireEnvironment() {
    // Production fulfillment requires an explicit Live context; Test evidence stays development-only.
    if (!(['development', 'test'].includes(environment || '') || (environment === 'production' && context?.mode === 'live'))) throw new Error('activation_environment_disabled');
  }
  async function fulfill(userId: string, orderId: string) {
    requireEnvironment();
    return store.transaction(userId, orderId, async tx => {
      const order = await tx.order();
      if (!order || order.userId !== userId) throw new Error('activation_not_found');
      if ((environment === 'production' && order.providerMode !== 'live') || (context && (order.providerAccountId !== context.accountId || order.providerMode !== context.mode))) throw new Error('activation_provider_context_mismatch');
      if (await tx.refunded?.()) return { state: 'refunded' as const };
      const existing = await tx.membership();
      if (existing) {
        if (!order.fulfilledAt || existing.fulfilledAt.getTime() !== order.fulfilledAt.getTime() || existing.userId !== userId) throw new Error('activation_history_inconsistent');
        return { state: 'already_fulfilled' as const, membership: existing };
      }
      // Never clear a financial or operational hold, including real captures without authoritative dates.
      if (order.activationState !== 'pending_activation' || order.financialState !== 'captured') return { state: 'not_ready' as const };
      const now = clock();
      const reason = activationReviewReason(order, await tx.payment(), await tx.redemption(), now);
      if (reason) { await tx.hold(reason); return { state: 'held_for_review' as const }; }
      let profile = await tx.profile();
      if (profile && profile.status !== 'enabled') { await tx.hold(`creator_${profile.status}`); return { state: 'held_for_review' as const }; }
      const term = membershipTerm(order.paidAt!, order.durationMonths);
      const overlaps = (await tx.otherMemberships()).some(m => m.endsAt > now || (m.startsAt < term.endsAt && term.startsAt < m.endsAt));
      if (overlaps) { await tx.hold('membership_overlap'); return { state: 'held_for_review' as const }; }
      // No profile exists until every payment, context, identity and overlap check passes.
      profile ||= await tx.createProfile(now);
      const membership = await tx.createMembership({ userId, creatorProfileId: profile.id, membershipOrderId: orderId, planVersionId: order.planVersionId, durationMonths: order.durationMonths, paidAt: order.paidAt!, ...term, accessGrantedAt: now, fulfilledAt: now, createdAt: now });
      await tx.fulfill(now);
      return { state: 'fulfilled' as const, membership };
    });
  }
  async function runBatch(limit = 10) {
    requireEnvironment();
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error('activation_invalid_limit');
    if (!context || !['test', 'live'].includes(context.mode) || !/^[A-Za-z0-9_]{1,100}$/.test(context.accountId)) throw new Error('activation_provider_context_required');
    const result = { attempted: 0, fulfilled: 0, held: 0, failed: 0 };
    for (const order of await store.pending(limit, context)) {
      result.attempted++;
      try { const item = await fulfill(order.userId, order.id); if (item.state === 'fulfilled') result.fulfilled++; else if (item.state === 'held_for_review') result.held++; }
      catch { result.failed++; } // Financial commit survives; pending activation can be retried independently.
    }
    return result;
  }
  return { fulfill, runBatch };
}
