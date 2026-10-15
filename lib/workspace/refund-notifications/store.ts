import type { DeliveryState, NoticeFacts, NoticeOutcome, Recipient } from './model';
export type NoticeClaim = { deliveryId: string; attemptId: string; attemptNumber: number };
export type NoticeBinding = { payloadHash: string; recipientHash: string; providerConfigHash: string; templateVersion: string };
export type NoticeSummary = { states: Partial<Record<DeliveryState, number>>; blockedReasons: Record<string,number>; lastAcceptedAt: string | null; oldestPendingAt: string | null };
export interface NoticeStore {
  candidates(limit: number): Promise<string[]>;
  claim(noticeId: string): Promise<NoticeClaim | null>;
  inspect(claim: NoticeClaim): Promise<{ facts: NoticeFacts; recipient: Recipient | null } | null>;
  dispatch(claim: NoticeClaim, binding: NoticeBinding): Promise<boolean>;
  finish(claim: NoticeClaim, outcome: NoticeOutcome): Promise<boolean>;
  summary(): Promise<NoticeSummary>;
}
