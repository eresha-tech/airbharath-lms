/**
 * Mailercloud Transactional Email Integration for Airbharath LMS
 * API Reference: https://apidoc.mailercloud.com/guides/transactional-email
 * Endpoint: https://email-api.mailercloud.com/email
 */

export const MAILERCLOUD_EMAIL_ENDPOINT = "https://email-api.mailercloud.com/email";
// Shared wire format only; durable callers own authorization, response evidence and retry policy.
export function mailercloudEmailPayload(input: { from: string; fromName: string; to: string; name: string; subject: string; html: string; text?: string; messageId?: string }) {
  return { version: "1.0", email: { from: input.from, fromName: input.fromName, subject: input.subject, html: input.html,
    ...(input.text ? { text: input.text } : {}), recipients: { to: [{ email: input.to, name: input.name }] } },
    ...(input.messageId ? { metadata: { campaignType: "TRANSACTIONAL", messageId: input.messageId, custom: { store_content: false } } } : {}) };
}

export async function sendMailercloudEmail({
  to,
  name,
  subject,
  html,
  privateDelivery = false,
}: {
  to: string;
  name?: string;
  subject: string;
  html: string;
  privateDelivery?: boolean;
}) {
  const apiKey = process.env.MAILERCLOUD_API_KEY;

  if (!apiKey) {
    if (!privateDelivery) console.log(`[MAILERCLOUD DEV NOTICE] MAILERCLOUD_API_KEY is not set. Email to ${to} skipped without error.`);
    return { success: false, skipped: true, reason: "No API key configured", errorCategory: 'not_configured' };
  }

  try {
    const payload = mailercloudEmailPayload({
      from: process.env.MAILERCLOUD_SENDER_EMAIL || "academy@airbharath.in",
      fromName: process.env.MAILERCLOUD_SENDER_NAME || "Airbharath LMS",
      subject, html, to, name: name || "Airbharath Student",
    });

    const response = await fetch(MAILERCLOUD_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      ...(privateDelivery ? { signal: AbortSignal.timeout(8_000) } : {}),
    });

    if (!response.ok) {
      if (privateDelivery) {
        await response.body?.cancel();
        return { success: false, errorCategory: 'provider_rejected' };
      }
      const errText = await response.text();
      console.warn(`[MAILERCLOUD NOTICE] HTTP ${response.status}: Email delivery skipped cleanly without interrupting checkout. Response:`, errText);
      return { success: false, status: response.status, skipped: true, error: errText };
    }

    if (privateDelivery) {
      await response.body?.cancel();
      return { success: true };
    }
    const data = await response.json();
    console.log(`[MAILERCLOUD SUCCESS] Email sent to ${to}. Message ID:`, data?.id || data?.message_id || 'OK');
    return { success: true, data };
  } catch (err: any) {
    if (privateDelivery) return { success: false, errorCategory: err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : 'delivery_unknown' };
    // Suppress network or quota errors completely so transaction completes smoothly
    console.warn(`[MAILERCLOUD ERROR SUPPRESSED] Email delivery failed (${err.message}). Flow continuing cleanly.`);
    return { success: false, error: err.message, skipped: true };
  }
}
