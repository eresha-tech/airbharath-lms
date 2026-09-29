import { createHash, timingSafeEqual } from "node:crypto";

export type WebhookAuthentication =
  | { ok: true }
  | { ok: false; reason: "configuration" | "missing" | "invalid" };

function isConfiguredSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 1024 &&
    value === value.trim()
  );
}

export function authenticateWebhook(
  suppliedCredential: unknown,
  serverSecret: string | undefined,
): WebhookAuthentication {
  if (!isConfiguredSecret(serverSecret)) {
    return { ok: false, reason: "configuration" };
  }

  if (
    suppliedCredential === null ||
    suppliedCredential === undefined ||
    (typeof suppliedCredential === "string" && suppliedCredential.trim().length === 0)
  ) {
    return { ok: false, reason: "missing" };
  }

  if (typeof suppliedCredential !== "string" || suppliedCredential.length > 1024) {
    return { ok: false, reason: "invalid" };
  }

  const suppliedDigest = createHash("sha256").update(suppliedCredential).digest();
  const expectedDigest = createHash("sha256").update(serverSecret).digest();

  return timingSafeEqual(suppliedDigest, expectedDigest)
    ? { ok: true }
    : { ok: false, reason: "invalid" };
}
