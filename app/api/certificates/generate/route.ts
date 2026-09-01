import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateAndSaveCertificate } from '@/lib/certificate-generator';

export async function POST(req: Request) {
  try {
    const { courseId } = await req.json();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const cert = await generateAndSaveCertificate(session.id, courseId);
    return NextResponse.json({ success: true, url: cert.pdfUrl, certificateCode: cert.certificateCode });
  } catch (error: any) {
    console.error('CERTIFICATE_ERROR', error);
    return NextResponse.json({ error: error.message || 'Failed to generate certificate' }, { status: 500 });
  }
}
