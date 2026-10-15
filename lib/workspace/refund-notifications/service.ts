import type { NoticeConfiguration } from './configuration';
import { NOTICE_TEMPLATE_VERSION, noticeDigest, noticeFactsValid, renderRefundNotification, resolveNoticeRecipient } from './model';
import type { NoticeProvider } from './provider';
import type { NoticeStore } from './store';
export function createRefundNoticeDeliveryService(store: NoticeStore, provider: NoticeProvider, configuration: NoticeConfiguration, clock = () => new Date()) {
  async function run(signal: AbortSignal, limit = 3) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error('notice_invalid_limit');
    const result = { attempted: 0, accepted: 0, blocked: 0, retryable_failure: 0, uncertain: 0, retry_required: 0 };
    const candidates = await store.candidates(limit);
    for (const id of candidates.slice(0,limit)) {
      if (signal.aborted) break;
      try {
        const claim = await store.claim(id); if (!claim) continue;
        result.attempted++;
        const source = await store.inspect(claim);
        if (!source || !noticeFactsValid(source.facts)) { await store.finish(claim, { state: 'blocked', reason: 'business_fact_unavailable' }); result.blocked++; continue; }
        const recipient = resolveNoticeRecipient(source.facts.userId, source.recipient, clock());
        if ('reason' in recipient) { await store.finish(claim, { state: 'blocked', reason: recipient.reason }); result.blocked++; continue; }
        const message = renderRefundNotification(source.facts, configuration.origin);
        const binding = { payloadHash: noticeDigest({ deliveryId: claim.deliveryId, recipient: recipient.email, sender: configuration.senderEmail, senderName: configuration.senderName, message, scope: configuration.providerScope }), recipientHash: noticeDigest([claim.deliveryId, recipient.email]), providerConfigHash: noticeDigest([configuration.providerScope, configuration.senderEmail, configuration.senderName, configuration.origin]), templateVersion: NOTICE_TEMPLATE_VERSION };
        if (signal.aborted) { await store.finish(claim, { state: 'retryable_failure', reason: 'not_dispatched' }); result.retryable_failure++; continue; }
        if (!await store.dispatch(claim, binding)) continue;
        // Intent + claim are committed. No database lock surrounds provider HTTP.
        let outcome;
        try { outcome = await provider.send({ deliveryId: claim.deliveryId, recipient: recipient.email, message }); }
        catch { outcome = { state: 'uncertain' as const, reason: 'provider_outcome_unknown' }; }
        if (await store.finish(claim, outcome)) result[outcome.state]++;
        else result.retry_required++;
      } catch { result.retry_required++; } // Durable claimed/submitted intent governs subsequent recovery.
    }
    return result;
  }
  return { run };
}
