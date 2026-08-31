import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase-server';
import { generateCertificate } from '@/lib/pdf-generator';

export async function POST(req: Request) {
  try {
    const { courseId, courseName } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Ensure storage bucket exists
    const { data: buckets } = await adminSupabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'certificates');
    if (!bucketExists) {
      await adminSupabase.storage.createBucket('certificates', {
        public: true,
      });
    }

    // If all completed, generate PDF
    const pdfBytes = await generateCertificate(
      user.user_metadata?.full_name || user.email || 'Student',
      courseName,
      new Date().toLocaleDateString()
    );

    // Upload to Supabase Storage using admin client to bypass storage RLS
    const fileName = `certificates/${user.id}_${courseId}.pdf`;
    const { error: uploadError } = await adminSupabase.storage
      .from('certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = adminSupabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    // Save to certificates table using admin client to bypass DB RLS
    const { error: insertError } = await adminSupabase.from('certificates').insert({
      user_id: user.id,
      course_id: courseId,
      pdf_url: publicUrl,
    });

    if (insertError) throw insertError;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('CERTIFICATE_ERROR', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
