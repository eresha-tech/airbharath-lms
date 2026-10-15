import { createHash } from 'node:crypto';
import { sendMailercloudEmail } from '@/lib/mailercloud';

export const APPROVAL_TEMPLATE_VERSION = 'workspace-approval-v1';
export const PERSONAL_NOTE_MAX_LENGTH = 1000;
export const APPROVAL_SUBJECT = 'Your AirBharath Workspace Creator application has been approved';
export type ApprovalAction = 'send' | 'resend' | 'retry';

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
export function validateApprovalInput(payload: unknown, sending = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const allowed = sending ? ['personalNote', 'expectedUpdatedAt', 'previewHash', 'action', 'confirmed'] : ['personalNote'];
  if (Object.keys(p).some(key => !allowed.includes(key))) return null;
  if (p.personalNote !== undefined && typeof p.personalNote !== 'string') return null;
  const personalNote = typeof p.personalNote === 'string' ? p.personalNote.trim() : '';
  if (personalNote.length > PERSONAL_NOTE_MAX_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(personalNote)) return null;
  if (sending && (typeof p.expectedUpdatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(p.expectedUpdatedAt) || !Number.isFinite(Date.parse(p.expectedUpdatedAt)) || typeof p.previewHash !== 'string' || !/^[a-f0-9]{64}$/.test(p.previewHash) || !['send', 'resend', 'retry'].includes(String(p.action)) || (p.confirmed !== undefined && typeof p.confirmed !== 'boolean'))) return null;
  return { personalNote, expectedUpdatedAt: p.expectedUpdatedAt as string, previewHash: p.previewHash as string, action: p.action as ApprovalAction, confirmed: p.confirmed === true };
}

export function renderApprovalEmail(applicant: { fullName: string; applicationReference: string }, personalNote = '') {
  const name = escapeEmailHtml(applicant.fullName);
  const reference = escapeEmailHtml(applicant.applicationReference);
  const note = personalNote ? `<section style="margin:24px 0;padding:16px;background:#f5f3ff;border-left:3px solid #6358c8"><strong>A personal note from our team</strong><p style="white-space:pre-wrap">${escapeEmailHtml(personalNote)}</p></section>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f4fa;font-family:Arial,sans-serif;color:#211d3a"><main style="max-width:600px;margin:24px auto;background:#fff;border:1px solid #e5e2ef;border-radius:16px;overflow:hidden"><header style="padding:24px 32px;background:#211d3a;color:#fff"><strong style="font-size:24px">AirBharath</strong><div style="margin-top:8px;font-size:13px;color:#d2ceff">Workspace · Founding Creator Program</div></header><section style="padding:32px;line-height:1.7;font-size:15px"><h1 style="font-size:26px;line-height:1.3">Your creator application is approved.</h1><p>Hello ${name},</p><p>Congratulations — your application to join the AirBharath Workspace Founding Creator Program has been approved.</p><p>You have been selected to join our early cohort of aviation professionals building courses through AirBharath Workspace.</p><p>Our team will contact you with the next steps for Workspace activation, commercial terms and onboarding.</p><p>Your application reference is:</p><p style="padding:16px;background:#f5f3ff;font-family:monospace;font-weight:bold;overflow-wrap:anywhere">${reference}</p><p>Please note that creator approval does not automatically approve individual courses. Courses will be reviewed separately before publication.</p><p>No payment is required at this stage unless AirBharath shares an official Workspace activation process with you.</p>${note}<p>Regards,<br><strong>AirBharath Workspace Team</strong></p></section><footer style="padding:24px 32px;border-top:1px solid #e5e2ef;font-size:12px;line-height:1.7;color:#625b76">AirBharath Workspace<br>Questions? <a href="mailto:academy@airbharath.in" style="color:#6358c8">academy@airbharath.in</a><br>This email confirms creator application approval. Workspace activation and course publication are separate steps.</footer></main></body></html>`;
  return { subject: APPROVAL_SUBJECT, html, templateVersion: APPROVAL_TEMPLATE_VERSION };
}
export function approvalPreviewHash(email: ReturnType<typeof renderApprovalEmail>, updatedAt: Date, recipient: string) {
  return createHash('sha256').update(JSON.stringify([email.templateVersion, email.subject, email.html, recipient, updatedAt.toISOString()])).digest('hex');
}
export async function sendApprovalEmail(applicant: { email: string; fullName: string }, email: ReturnType<typeof renderApprovalEmail>) {
  return sendMailercloudEmail({ to: applicant.email, name: applicant.fullName, subject: email.subject, html: email.html, privateDelivery: true });
}
