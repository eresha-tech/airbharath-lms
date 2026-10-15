import { sendMailercloudEmail } from '@/lib/mailercloud';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
export async function sendApplicationReceipt(application: { fullName: string; email: string; applicationReference: string }): Promise<boolean> {
  // Never send to a live service during local verification. Missing configuration is a no-op.
  if (!process.env.MAILERCLOUD_API_KEY) return false;
  const result = await sendMailercloudEmail({
    to: application.email, name: application.fullName,
    subject: `Your AirBharath Workspace application — ${application.applicationReference}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a1740"><h1>Application received.</h1><p>Hello ${escapeHtml(application.fullName)},</p><p>Thank you for applying to the AirBharath Workspace Founding Creator Program.</p><p><strong>Application ID: ${escapeHtml(application.applicationReference)}</strong><br>Status: Submitted</p><p>Our team will review your aviation background, course idea and creator profile. Submitting an application does not guarantee acceptance. We will contact selected creators with the next steps.</p><p>No payment is required to apply, and no creator account has been created.</p><p>AirBharath Workspace<br><a href="mailto:academy@airbharath.in">academy@airbharath.in</a></p></div>`,
  });
  return result.success;
}
