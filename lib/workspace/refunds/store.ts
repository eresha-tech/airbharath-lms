import type { workspaceRefundRequests, workspaceRefundAttempts, workspaceRefundCompletions } from '@/lib/db/schema';
import type { Order, Payment } from '../payments/repository';
import type { ProviderContext } from '../payments/model';
export type RefundRequest = typeof workspaceRefundRequests.$inferSelect;
export type RefundAttempt = typeof workspaceRefundAttempts.$inferSelect;
export type RefundCompletion = typeof workspaceRefundCompletions.$inferSelect;
export type RefundSnapshot = { order: Order; request: RefundRequest | null; attempt: RefundAttempt | null; completion: RefundCompletion | null };
export type RequestPatch = Pick<RefundRequest, 'decision' | 'decidedBy' | 'decidedAt' | 'rejectionReason'>;
export type AttemptPatch = Partial<Pick<RefundAttempt,'state'|'providerRefundId'|'startedAt'|'lastCheckedAt'|'evidenceHash'|'errorCode'>>;
export interface RefundTransaction extends RefundSnapshot {
  markScan?(): Promise<void>;
  actor: { id: string; role: string } | null; payment: Payment | null;
  now(): Promise<Date>;
  requestByKey(userId: string, key: string): Promise<RefundRequest | undefined>;
  createRequest(input: typeof workspaceRefundRequests.$inferInsert): Promise<RefundRequest>;
  patchRequest(input: RequestPatch): Promise<RefundRequest>;
  createAttempt(input: typeof workspaceRefundAttempts.$inferInsert): Promise<RefundAttempt>;
  patchAttempt(input: AttemptPatch): Promise<RefundAttempt>;
  complete(input: typeof workspaceRefundCompletions.$inferInsert): Promise<RefundCompletion>;
  observe(hash: string, outcome: 'none'|'processing'|'partial_review'|'full'|'mismatch_review'): Promise<void>;
  notice(kind: 'received'|'rejected'|'initiated'|'completed'): Promise<void>;
}
export interface RefundStore {
 externalPending?(context: ProviderContext, limit: number): Promise<{ membershipOrderId: string }[]>;
 markExternalChecked?(orderId: string): Promise<void>;
 transaction<T>(orderId: string, actorId: string | null, work: (tx: RefundTransaction)=>Promise<T>): Promise<T>;
 read(orderId: string, actorId?: string, admin?: boolean): Promise<RefundSnapshot | null>;
 pending(context: ProviderContext, limit: number, includePrepared?: boolean): Promise<RefundAttempt[]>;
}
