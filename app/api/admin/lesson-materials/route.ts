import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { lessonMaterials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const fileType = ALLOWED_TYPES[file.type] || "pdf";

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const [material] = await db
    .insert(lessonMaterials)
    .values({
      lessonId,
      title: materialTitle,
      fileUrl: dataUrl,
      fileType,
      fileSize: file.size,
    })
    .returning();

  return NextResponse.json({ material });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { materialId } = await req.json();
  if (!materialId) return NextResponse.json({ error: "Missing materialId" }, { status: 400 });

  await db.delete(lessonMaterials).where(eq(lessonMaterials.id, materialId));

  return NextResponse.json({ success: true });
}
