import 'server-only';
import { MAILERCLOUD_EMAIL_ENDPOINT, mailercloudEmailPayload } from '@/lib/mailercloud';
import { noticeConfiguration } from './configuration';
import { validNoticeEmail } from './configuration-core.mjs';
import type { NoticeOutcome } from './model';
export type NoticeMessage = { subject: string; html: string; text: string };
export interface NoticeProvider { send(input: { deliveryId: string; recipient: string; message: NoticeMessage }): Promise<NoticeOutcome> }
export function createNoticeMailercloudAdapter(env: Record<string, string | undefined> = process.env, http: typeof fetch = fetch, sharedSignal?: AbortSignal): NoticeProvider {
  const config = noticeConfiguration(env);
  if (!config) throw new Error('notice_delivery_unavailable');
  return { async send(input) {
    const current = noticeConfiguration(env);
    if (!current || JSON.stringify(current) !== JSON.stringify(config) || sharedSignal?.aborted) return { state: 'retryable_failure', reason: 'not_dispatched' };
    if (!/^[a-f0-9-]{36}$/.test(input.deliveryId) || !validNoticeEmail(input.recipient) || input.message.html.length > 32_000 || input.message.text.length > 8000 || input.message.subject.length > 200 || !input.message.subject || /[\r\n\u0000]/.test(input.message.subject)) return { state: 'blocked', reason: 'invalid_message' };
    const signal = sharedSignal ? AbortSignal.any([sharedSignal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000);
    try {
      const response = await http(MAILERCLOUD_EMAIL_ENDPOINT, { method: 'POST', redirect: 'error', signal,
        headers: { Authorization: config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(mailercloudEmailPayload({ from: config.senderEmail, fromName: config.senderName, to: input.recipient, name: 'Workspace creator', ...input.message, messageId: input.deliveryId })) });
      const reader = response.body?.getReader();
      if (!reader) return { state: 'uncertain', reason: 'provider_response_unknown' };
      const chunks: Uint8Array[] = []; let size = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 16_384) { await reader.cancel(); return { state: 'uncertain', reason: 'provider_response_unknown' }; } chunks.push(part.value); } }
      finally { reader.releaseLock(); }
      let body: unknown; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return { state: 'uncertain', reason: 'provider_response_unknown' }; }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return { state: 'uncertain', reason: 'provider_response_unknown' };
      const raw = body as Record<string, unknown>, code = raw.statusCode;
      if (response.ok && raw.status === 'SUCCESS' && code === 1000) {
        const reference = typeof raw.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(raw.id) ? raw.id : undefined;
        return { state: 'accepted', reason: 'provider_accepted', providerCode: 1000, ...(reference ? { providerReference: reference } : {}) };
      }
      // Only explicit throttling proves safe automatic resend. Transport/5xx/unknown/soft-bounce may have dispatched.
      if (response.status === 429 && raw.status === 'ERROR' && code === 9001) return { state: 'retryable_failure', reason: 'provider_throttled', providerCode: 9001 };
      if (typeof code === 'number' && [9002,9003,9004,9005,9007,9008,9009,9010,9011,9012,9015,9016,9017,9018,9021,9022,9024,9512,8000,8001].includes(Number(code)) && raw.status === 'ERROR') return { state: 'blocked', reason: [9004,9007,9010,9018,9021,9512].includes(Number(code)) ? 'provider_recipient_rejected' : 'provider_rejected', providerCode: Number(code) };
      return { state: 'uncertain', reason: 'provider_response_unknown', ...(typeof code === 'number' && Number.isSafeInteger(code) && code > 0 && code < 10000 ? { providerCode: code } : {}) };
    } catch { return { state: 'uncertain', reason: 'provider_outcome_unknown' }; }
  } };
}
