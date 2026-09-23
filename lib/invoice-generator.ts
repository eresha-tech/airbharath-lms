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

  // Palette matching AirBharath modern design system
  const brandPrimary = rgb(0.31, 0.27, 0.90); // #4f46e5
  const brandDark = rgb(0.26, 0.22, 0.79); // #4338ca
  const brandLightBg = rgb(0.96, 0.95, 1.0); // #f5f3ff
  const darkColor = rgb(0.09, 0.11, 0.16); // #171c28
  const mutedColor = rgb(0.39, 0.45, 0.55); // #64748b

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
    color: brandPrimary,
  });

  page.drawText('Airbharath LMS', {
    x: 40,
    y: 765,
    size: 11,
    font: fontBold,
    color: brandDark,
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

  // 4. Billed By Container (Brand Light Box)
  const billedByY = 565;
  page.drawRectangle({
    x: 40,
    y: billedByY,
    width: 280,
    height: 122,
    color: brandLightBg,
  });

  page.drawText('Billed By', {
    x: 55,
    y: billedByY + 98,
    size: 11,
    font: fontBold,
    color: brandDark,
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
    color: brandDark,
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

  // 5. Itemized Table (Brand Header Bar)
  const tableY = 500;
  page.drawRectangle({
    x: 40,
    y: tableY,
    width: 515,
    height: 25,
    color: brandPrimary,
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
    color: brandLightBg,
  });

  const courseTitle = course?.title || 'Airbharath Course Enrollment';
  const truncatedTitle = courseTitle.length > 30 ? courseTitle.slice(0, 30) + '...' : courseTitle;

  page.drawText(`1. ${truncatedTitle}`, { x: 50, y: rowY + 7, size: 8.5, font: fontBold, color: darkColor });
  page.drawText('18%', { x: 260, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText('1', { x: 320, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${baseAmount}`, { x: 365, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${gstAmount}`, { x: 440, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText(`Rs. ${totalAmount}`, { x: 500, y: rowY + 7, size: 8.5, font: fontBold, color: brandPrimary });

  // 6. Totals Breakdown Summary (Bottom Right)
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

  page.drawText('Total (INR)', { x: 365, y: totalsY - 48, size: 12, font: fontBold, color: brandPrimary });
  page.drawText(`Rs. ${totalAmount}`, { x: 470, y: totalsY - 48, size: 13, font: fontBold, color: brandPrimary });

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
  // Send enrollment confirmation & course start update email (replacing receipt email, as Razorpay sends payment receipt directly)
  if (user?.email) {
    const emailSubject = `🎉 Enrollment Confirmed! Course Access Starts Sept 18th - Air Bharath LMS`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #3730a3 0%, #4f46e5 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <img src="https://assets.airbharath.in/eresha-logo.webp" alt="Air Bharath LMS" style="height: 40px; margin-bottom: 12px; border-radius: 8px; background: rgba(255,255,255,0.15); padding: 4px;" />
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; font-family: 'Outfit', sans-serif, Georgia, serif;">Air Bharath LMS</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #c7d2fe; letter-spacing: 0.5px; text-transform: uppercase;">Enrollment Confirmed · Course Start Notice</p>
        </div>

        <div style="padding: 32px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${user.fullName || 'Student'}</strong>,</p>
          <p>Congratulations! Your enrollment in <strong>${course?.title || 'Air Bharath Certificate Course'}</strong> is successfully confirmed.</p>

          <div style="background-color: #f5f3ff; border: 1px solid #c7d2fe; border-left: 5px solid #4f46e5; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 8px 0; color: #4338ca; font-size: 16px; font-weight: 700;">
              🚀 Important Course Schedule Update
            </h3>
            <p style="margin: 0; color: #4f46e5; font-weight: 600; font-size: 15px;">
              Course content &amp; video lessons will start and become visible on your LMS Dashboard from <u>September 18, 2026</u>.
            </p>
          </div>

          <p style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">What happens next?</p>
          <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569;">
            <li style="margin-bottom: 8px;">You can log in to your account at <a href="https://lms.airbharath.in" style="color: #4f46e5; font-weight: 600;">lms.airbharath.in</a> at any time.</li>
            <li style="margin-bottom: 8px;">Your enrolled course is safely active under your <strong>Student Dashboard</strong>.</li>
            <li style="margin-bottom: 8px;">Full access to video modules &amp; lesson materials will automatically unlock on <strong>September 18th, 2026</strong>.</li>
          </ul>

          <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="https://lms.airbharath.in/dashboard/courses" style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(79,70,229,0.25);">
              Visit My Learning Dashboard →
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

          <p style="font-size: 13px; color: #64748b; margin: 0;">
            If you have any questions or need assistance, reach out to us at <a href="mailto:academy@airbharath.in" style="color: #4f46e5; font-weight: 600;">academy@airbharath.in</a>.
          </p>

          <p style="margin-top: 20px; font-size: 14px;">
            Warm regards,<br>
            <strong>Air Bharath LMS Team</strong><br>
            <span style="font-size: 12px; color: #64748b;">Eresha Technology Innovators Pvt. Ltd.</span>
          </p>
        </div>
      </div>
    `;

    try {
      await sendMailercloudEmail({
        to: user.email,
        name: user.fullName || 'Student',
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (err) {
      console.warn('[Email Notice] Mailercloud dispatch skipped cleanly.');
    }
  }


  return invoiceRecord;
}
