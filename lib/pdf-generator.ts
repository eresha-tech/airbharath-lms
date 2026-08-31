import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateCertificate(studentName: string, courseName: string, date: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText('Certificate of Completion', {
    x: 50,
    y: height - 100,
    size: 30,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`This is to certify that`, {
    x: 50,
    y: height - 150,
    size: 18,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(studentName, {
    x: 50,
    y: height - 200,
    size: 36,
    font,
    color: rgb(0.1, 0.1, 0.6),
  });

  page.drawText(`has successfully completed the course`, {
    x: 50,
    y: height - 250,
    size: 18,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(courseName, {
    x: 50,
    y: height - 300,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Date: ${date}`, {
    x: 50,
    y: height - 350,
    size: 14,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
