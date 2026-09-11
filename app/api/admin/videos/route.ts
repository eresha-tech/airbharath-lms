import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { S3Client, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
const rawBucket = process.env.AWS_S3_RAW_BUCKET || "airbharath-lms-raw-uploads";
const processedBucket = process.env.AWS_S3_PROCESSED_BUCKET || "airbharath-lms-processed-videos";

const s3Client = new S3Client({
  region,
  credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoList = await db.select().from(videos).orderBy(desc(videos.createdAt));
    return NextResponse.json({ videos: videoList });
  } catch (error: any) {
    console.error("Error listing videos:", error);
    return NextResponse.json({ error: error.message || "Failed to list videos" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("id");

    if (!videoId) {
      return NextResponse.json({ error: "Missing video ID parameter" }, { status: 400 });
    }

    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Delete raw S3 object if present
    if (video.rawS3Key) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: rawBucket, Key: video.rawS3Key }));
      } catch (err) {
        console.warn("Failed to delete raw S3 object:", err);
      }
    }

    // Delete processed HLS S3 objects if present
    if (video.processedS3Prefix) {
      try {
        const listed = await s3Client.send(
          new ListObjectsV2Command({ Bucket: processedBucket, Prefix: video.processedS3Prefix })
        );
        if (listed.Contents && listed.Contents.length > 0) {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: processedBucket,
              Delete: { Objects: listed.Contents.map((obj) => ({ Key: obj.Key })) },
            })
          );
        }
      } catch (err) {
        console.warn("Failed to delete processed S3 objects:", err);
      }
    }

    // Delete record from DB
    await db.delete(videos).where(eq(videos.id, videoId));

    return NextResponse.json({ success: true, message: "Video deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting video:", error);
    return NextResponse.json({ error: error.message || "Failed to delete video" }, { status: 500 });
  }
}
