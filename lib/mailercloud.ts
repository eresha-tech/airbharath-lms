/**
 * Mailercloud Transactional Email Integration for Airbharath LMS
 * API Reference: https://apidoc.mailercloud.com/guides/transactional-email
 * Endpoint: https://email-api.mailercloud.com/email
 */

export async function sendMailercloudEmail({
  to,
  name,
  subject,
  html,
}: {
  to: string;
  name?: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.MAILERCLOUD_API_KEY;

  if (!apiKey) {
    console.log(`[MAILERCLOUD DEV NOTICE] MAILERCLOUD_API_KEY is not set. Email to ${to} skipped without error.`);
    return { success: false, skipped: true, reason: "No API key configured" };
  }

  try {
    const payload = {
      version: "1.0",
      email: {
        from: process.env.MAILERCLOUD_SENDER_EMAIL || "academy@airbharath.in",
        fromName: process.env.MAILERCLOUD_SENDER_NAME || "Airbharath LMS",
        subject: subject,
        html: html,
        recipients: {
          to: [{ email: to, name: name || "Airbharath Student" }],
        },
      },
    };

    const response = await fetch("https://email-api.mailercloud.com/email", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[MAILERCLOUD NOTICE] HTTP ${response.status}: Email delivery skipped cleanly without interrupting checkout. Response:`, errText);
      return { success: false, status: response.status, skipped: true, error: errText };
    }

    const data = await response.json();
    console.log(`[MAILERCLOUD SUCCESS] Email sent to ${to}. Message ID:`, data?.id || data?.message_id || 'OK');
    return { success: true, data };
  } catch (err: any) {
    // Suppress network or quota errors completely so transaction completes smoothly
    console.warn(`[MAILERCLOUD ERROR SUPPRESSED] Email delivery failed (${err.message}). Flow continuing cleanly.`);
    return { success: false, error: err.message, skipped: true };
  }
}
