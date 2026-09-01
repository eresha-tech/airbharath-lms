import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '@/lib/db';
import { invoices, orders, users, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/resend';

export async function generateAndSaveInvoice(orderId: string) {
  // Fetch order, user, course details
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) throw new Error('Order not found');

  const user = order.userId ? await db.query.users.findFirst({ where: eq(users.id, order.userId) }) : null;
  const course = order.courseId ? await db.query.courses.findFirst({ where: eq(courses.id, order.courseId) }) : null;

  const totalAmount = Number(order.amount) || 0;
  const baseAmount = Math.round((totalAmount / 1.18) * 100) / 100;
  const gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100;
  const cgst = Math.round((gstAmount / 2) * 100) / 100;
  const sgst = Math.round((gstAmount - cgst) * 100) / 100;

  const invoiceNumber = `AB-INV-${Date.now().toString().slice(-6)}`;

  // Create PDF Document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.0039, 0.290, 0.384); // #014a62
  const darkColor = rgb(0.05, 0.05, 0.05);
  const mutedColor = rgb(0.4, 0.4, 0.4);

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: 770,
    width: 595.28,
    height: 72,
    color: primaryColor,
  });

  page.drawText('AIRBHARATH LMS', {
    x: 40,
    y: 798,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('TAX INVOICE / RECEIPT', {
    x: 390,
    y: 798,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Invoice Details
  page.drawText(`Invoice No: ${invoiceNumber}`, { x: 40, y: 730, size: 10, font: fontBold, color: darkColor });
  page.drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, { x: 40, y: 715, size: 10, font: fontRegular, color: mutedColor });
  page.drawText(`Payment Ref: ${order.razorpayPaymentId || order.razorpayOrderId}`, { x: 40, y: 700, size: 10, font: fontRegular, color: mutedColor });

  // Company Details
  page.drawText('Billed By:', { x: 350, y: 730, size: 10, font: fontBold, color: darkColor });
  page.drawText('Airbharath Learning Management Systems', { x: 350, y: 715, size: 9, font: fontRegular, color: darkColor });
  page.drawText('GSTIN: 22AAAAA0000A1Z5', { x: 350, y: 702, size: 9, font: fontRegular, color: mutedColor });
  page.drawText('Support: support@airbharath.in', { x: 350, y: 689, size: 9, font: fontRegular, color: mutedColor });

  // Customer Details
  page.drawText('Billed To:', { x: 40, y: 650, size: 11, font: fontBold, color: darkColor });
  page.drawText(`Student Name: ${user?.fullName || 'Student'}`, { x: 40, y: 635, size: 10, font: fontRegular, color: darkColor });
  page.drawText(`Phone: +91 ${user?.phone || 'N/A'}`, { x: 40, y: 620, size: 10, font: fontRegular, color: mutedColor });
  if (user?.email) {
    page.drawText(`Email: ${user.email}`, { x: 40, y: 605, size: 10, font: fontRegular, color: mutedColor });
  }

  // Table Headers
  const tableY = 560;
  page.drawRectangle({
    x: 40,
    y: tableY,
    width: 515,
    height: 24,
    color: rgb(0.95, 0.96, 0.97),
  });

  page.drawText('Description / Course', { x: 50, y: tableY + 7, size: 10, font: fontBold, color: darkColor });
  page.drawText('SAC Code', { x: 270, y: tableY + 7, size: 10, font: fontBold, color: darkColor });
  page.drawText('Base (INR)', { x: 360, y: tableY + 7, size: 10, font: fontBold, color: darkColor });
  page.drawText('Total (INR)', { x: 470, y: tableY + 7, size: 10, font: fontBold, color: darkColor });

  // Item Row
  page.drawText(course?.title || 'Airbharath Course Enrollment', { x: 50, y: tableY - 25, size: 10, font: fontRegular, color: darkColor });
  page.drawText('999293', { x: 270, y: tableY - 25, size: 10, font: fontRegular, color: mutedColor });
  page.drawText(`Rs. ${baseAmount}`, { x: 360, y: tableY - 25, size: 10, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${totalAmount}`, { x: 470, y: tableY - 25, size: 10, font: fontBold, color: primaryColor });

  // Tax Breakdown Summary
  const summaryY = 460;
  page.drawLine({ start: { x: 300, y: summaryY + 20 }, end: { x: 555, y: summaryY + 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

  page.drawText('Taxable Amount:', { x: 320, y: summaryY, size: 10, font: fontRegular, color: mutedColor });
  page.drawText(`Rs. ${baseAmount}`, { x: 470, y: summaryY, size: 10, font: fontRegular, color: darkColor });

  page.drawText('CGST (9%):', { x: 320, y: summaryY - 20, size: 10, font: fontRegular, color: mutedColor });
  page.drawText(`Rs. ${cgst}`, { x: 470, y: summaryY - 20, size: 10, font: fontRegular, color: darkColor });

  page.drawText('SGST (9%):', { x: 320, y: summaryY - 40, size: 10, font: fontRegular, color: mutedColor });
  page.drawText(`Rs. ${sgst}`, { x: 470, y: summaryY - 40, size: 10, font: fontRegular, color: darkColor });

  page.drawLine({ start: { x: 300, y: summaryY - 55 }, end: { x: 555, y: summaryY - 55 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

  page.drawText('Grand Total:', { x: 320, y: summaryY - 75, size: 12, font: fontBold, color: primaryColor });
  page.drawText(`Rs. ${totalAmount}`, { x: 470, y: summaryY - 75, size: 12, font: fontBold, color: primaryColor });

  // Footer Note
  page.drawText('This is a computer-generated tax invoice and requires no physical signature.', {
    x: 40,
    y: 60,
    size: 9,
    font: fontRegular,
    color: mutedColor,
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
  const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

  // Insert into DB invoices table
  const [invoiceRecord] = await db.insert(invoices).values({
    orderId: order.id,
    userId: order.userId!,
    invoiceNumber: invoiceNumber,
    taxableAmount: baseAmount.toString(),
    gstAmount: gstAmount.toString(),
    totalAmount: totalAmount.toString(),
    pdfUrl: pdfDataUrl,
  }).returning();

  // If user has email, send email
  if (user?.email) {
    try {
      await sendEmail({
        to: user.email,
        subject: `Airbharath LMS Payment Invoice - ${invoiceNumber}`,
        html: `<p>Dear ${user.fullName || 'Student'},</p><p>Thank you for purchasing <strong>${course?.title}</strong> on Airbharath LMS!</p><p>Your invoice number is <strong>${invoiceNumber}</strong> for the total amount of ₹${totalAmount}.</p><p>Best regards,<br>Airbharath Team</p>`,
      });
    } catch (err) {
      console.error('Invoice email error:', err);
    }
  }

  return invoiceRecord;
}
