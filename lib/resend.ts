import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name: string) {
  return await resend.emails.send({
    from: 'LMS <onboarding@resend.dev>',
    to: email,
    subject: 'Welcome to our LMS!',
    html: `<p>Hi ${name}, welcome aboard!</p>`,
  });
}

export async function sendPurchaseConfirmation(email: string, courseName: string) {
  return await resend.emails.send({
    from: 'LMS <payments@resend.dev>',
    to: email,
    subject: `Purchase Confirmed: ${courseName}`,
    html: `<p>You are now enrolled in ${courseName}. Happy learning!</p>`,
  });
}

export async function sendCertificateEmail(email: string, courseName: string, certificateUrl: string) {
  return await resend.emails.send({
    from: 'LMS <certificates@resend.dev>',
    to: email,
    subject: `Your Certificate for ${courseName}`,
    html: `<p>Congratulations! You can download your certificate here: <a href="${certificateUrl}">Download</a></p>`,
  });
}
