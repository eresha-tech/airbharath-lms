import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthorizedAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [video] = await db
    .select({
      id: videos.id,
      status: videos.status,
      errorMessage: videos.errorMessage,
    })
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: video.status,
    errorMessage: video.errorMessage,
  });
}
