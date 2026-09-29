import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyRazorpaySignature } from "../lib/razorpay-signature.ts";

const testSecret = "synthetic-unit-test-secret";
const orderId = "order_test_123";
const paymentId = "pay_test_456";

function sign(secret = testSecret) {
  return createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

test("rejects a missing signing secret", () => {
  assert.deepEqual(
    verifyRazorpaySignature(orderId, paymentId, sign(), undefined),
    { ok: false, reason: "configuration" },
  );
});

test("rejects an empty or whitespace-only signing secret", () => {
  assert.deepEqual(verifyRazorpaySignature(orderId, paymentId, sign(), ""), {
    ok: false,
    reason: "configuration",
  });
  assert.deepEqual(verifyRazorpaySignature(orderId, paymentId, sign(), "   "), {
    ok: false,
    reason: "configuration",
  });
});

test("rejects malformed verification values", () => {
  assert.deepEqual(verifyRazorpaySignature(null, paymentId, sign(), testSecret), {
    ok: false,
    reason: "malformed",
  });
  assert.deepEqual(
    verifyRazorpaySignature(orderId, paymentId, "not-a-signature", testSecret),
    { ok: false, reason: "malformed" },
  );
});

test("rejects an invalid signature or incorrect signing secret", () => {
  const validSignature = sign();
  const invalidSignature = `${validSignature.slice(0, -1)}${validSignature.endsWith("0") ? "1" : "0"}`;

  assert.deepEqual(
    verifyRazorpaySignature(orderId, paymentId, invalidSignature, testSecret),
    { ok: false, reason: "invalid" },
  );
  assert.deepEqual(
    verifyRazorpaySignature(orderId, paymentId, validSignature, "incorrect-test-secret"),
    { ok: false, reason: "invalid" },
  );
});

test("accepts a valid signature", () => {
  assert.deepEqual(
    verifyRazorpaySignature(orderId, paymentId, sign(), testSecret),
    { ok: true, orderId, paymentId },
  );
});
