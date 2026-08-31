import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/svg+xml": "image",
};

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  // 1. Auth check — must be admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const lessonId = formData.get("lessonId") as string | null;
  const materialTitle = (formData.get("title") as string | null)?.trim() || file?.name || "Material";

  if (!file || !lessonId) {
    return NextResponse.json({ error: "Missing file or lessonId" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum is 20 MB." }, { status: 400 });
  }

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, JPG, PNG, WebP, GIF, SVG." },
      { status: 400 }
    );
  }

  // 3. Upload to Supabase Storage using service role (bypasses RLS)
  const adminSupabase = createAdminClient();
  const ext = file.name.split(".").pop();
  const filePath = `${lessonId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminSupabase.storage
    .from("course-materials")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = adminSupabase.storage
    .from("course-materials")
    .getPublicUrl(filePath);

  // 4. Insert record into lesson_materials table
  const { data: material, error: dbError } = await adminSupabase
    .from("lesson_materials")
    .insert({
      lesson_id: lessonId,
      title: materialTitle,
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_size: file.size,
    })
    .select()
    .single();

  if (dbError) {
    // Clean up the uploaded file on DB failure
    await adminSupabase.storage.from("course-materials").remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ material });
}

export async function DELETE(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { materialId } = await req.json();
  if (!materialId) return NextResponse.json({ error: "Missing materialId" }, { status: 400 });

  const adminSupabase = createAdminClient();

  // Fetch the material to get the file path
  const { data: material } = await adminSupabase
    .from("lesson_materials")
    .select("file_url")
    .eq("id", materialId)
    .single();

  if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  // Extract storage path from public URL
  const url = new URL(material.file_url);
  const storagePath = url.pathname.split("/course-materials/")[1];

  if (storagePath) {
    await adminSupabase.storage.from("course-materials").remove([storagePath]);
  }

  const { error } = await adminSupabase
    .from("lesson_materials")
    .delete()
    .eq("id", materialId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
