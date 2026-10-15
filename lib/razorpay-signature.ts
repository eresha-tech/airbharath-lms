import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpaySignatureVerification =
  | { ok: true; orderId: string; paymentId: string }
  | { ok: false; reason: "configuration" | "malformed" | "invalid" };

function isValidIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value === value.trim()
  );
}

export function verifyRazorpaySignature(
  orderId: unknown,
  paymentId: unknown,
  signature: unknown,
  secret: string | undefined,
): RazorpaySignatureVerification {
  if (!secret || secret.trim().length === 0) {
    return { ok: false, reason: "configuration" };
  }

  if (
    !isValidIdentifier(orderId) ||
    !isValidIdentifier(paymentId) ||
    typeof signature !== "string" ||
    !/^[a-f\d]{64}$/i.test(signature)
  ) {
    return { ok: false, reason: "malformed" };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const suppliedSignature = Buffer.from(signature, "hex");

  return timingSafeEqual(expectedSignature, suppliedSignature)
    ? { ok: true, orderId, paymentId }
    : { ok: false, reason: "invalid" };
}
