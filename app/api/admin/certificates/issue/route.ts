import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminIssueCertificates } from '@/lib/certificate-service';
import { serverTrack } from '@/lib/analytics-server';

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

    // Track admin operational certificate issuance event
    await serverTrack(session.id, 'admin_certificates_issued', {
      course_id: courseId,
      issuance_mode: allEligible ? 'all_eligible' : 'selected',
      issued_count: results.issuedCount,
      skipped_count: results.skippedCount,
      already_issued_count: results.alreadyIssuedCount,
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
