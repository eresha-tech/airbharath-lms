import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { claimCertificate } from '@/lib/certificate-service';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required.' }, { status: 400 });
    }

    const result = await claimCertificate({
      userId: session.id,
      courseId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('CLAIM_CERTIFICATE_ERROR', error);
    return NextResponse.json(
      { error: error.message || 'Failed to claim certificate.' },
      { status: 400 }
    );
  }
}
