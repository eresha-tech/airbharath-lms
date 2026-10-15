import assert from "node:assert/strict";
import test from "node:test";

import { authenticateWebhook } from "../lib/webhook-auth.ts";

const testSecret = "synthetic-webhook-test-secret";

test("rejects a missing server secret", () => {
  assert.deepEqual(authenticateWebhook(testSecret, undefined), {
    ok: false,
    reason: "configuration",
  });
});

test("rejects an empty or whitespace-only server secret", () => {
  assert.deepEqual(authenticateWebhook(testSecret, ""), {
    ok: false,
    reason: "configuration",
  });
  assert.deepEqual(authenticateWebhook(testSecret, "   "), {
    ok: false,
    reason: "configuration",
  });
});

test("rejects malformed server-secret configuration", () => {
  assert.deepEqual(authenticateWebhook(testSecret, ` ${testSecret}`), {
    ok: false,
    reason: "configuration",
  });
  assert.deepEqual(authenticateWebhook(testSecret, "x".repeat(1025)), {
    ok: false,
    reason: "configuration",
  });
});

test("rejects a missing request credential", () => {
  assert.deepEqual(authenticateWebhook(null, testSecret), {
    ok: false,
    reason: "missing",
  });
  assert.deepEqual(authenticateWebhook("   ", testSecret), {
    ok: false,
    reason: "missing",
  });
});

test("rejects malformed or incorrect request credentials", () => {
  assert.deepEqual(authenticateWebhook(123, testSecret), {
    ok: false,
    reason: "invalid",
  });
  assert.deepEqual(authenticateWebhook("incorrect-test-credential", testSecret), {
    ok: false,
    reason: "invalid",
  });
  assert.deepEqual(authenticateWebhook("x".repeat(1025), testSecret), {
    ok: false,
    reason: "invalid",
  });
});

test("accepts the correct request credential", () => {
  assert.deepEqual(authenticateWebhook(testSecret, testSecret), { ok: true });
});
