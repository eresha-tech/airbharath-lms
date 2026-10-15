import { createHash } from 'node:crypto';
import { validNoticeEmail, noticePublicOrigin } from './configuration-core.mjs';
import { refundNotice } from '../refunds/notices';
import { escapeEmailHtml } from '../approval-email';
export const NOTICE_TEMPLATE_VERSION = 'workspace-refund-notice-v1';
export const NOTICE_MAX_ATTEMPTS = 5;
export type NoticeKind = 'received' | 'rejected' | 'initiated' | 'completed';
export type DeliveryState = 'pending' | 'claimed' | 'submitted' | 'accepted' | 'retryable_failure' | 'uncertain' | 'blocked';
export type AttemptState = Exclude<DeliveryState, 'pending'>;
export type NoticeOutcome = { state: 'accepted' | 'retryable_failure' | 'blocked' | 'uncertain'; reason: string; providerCode?: number; providerReference?: string };
export type Recipient = { userId: string; email: string | null; verification: 'verified' | 'unverified'; verifiedAt?: Date };
export type NoticeFacts = { userId: string; kind: NoticeKind; request: boolean; rejected: boolean; rejectionReason: string | null; initiated: boolean; completed: boolean };
export function noticeFactsValid(f: NoticeFacts) {
  return { received: f.request, rejected: f.rejected && !!f.rejectionReason, initiated: f.initiated, completed: f.completed }[f.kind];
}
export function resolveNoticeRecipient(ownerId: string, recipient: Recipient | null, now: Date): { email: string } | { reason: string } {
  if (!recipient || recipient.userId !== ownerId || !recipient.email) return { reason: 'recipient_unavailable' };
  if (!validNoticeEmail(recipient.email)) return { reason: 'recipient_invalid' };
  if (recipient.verification !== 'verified' || !recipient.verifiedAt || !Number.isFinite(recipient.verifiedAt.getTime()) || recipient.verifiedAt > now) return { reason: 'recipient_unverified' };
  return { email: recipient.email };
}
export function renderRefundNotification(facts: NoticeFacts, origin: string) {
  if (!noticePublicOrigin(origin, 'development')) throw new Error('notice_origin_invalid');
  if (!noticeFactsValid(facts)) throw new Error('notice_business_fact_unavailable');
  const reason = facts.rejectionReason?.slice(0, 2000).replace(/[\u0000-\u001f\u007f]/g, ' ') || null;
  const content = refundNotice(facts.kind, reason), extra = '';
  const link = `${origin}/workspace/refunds`;
  const text = `${content.text}${extra}\nView your refund status: ${link}\nContact: academy@airbharath.in\nAirBharath Workspace\nOperated by Eresha Technology Innovators Pvt. Ltd.`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f5f4fa;font-family:Arial,sans-serif;color:#211d3a"><main style="max-width:600px;margin:24px auto;background:#fff;border:1px solid #e5e2ef;border-radius:16px;overflow:hidden"><header style="padding:24px 32px;background:#211d3a;color:#fff"><strong style="font-size:24px">AirBharath Workspace</strong></header><section style="padding:32px;line-height:1.7"><h1>${escapeEmailHtml(content.subject)}</h1><p>${escapeEmailHtml(content.text + extra)}</p><p><a href="${escapeEmailHtml(link)}">View your refund status</a></p><p>Contact <a href="mailto:academy@airbharath.in">academy@airbharath.in</a>.</p></section><footer style="padding:24px 32px;border-top:1px solid #e5e2ef;font-size:12px">AirBharath Workspace<br>Operated by Eresha Technology Innovators Pvt. Ltd.</footer></main></body></html>`;
  return { subject: content.subject, html, text, templateVersion: NOTICE_TEMPLATE_VERSION };
}
export const noticeDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function noticeRetryAt(now: Date, attempts: number) { return new Date(now.getTime() + Math.min(3_600_000, 60_000 * 2 ** Math.max(0, attempts - 1))); }
