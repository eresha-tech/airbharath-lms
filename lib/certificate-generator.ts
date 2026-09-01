import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { certificates, users, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function generateAndSaveCertificate(userId: string, courseId: string, baseUrl?: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });

  if (!user || !course) throw new Error('User or course not found');

  // Check if certificate already exists
  const existing = await db.query.certificates.findFirst({
    where: and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)),
  });

  if (existing) return existing;

  const certificateCode = `AB-CERT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const domain = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://lms.airbharath.in';
  const verifyUrl = `${domain}/verify-certificate/${certificateCode}`;

  // Generate QR Code image (Data URL PNG)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });

  // Create PDF Document (Landscape A4: 841.89 x 595.28)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841.89, 595.28]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.0039, 0.290, 0.384); // #014a62
  const goldColor = rgb(0.83, 0.68, 0.21);
  const darkColor = rgb(0.08, 0.12, 0.16);

  // Outer Border Frame
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 801.89,
    height: 555.28,
    borderWidth: 3,
    borderColor: primaryColor,
    color: rgb(0.99, 0.99, 1),
  });

  page.drawRectangle({
    x: 28,
    y: 28,
    width: 785.89,
    height: 539.28,
    borderWidth: 1,
    borderColor: goldColor,
  });

  // Certificate Header
  page.drawText('AIRBHARATH LMS', {
    x: 320,
    y: 500,
    size: 28,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText('CERTIFICATE OF COMPLETION', {
    x: 275,
    y: 460,
    size: 18,
    font: fontBold,
    color: goldColor,
  });

  page.drawText('This is to certify that', {
    x: 360,
    y: 410,
    size: 13,
    font: fontRegular,
    color: darkColor,
  });

  // Student Full Name
  page.drawText(user.fullName || 'Student', {
    x: 250,
    y: 365,
    size: 26,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText('has successfully completed the course with distinction', {
    x: 280,
    y: 325,
    size: 13,
    font: fontRegular,
    color: darkColor,
  });

  // Course Title
  page.drawText(`"${course.title}"`, {
    x: 220,
    y: 280,
    size: 20,
    font: fontBold,
    color: darkColor,
  });

  const issueDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(`Issued Date: ${issueDate}`, { x: 80, y: 120, size: 11, font: fontRegular, color: darkColor });
  page.drawText(`Certificate ID: ${certificateCode}`, { x: 80, y: 100, size: 10, font: fontBold, color: primaryColor });

  // Embed QR Code image
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const embeddedQr = await pdfDoc.embedPng(qrImageBytes);
  page.drawImage(embeddedQr, {
    x: 650,
    y: 80,
    width: 100,
    height: 100,
  });

  page.drawText('Scan to Verify', { x: 665, y: 65, size: 9, font: fontBold, color: primaryColor });

  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
  const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

  // Insert into DB certificates table
  const [certRecord] = await db.insert(certificates).values({
    userId,
    courseId,
    certificateCode,
    pdfUrl: pdfDataUrl,
  }).returning();

  return certRecord;
}

export const generateCertificatePDF = generateAndSaveCertificate;

