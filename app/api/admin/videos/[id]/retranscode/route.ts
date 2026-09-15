import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, HeadObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
const rawBucket = process.env.AWS_S3_RAW_BUCKET || "airbharath-lms-raw-uploads";

const s3Client = new S3Client({
  region,
  credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, id))
      .limit(1);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (!video.rawS3Key) {
      return NextResponse.json(
        { error: "No raw S3 key associated with this video. Please upload a replacement." },
        { status: 400 }
      );
    }

    // Verify raw S3 object exists before changing status
    let head;
    try {
      head = await s3Client.send(
        new HeadObjectCommand({
          Bucket: rawBucket,
          Key: video.rawS3Key,
        })
      );
    } catch (err: any) {
      console.error(`Raw S3 object not found for video ${id}:`, err);
      return NextResponse.json(
        { error: "Raw video file not found in storage. Please upload a new video." },
        { status: 400 }
      );
    }

    // 1. Reset video status to 'processing' in database
    await db
      .update(videos)
      .set({
        status: "processing",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, id));

    // 2. Touch the S3 raw object via same-key CopyObject to re-trigger the S3 ObjectCreated Lambda event
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: rawBucket,
        Key: video.rawS3Key,
        CopySource: `${rawBucket}/${encodeURIComponent(video.rawS3Key)}`,
        MetadataDirective: "REPLACE",
        ContentType: head.ContentType || "video/mp4",
      })
    );

    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: "Retranscode initiated successfully.",
    });
  } catch (error: any) {
    console.error("Error initiating video retranscode:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate retranscode" },
      { status: 500 }
    );
  }
}
