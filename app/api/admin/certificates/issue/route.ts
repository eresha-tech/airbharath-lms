import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminIssueCertificates } from '@/lib/certificate-service';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { courseId, studentIds, allEligible } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required.' }, { status: 400 });
    }

    if (!allEligible && (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0)) {
      return NextResponse.json(
        { error: 'Please select at least one student or specify allEligible: true.' },
        { status: 400 }
      );
    }

    const results = await adminIssueCertificates({
      courseId,
      studentIds,
      allEligible: !!allEligible,
      adminId: session.id,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('ADMIN_ISSUE_CERTIFICATES_ERROR', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process certificate issuance.' },
      { status: 400 }
    );
  }
}
