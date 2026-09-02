import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '@/lib/db';
import { invoices, orders, users, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendMailercloudEmail } from '@/lib/mailercloud';
import sharp from 'sharp';

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

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  // Create PDF Document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size (595.28 x 841.89 pt)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Palette matching screenshot
  const purplePrimary = rgb(0.42, 0.23, 0.65); // #6b3ba7
  const purpleLightBg = rgb(0.95, 0.93, 0.98); // #f3eefb
  const darkColor = rgb(0.12, 0.12, 0.15);
  const mutedColor = rgb(0.4, 0.45, 0.55);

  // 1. Fetch & Embed Airbharath Logo (Single logo for top right corner)
  let logoImage = null;
  try {
    const logoRes = await fetch('https://assets.airbharath.in/eresha-logo.webp');
    if (logoRes.ok) {
      const webpBuf = Buffer.from(await logoRes.arrayBuffer());
      const pngBuf = await sharp(webpBuf).png().toBuffer();
      logoImage = await pdfDoc.embedPng(pngBuf);
    }
  } catch (err) {
    console.warn('Logo fetch/embed notice:', err);
  }

  // 2. Top Header Left: Title & Metadata
  page.drawText('Invoice', {
    x: 40,
    y: 785,
    size: 30,
    font: fontBold,
    color: purplePrimary,
  });

  page.drawText('Airbharath LMS', {
    x: 40,
    y: 765,
    size: 11,
    font: fontBold,
    color: rgb(0.0039, 0.290, 0.384),
  });

  // Top Header Metadata
  page.drawText('Invoice No #', { x: 40, y: 738, size: 9, font: fontBold, color: mutedColor });
  page.drawText(invoiceNumber, { x: 120, y: 738, size: 9, font: fontBold, color: darkColor });

  page.drawText('Invoice Date', { x: 40, y: 721, size: 9, font: fontBold, color: mutedColor });
  page.drawText(formattedDate, { x: 120, y: 721, size: 9, font: fontBold, color: darkColor });

  page.drawText('Payment Ref', { x: 40, y: 704, size: 9, font: fontBold, color: mutedColor });
  page.drawText(order.razorpayPaymentId || order.razorpayOrderId || 'N/A', { x: 120, y: 704, size: 8.5, font: fontRegular, color: mutedColor });

  // 3. Top Header Right: Single Airbharath Logo (Compact & bounded)
  if (logoImage) {
    const targetHeight = 42;
    const aspectRatio = logoImage.width / logoImage.height;
    const targetWidth = Math.min(targetHeight * aspectRatio, 140);
    const actualHeight = targetWidth / aspectRatio;

    page.drawImage(logoImage, {
      x: 555 - targetWidth,
      y: 755,
      width: targetWidth,
      height: actualHeight,
    });
  }

  // 4. Billed By Container (Purple Box matching screenshot)
  const billedByY = 565;
  page.drawRectangle({
    x: 40,
    y: billedByY,
    width: 280,
    height: 122,
    color: purpleLightBg,
  });

  page.drawText('Billed By', {
    x: 55,
    y: billedByY + 98,
    size: 11,
    font: fontBold,
    color: purplePrimary,
  });

  page.drawText('Eresha Technology Innovators Pvt. Ltd.', {
    x: 55,
    y: billedByY + 80,
    size: 9.5,
    font: fontBold,
    color: darkColor,
  });

  page.drawText('Airbharath Learning Management Systems', {
    x: 55,
    y: billedByY + 66,
    size: 8.5,
    font: fontBold,
    color: rgb(0.0039, 0.290, 0.384),
  });

  page.drawText('20/36D, Ground Floor, West Patel Nagar,', {
    x: 55,
    y: billedByY + 50,
    size: 8.5,
    font: fontRegular,
    color: darkColor,
  });

  page.drawText('New Delhi, Delhi, India - 110008', {
    x: 55,
    y: billedByY + 36,
    size: 8.5,
    font: fontRegular,
    color: darkColor,
  });

  page.drawText('GSTIN:', {
    x: 55,
    y: billedByY + 20,
    size: 8.5,
    font: fontBold,
    color: darkColor,
  });
  page.drawText('07AAGCE9775P1ZN', {
    x: 95,
    y: billedByY + 20,
    size: 8.5,
    font: fontRegular,
    color: darkColor,
  });

  page.drawText('PAN:', {
    x: 185,
    y: billedByY + 20,
    size: 8.5,
    font: fontBold,
    color: darkColor,
  });
  page.drawText('AAGCE9775P', {
    x: 212,
    y: billedByY + 20,
    size: 8.5,
    font: fontRegular,
    color: darkColor,
  });

  // Service Region
  page.drawText('Service Region: India', {
    x: 40,
    y: 535,
    size: 9,
    font: fontBold,
    color: darkColor,
  });

  // 5. Itemized Table (Purple Header Bar matching screenshot)
  const tableY = 500;
  page.drawRectangle({
    x: 40,
    y: tableY,
    width: 515,
    height: 25,
    color: purplePrimary,
  });

  // White Header Labels
  page.drawText('Item / Course Description', { x: 50, y: tableY + 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('GST Rate', { x: 260, y: tableY + 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Qty', { x: 320, y: tableY + 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Base Rate', { x: 365, y: tableY + 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('GST Amt', { x: 440, y: tableY + 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Total (INR)', { x: 500, y: tableY + 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });

  // Item Table Row
  const rowY = tableY - 26;
  page.drawRectangle({
    x: 40,
    y: rowY,
    width: 515,
    height: 24,
    color: purpleLightBg,
  });

  const courseTitle = course?.title || 'Airbharath Course Enrollment';
  const truncatedTitle = courseTitle.length > 30 ? courseTitle.slice(0, 30) + '...' : courseTitle;

  page.drawText(`1. ${truncatedTitle}`, { x: 50, y: rowY + 7, size: 8.5, font: fontBold, color: darkColor });
  page.drawText('18%', { x: 260, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText('1', { x: 320, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${baseAmount}`, { x: 365, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${gstAmount}`, { x: 440, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${totalAmount}`, { x: 500, y: rowY + 7, size: 8.5, font: fontBold, color: purplePrimary });

  // 6. Totals Breakdown Summary (Bottom Right matching screenshot)
  const totalsY = 390;

  page.drawText('Amount:', { x: 365, y: totalsY, size: 9.5, font: fontRegular, color: mutedColor });
  page.drawText(`Rs. ${baseAmount}`, { x: 470, y: totalsY, size: 9.5, font: fontRegular, color: darkColor });

  page.drawText('GST (18%):', { x: 365, y: totalsY - 18, size: 9.5, font: fontRegular, color: mutedColor });
  page.drawText(`Rs. ${gstAmount}`, { x: 470, y: totalsY - 18, size: 9.5, font: fontRegular, color: darkColor });

  // Bottom Double Line
  page.drawLine({
    start: { x: 360, y: totalsY - 30 },
    end: { x: 555, y: totalsY - 30 },
    thickness: 1.5,
    color: darkColor,
  });

  page.drawText('Total (INR)', { x: 365, y: totalsY - 48, size: 12, font: fontBold, color: purplePrimary });
  page.drawText(`Rs. ${totalAmount}`, { x: 470, y: totalsY - 48, size: 13, font: fontBold, color: purplePrimary });

  // 7. Footer Note
  page.drawText('This is a computer-generated tax invoice issued by Eresha Technology Innovators Pvt. Ltd. for Airbharath LMS (https://lms.airbharath.in).', {
    x: 40,
    y: 50,
    size: 8.5,
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

  // Automatic Email Invoice Dispatch
  if (user?.email) {
    const invoiceSubject = `Airbharath LMS Tax Invoice & Receipt - ${invoiceNumber}`;
    const invoiceHtml = `
      <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        <div style="background-color: #6b3ba7; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700;">AIRBHARATH LMS</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #f3eefb;">Eresha Technology Innovators Pvt. Ltd. Tax Invoice</p>
        </div>
        <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
          <p>Dear <strong>${user.fullName || 'Student'}</strong>,</p>
          <p>Thank you for enrolling in <strong>${course?.title || 'Airbharath Course'}</strong>! Your transaction was successful.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; border: 1px solid #cbd5e1;">
            <tr style="background-color: #f8fafc; text-align: left;">
              <th style="padding: 10px; border: 1px solid #cbd5e1;">Invoice Number</th>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #6b3ba7;">${invoiceNumber}</td>
            </tr>
            <tr>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; background-color: #f8fafc;">Course</th>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">${course?.title || 'Airbharath Course'}</td>
            </tr>
            <tr>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; background-color: #f8fafc;">Base Amount</th>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">₹${baseAmount}</td>
            </tr>
            <tr>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; background-color: #f8fafc;">18% GST</th>
              <td style="padding: 10px; border: 1px solid #cbd5e1;">₹${gstAmount}</td>
            </tr>
            <tr style="background-color: #f3eefb;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; color: #6b3ba7;">Grand Total Paid</th>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #6b3ba7; font-size: 15px;">₹${totalAmount}</td>
            </tr>
          </table>

          <p>You can access your course anytime from your <a href="https://lms.airbharath.in/dashboard/courses" style="color: #6b3ba7; font-weight: bold;">Airbharath Learning Dashboard</a> and download your official PDF tax invoice.</p>
          
          <p style="margin-top: 24px;">Warm regards,<br><strong>Eresha Technology Innovators / Airbharath Team</strong><br><span style="font-size: 12px; color: #64748b;">academy@airbharath.in</span></p>
        </div>
      </div>
    `;

    try {
      await sendMailercloudEmail({
        to: user.email,
        name: user.fullName || 'Student',
        subject: invoiceSubject,
        html: invoiceHtml,
      });
    } catch (err) {
      console.warn('[Email Notice] Mailercloud dispatch skipped cleanly.');
    }
  }

  return invoiceRecord;
}
