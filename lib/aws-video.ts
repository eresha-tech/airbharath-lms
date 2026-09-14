import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3PresignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";

// Environment configurations with safe defaults
const region = process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

const rawBucket = process.env.AWS_S3_RAW_BUCKET || "airbharath-lms-raw-uploads";
const processedBucket = process.env.AWS_S3_PROCESSED_BUCKET || "airbharath-lms-processed-videos";

const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN || "";
const cloudFrontKeyPairId = (process.env.AWS_CLOUDFRONT_KEY_PAIR_ID || "").replace(/"/g, "");
const cloudFrontPrivateKey = process.env.AWS_CLOUDFRONT_PRIVATE_KEY || "";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize clients lazily or with credentials if present
const s3Client = new S3Client({
  region,
  credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
});

/**
 * Helper to normalize CloudFront private key format (handles escaped newlines, quotes, or base64 encoding).
 */
function getNormalizedCloudFrontPrivateKey(): string {
  let privateKey = cloudFrontPrivateKey;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  } else if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    try {
      privateKey = Buffer.from(privateKey, "base64").toString("utf-8");
    } catch {
      // Keep original if decoding fails
    }
  }
  return privateKey;
}

/**
 * Generates a pre-signed S3 PUT URL for uploading raw video directly from browser to S3.
 * ponytail: Expiration set to 10 minutes (600s). Video bytes bypass Next.js server entirely.
 */
export async function getS3UploadPresignedUrl(courseId: string, videoId: string, filename: string) {
  const fileExt = filename.split(".").pop() || "mp4";
  const s3Key = `raw-uploads/${courseId}/${videoId}.${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: rawBucket,
    Key: s3Key,
    ContentType: `video/${fileExt === "mov" ? "quicktime" : "mp4"}`,
  });

  const uploadUrl = await getS3PresignedUrl(s3Client, command, { expiresIn: 600 });

  return { uploadUrl, s3Key };
}

/**
 * Generates a CloudFront Signed URL with a custom wildcard policy for secured HLS adaptive streaming.
 * ponytail: Custom policy signs `https://{cloudFrontDomain}/{courseId}/{videoId}/*` so all manifests and TS segments are authorized.
 */
export function getCloudFrontSignedPlaybackUrl(courseId: string, videoId: string, ttlSeconds = 7200) {
  if (!cloudFrontDomain || !cloudFrontKeyPairId || !cloudFrontPrivateKey) {
    console.warn("CloudFront domain, key pair ID, or private key is missing in environment variables.");
    return `https://${cloudFrontDomain}/${courseId}/${videoId}/index.m3u8`;
  }

  const privateKey = getNormalizedCloudFrontPrivateKey();
  const epochEnd = Math.floor((Date.now() + ttlSeconds * 1000) / 1000);
  const customPolicy = JSON.stringify({
    Statement: [
      {
        Resource: `https://${cloudFrontDomain}/${courseId}/${videoId}/*`,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": epochEnd,
          },
        },
      },
    ],
  });

  const masterUrl = `https://${cloudFrontDomain}/${courseId}/${videoId}/index.m3u8`;
  const signedPlaybackUrl = getCloudFrontSignedUrl({
    url: masterUrl,
    policy: customPolicy,
    keyPairId: cloudFrontKeyPairId,
    privateKey,
  });

  return signedPlaybackUrl;
}

/**
 * Enforces concurrent session limits using Upstash Redis REST API.
 * ponytail: Uses stdlib fetch to avoid adding an extra npm Redis client dependency.
 * Overwrites existing user session key (Kick Old Session strategy per PRD sec 12).
 */
export async function acquirePlaybackSession(userId: string, videoId: string, ttlSeconds = 7200) {
  if (!upstashUrl || !upstashToken) {
    // If Redis is not configured, fall back to allowing playback
    return { sessionId: `${userId}-${Date.now()}` };
  }

  const sessionId = `${userId}-${videoId}-${Date.now()}`;
  const key = `playback_session:${userId}`;
  const value = JSON.stringify({ videoId, sessionId, startedAt: new Date().toISOString() });

  try {
    // Set key with EX (TTL in seconds)
    const res = await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${ttlSeconds}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    if (!res.ok) {
      console.error("Upstash Redis error setting session lock:", await res.text());
    }
  } catch (err) {
    console.error("Failed to connect to Upstash Redis:", err);
  }

  return { sessionId };
}

/**
 * Verifies if the current user session is still active in Redis.
 */
export async function verifyPlaybackSession(userId: string, sessionId: string) {
  if (!upstashUrl || !upstashToken) return true;

  const key = `playback_session:${userId}`;
  try {
    const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    if (!res.ok) return true;
    const data = await res.json();
    if (!data.result) return false;
    const stored = JSON.parse(data.result);
    return stored.sessionId === sessionId;
  } catch {
    return true; // Graceful fallback on network error
  }
}

/**
 * Releases playback session lock from Upstash Redis when student exits player.
 */
export async function releasePlaybackSession(userId: string) {
  if (!upstashUrl || !upstashToken) return;

  const key = `playback_session:${userId}`;
  try {
    await fetch(`${upstashUrl}/del/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
  } catch (err) {
    console.error("Upstash Redis error releasing session:", err);
  }
}

