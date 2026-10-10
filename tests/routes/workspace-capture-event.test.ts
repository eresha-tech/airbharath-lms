import { createHmac } from 'node:crypto';
import { expect, it } from 'vitest';
import { callbackSecret, financialHarness, financeNow } from './workspace-payments-fixtures';

async function scenario(callbackFirst = true) {
  const h = financialHarness(), order = await h.ready();
  h.now.value = new Date(financeNow.getTime() + 60_000);
  const payment = h.captured(order, { capturedAt: null, captureTimeSource: null });
  if (callbackFirst) {
    const signature = createHmac('sha256', callbackSecret).update(`${order.providerOrderId}|${payment.id}`).digest('hex');
    await h.service.confirmPayment(order.userId, order.id, payment.id, signature, callbackSecret);
    expect(order).toMatchObject({ activationState: 'held_for_review', reviewReason: 'capture_time_unverified', paidAt: null });
  }
  const received = await h.store.receiveEvent(h.provider.context, { eventId: 'synthetic-capture-event', type: 'payment.captured', hash: 'a'.repeat(64), evidence: { providerOrderId: order.providerOrderId, providerPaymentId: payment.id, receipt: null, eventCreatedAt: h.now.value.toISOString() } }, h.now.value);
  return { h, order, payment, event: received.event };
}
it.each([true, false])('verified capture event converges with callback-first=%s and exactly one redemption', async callbackFirst => {
  const { h, order, event } = await scenario(callbackFirst);
  await h.service.processEvent(event.id);
  expect(order).toMatchObject({ financialState: 'captured', activationState: 'pending_activation', reviewReason: null, paidAt: h.now.value });
  expect(order.refundEligibleUntil!.getTime() - order.paidAt!.getTime()).toBe(259_200_000);
  expect(h.state.payments[0].captureTimeSource).toBe('razorpay_payment_captured_event_v1');
  await h.service.processEvent(event.id);
  expect(h.state.payments.filter(p => p.winner)).toHaveLength(1);
  expect(h.state.redemptions.filter(r => r.status === 'redeemed')).toHaveLength(1);
});
it.each(['order.paid', 'payment.authorized', 'payment.failed', 'missing_time', 'future_time', 'before_payment', 'wrong_payment', 'wrong_order', 'amount', 'currency', 'anomaly'])('does not adopt capture time from %s', async invalid => {
  const { h, order, payment, event } = await scenario();
  if (['order.paid', 'payment.authorized', 'payment.failed'].includes(invalid)) event.eventType = invalid;
  if (invalid === 'missing_time') event.evidence.eventCreatedAt = null;
  if (invalid === 'future_time') event.evidence.eventCreatedAt = new Date(h.now.value.getTime() + 1000).toISOString();
  if (invalid === 'before_payment') event.evidence.eventCreatedAt = new Date(financeNow.getTime() - 1000).toISOString();
  if (invalid === 'wrong_payment') { event.evidence.providerPaymentId = 'pay_DIFFERENT123'; h.provider.fetchPayment = async () => payment; }
  if (invalid === 'wrong_order') event.evidence.providerOrderId = 'order_DIFFERENT123';
  if (invalid === 'amount') payment.amountPaise++;
  if (invalid === 'currency') payment.currency = 'USD';
  if (invalid === 'anomaly') event.anomalyHash = 'b'.repeat(64);
  await h.service.processEvent(event.id);
  expect(order.paidAt).toBeNull();
  expect(order.activationState).toBe('held_for_review');
});
it('preserves an unrelated operational hold when verified timing arrives', async () => {
  const { h, order, event } = await scenario(); order.reviewReason = 'refund_observed';
  await h.service.processEvent(event.id);
  expect(order.paidAt).toEqual(h.now.value);
  expect(order).toMatchObject({ activationState: 'held_for_review', reviewReason: 'refund_observed' });
});
