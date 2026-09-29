import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findOrder: vi.fn(),
  findCourse: vi.fn(),
  findEnrollment: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  invoice: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      orders: { findFirst: mocks.findOrder },
      courses: { findFirst: mocks.findCourse },
      enrollments: { findFirst: mocks.findEnrollment },
    },
    update: mocks.update,
    insert: mocks.insert,
  },
}));
vi.mock('@/lib/invoice-generator', () => ({ generateAndSaveInvoice: mocks.invoice }));
vi.mock('@/lib/analytics-server', () => ({ serverTrack: mocks.track }));

import { POST } from '@/app/api/payments/razorpay/verify/route';

const secret = 'synthetic-razorpay-secret';
const orderId = 'order_synthetic_123';
const paymentId = 'payment_synthetic_456';
const userId = '00000000-0000-4000-8000-000000000001';
const otherUserId = '00000000-0000-4000-8000-000000000002';
const courseId = '00000000-0000-4000-8000-000000000003';

function signature(id = paymentId) {
  return createHmac('sha256', secret).update(`${orderId}|${id}`).digest('hex');
}

function request(body: unknown) {
  return new Request('http://test.invalid/api/payments/razorpay/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature(),
    ...overrides,
  };
}

function pendingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000004',
    userId,
    courseId,
    status: 'pending',
    razorpayOrderId: orderId,
    razorpayPaymentId: null,
    amount: '825.00',
    ...overrides,
  };
}

function orderUpdateReturning(rows: unknown[]) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })),
    })),
  };
}

function enrollmentInsert() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function expectNoPaymentSideEffects() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.invoice).not.toHaveBeenCalled();
  expect(mocks.track).not.toHaveBeenCalled();
}

describe('POST /api/payments/razorpay/verify', () => {
  beforeEach(() => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', secret);
    mocks.getSession.mockResolvedValue({ id: userId, role: 'student' });
    mocks.findOrder.mockResolvedValue(pendingOrder());
    mocks.findCourse.mockResolvedValue({ accessDays: null });
    mocks.findEnrollment.mockResolvedValue(null);
    mocks.update.mockImplementation(() => orderUpdateReturning([{ id: pendingOrder().id }]));
    mocks.insert.mockImplementation(enrollmentInsert);
    mocks.invoice.mockResolvedValue(undefined);
    mocks.track.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated requests without database or payment side effects', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(401);
    expect(mocks.findOrder).not.toHaveBeenCalled();
    expectNoPaymentSideEffects();
  });

  it('rejects malformed JSON', async () => {
    const response = await POST(new Request('http://test.invalid', {
      method: 'POST',
      body: '{',
    }));

    expect(response.status).toBe(400);
    expect(mocks.findOrder).not.toHaveBeenCalled();
    expectNoPaymentSideEffects();
  });

  it.each([
    ['malformed fields', { razorpay_order_id: orderId }],
    ['missing signing secret', validBody(), null],
    ['empty signing secret', validBody(), ''],
    ['invalid signature', validBody({ razorpay_signature: '0'.repeat(64) })],
  ])('rejects %s without mutation', async (_label, body, configuredSecret = secret) => {
    if (configuredSecret === null) delete process.env.RAZORPAY_KEY_SECRET;
    else vi.stubEnv('RAZORPAY_KEY_SECRET', configuredSecret);

    const response = await POST(request(body));

    expect([400, 503]).toContain(response.status);
    expect(mocks.findOrder).not.toHaveBeenCalled();
    expectNoPaymentSideEffects();
  });

  it('prevents an authenticated user from verifying another user order', async () => {
    mocks.findOrder.mockResolvedValue(pendingOrder({ userId: otherUserId }));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(403);
    expectNoPaymentSideEffects();
  });

  it('verifies an owned pending order and runs each intended side effect once', async () => {
    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.invoice).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledTimes(2);
  });

  it('does not repeat side effects for the same already-paid order and payment', async () => {
    mocks.findOrder.mockResolvedValue(pendingOrder({
      status: 'paid',
      razorpayPaymentId: paymentId,
    }));

    const response = await POST(request(validBody()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.alreadyVerified).toBe(true);
    expectNoPaymentSideEffects();
  });

  it('rejects an already-paid order with a different payment ID', async () => {
    mocks.findOrder.mockResolvedValue(pendingOrder({
      status: 'paid',
      razorpayPaymentId: 'payment_synthetic_other',
    }));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(409);
    expectNoPaymentSideEffects();
  });
});
