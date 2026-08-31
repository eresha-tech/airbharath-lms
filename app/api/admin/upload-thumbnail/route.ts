import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  // 1. Verify the requester is a logged-in admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse the multipart form
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const courseId = formData.get("courseId") as string | null;

  if (!file || !courseId) {
    return NextResponse.json({ error: "Missing file or courseId" }, { status: 400 });
  }

  // Validate size (5 MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 5 MB." }, { status: 400 });
  }

  // Validate type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, WebP, or GIF." }, { status: 400 });
  }

  // 3. Upload using admin client (service role — bypasses RLS)
  const adminSupabase = createAdminClient();
  const ext = file.name.split(".").pop();
  const filePath = `${courseId}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminSupabase.storage
    .from("course-thumbnails")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 4. Return public URL
  const { data } = adminSupabase.storage
    .from("course-thumbnails")
    .getPublicUrl(filePath);

  return NextResponse.json({ url: data.publicUrl });
}
