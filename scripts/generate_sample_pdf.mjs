import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const purplePrimary = rgb(0.42, 0.23, 0.65); // #6b3ba7
  const purpleLightBg = rgb(0.95, 0.93, 0.98); // #f3eefb
  const darkColor = rgb(0.12, 0.12, 0.15);
  const mutedColor = rgb(0.4, 0.45, 0.55);

  // 1. Fetch & Embed Airbharath Logo (Single logo for top right corner)
  let logoImage = null;
  try {
    const logoRes = await fetch('https://assets.airbharath.in/logo.webp');
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
  page.drawText('INV-849201', { x: 120, y: 738, size: 9, font: fontBold, color: darkColor });

  page.drawText('Invoice Date', { x: 40, y: 721, size: 9, font: fontBold, color: mutedColor });
  page.drawText('Sep 02, 2026', { x: 120, y: 721, size: 9, font: fontBold, color: darkColor });

  page.drawText('Payment Ref', { x: 40, y: 704, size: 9, font: fontBold, color: mutedColor });
  page.drawText('pay_Pz92Kx19Lm20aQ', { x: 120, y: 704, size: 8.5, font: fontRegular, color: mutedColor });

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

  page.drawText('1. Content Creation & Digital Marketing Masterclass', { x: 50, y: rowY + 7, size: 8.5, font: fontBold, color: darkColor });
  page.drawText('18%', { x: 260, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText('1', { x: 320, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText('Rs. 1270.34', { x: 365, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText('Rs. 228.66', { x: 440, y: rowY + 7, size: 8.5, font: fontRegular, color: darkColor });
  page.drawText('Rs. 1499.00', { x: 500, y: rowY + 7, size: 8.5, font: fontBold, color: purplePrimary });

  // 6. Totals Breakdown Summary (Bottom Right matching screenshot)
  const totalsY = 390;

  page.drawText('Amount:', { x: 365, y: totalsY, size: 9.5, font: fontRegular, color: mutedColor });
  page.drawText('Rs. 1270.34', { x: 470, y: totalsY, size: 9.5, font: fontRegular, color: darkColor });

  page.drawText('GST (18%):', { x: 365, y: totalsY - 18, size: 9.5, font: fontRegular, color: mutedColor });
  page.drawText('Rs. 228.66', { x: 470, y: totalsY - 18, size: 9.5, font: fontRegular, color: darkColor });

  // Bottom Double Line
  page.drawLine({
    start: { x: 360, y: totalsY - 30 },
    end: { x: 555, y: totalsY - 30 },
    thickness: 1.5,
    color: darkColor,
  });

  page.drawText('Total (INR)', { x: 365, y: totalsY - 48, size: 12, font: fontBold, color: purplePrimary });
  page.drawText('Rs. 1499.00', { x: 470, y: totalsY - 48, size: 13, font: fontBold, color: purplePrimary });

  // 7. Footer Note
  page.drawText('This is a computer-generated tax invoice issued by Eresha Technology Innovators Pvt. Ltd. for Airbharath LMS (https://lms.airbharath.in).', {
    x: 40,
    y: 50,
    size: 8.5,
    font: fontRegular,
    color: mutedColor,
  });

  const pdfBytes = await pdfDoc.save();
  const targetDir = '/home/rishisingh1034/.gemini/antigravity-ide/brain/90d309f7-313c-45c0-9f63-c37170f30aeb';
  const pdfPath = path.join(targetDir, 'sample_invoice.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));
  console.log('Successfully generated sample_invoice.pdf');
}

generateSamplePdf().catch(console.error);
