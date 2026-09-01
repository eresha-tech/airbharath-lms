import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEVELOPMENT EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  return await resend.emails.send({
    from: 'Airbharath LMS <notifications@airbharath.in>',
    to,
    subject,
    html,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Airbharath LMS!',
    html: `<p>Hi ${name}, welcome to Airbharath LMS!</p>`,
  });
}

export async function sendPurchaseConfirmation(email: string, courseName: string) {
  return sendEmail({
    to: email,
    subject: `Purchase Confirmed: ${courseName}`,
    html: `<p>You are now enrolled in ${courseName}. Happy learning!</p>`,
  });
}

export async function sendCertificateEmail(email: string, courseName: string, certificateUrl: string) {
  return sendEmail({
    to: email,
    subject: `Your Certificate for ${courseName}`,
    html: `<p>Congratulations! You can view your certificate here: <a href="${certificateUrl}">View Certificate</a></p>`,
  });
}
