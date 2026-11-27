import 'server-only';
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, GetPublicAccessBlockCommand, GetBucketVersioningCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Asset, StorageIdentity } from './service';
import { MediaError, MAX_RESOURCE_BYTES, UPLOAD_TTL_SECONDS } from './model';
import type { PrivateObjectReader } from './streaming';
import { storageBodyStream } from './streaming';
import { abortable } from '@/lib/async-budget';

export type UploadAuthorization = { url: string; method: 'PUT'; headers: Record<string, string>; expiresAt: string };
export type ObjectInspection = { versionId: string; checksum: string; prefix: Uint8Array; bytes?: Uint8Array };
export interface MediaStorage {
  identity: StorageIdentity;
  authorize(asset: Asset, checksum: string, lifetimeSeconds: number): Promise<UploadAuthorization>;
  inspect(asset: Asset, signal?: AbortSignal): Promise<ObjectInspection>;
  download(asset: Asset, signal?: AbortSignal): Promise<Uint8Array>;
  open?: (asset: Asset, ...args: Parameters<PrivateObjectReader>) => ReturnType<PrivateObjectReader>;
}
export type MediaStorageConfig = { region: string; bucket: string; accountId: string; accessKeyId: string; secretAccessKey: string; sessionToken?: string };
export function mediaStorageConfig(env: Record<string, string | undefined> = process.env): MediaStorageConfig {
  const region = env.WORKSPACE_MEDIA_AWS_REGION, bucket = env.WORKSPACE_MEDIA_S3_BUCKET, accountId = env.WORKSPACE_MEDIA_AWS_ACCOUNT_ID;
  const accessKeyId = env.WORKSPACE_MEDIA_AWS_ACCESS_KEY_ID, secretAccessKey = env.WORKSPACE_MEDIA_AWS_SECRET_ACCESS_KEY;
  if (env.WORKSPACE_MEDIA_STORAGE_ENABLED !== 'true' || env.WORKSPACE_MEDIA_PRIVATE_VERSIONED_BUCKET !== 'true' || !region || !/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(region)
    || !bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket.includes('..') || /^\d+\.\d+\.\d+\.\d+$/.test(bucket)
    || !accountId || !/^\d{12}$/.test(accountId) || !accessKeyId || !secretAccessKey) throw new MediaError('unavailable');
  return { region, bucket, accountId, accessKeyId, secretAccessKey, ...(env.WORKSPACE_MEDIA_AWS_SESSION_TOKEN ? { sessionToken: env.WORKSPACE_MEDIA_AWS_SESSION_TOKEN } : {}) };
}
function version(value: string | undefined) { if (!value || value === 'null') throw new MediaError('verification'); return value; }
function digest(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new MediaError('verification');
  const bytes = Buffer.from(value, 'base64'); if (bytes.length !== 32 || bytes.toString('base64') !== value) throw new MediaError('verification');
  return bytes.toString('hex');
}
type StorageBody = { transformToWebStream(): ReadableStream<Uint8Array> };
async function discard(body: StorageBody | undefined) { try { await body?.transformToWebStream().cancel(); } catch { /* Never expose provider error details. */ } }
async function boundedBody(body: StorageBody | undefined, maximum: number, signal = AbortSignal.timeout(15000)) {
  if (!body) throw new MediaError('verification');
  const reader = storageBodyStream(body).getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { done, value } = await abortable(reader.read(),signal); if (done) break; size += value.byteLength; if (size > maximum) { await reader.cancel(); throw new MediaError('verification'); } chunks.push(value); }
  } catch (error) { await reader.cancel().catch(()=>undefined); throw error; } finally { reader.releaseLock(); }
  return new Uint8Array(Buffer.concat(chunks, size));
}

export function s3MediaStorage(config: MediaStorageConfig): MediaStorage {
  // Explicit Workspace credentials only; no default chain, endpoint override or LMS bucket defaults.
  const client = new S3Client({ region: config.region, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, sessionToken: config.sessionToken }, maxAttempts: 2, ignoreConfiguredEndpointUrls: true, requestChecksumCalculation: 'WHEN_REQUIRED' });
  const common = (a: Asset) => {
    if (a.storageProvider !== 's3' || a.storageContainer !== config.bucket || a.storageAccountId !== config.accountId || a.storageKey !== `workspace/${a.creatorProfileId}/${a.projectId}/${a.id}/source`) throw new MediaError('unavailable');
    return { Bucket: config.bucket, ExpectedBucketOwner: config.accountId, Key: a.storageKey };
  };
  const options = (signal?: AbortSignal) => ({ abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  async function privateBucket(signal?: AbortSignal) {
    const target = { Bucket: config.bucket, ExpectedBucketOwner: config.accountId };
    const [access, versioning] = await Promise.all([
      client.send(new GetPublicAccessBlockCommand(target), options(signal)),
      client.send(new GetBucketVersioningCommand(target), options(signal)),
    ]);
    const block = access.PublicAccessBlockConfiguration;
    if (!block?.BlockPublicAcls || !block.IgnorePublicAcls || !block.BlockPublicPolicy || !block.RestrictPublicBuckets || versioning.Status !== 'Enabled') throw new MediaError('unavailable');
  }
  return {
    identity: { provider: 's3', container: config.bucket, accountId: config.accountId },
    authorize: async (a, checksum, lifetimeSeconds) => {
      common(a); await privateBucket();
      const signedAt = new Date();
      const ttl = Math.min(lifetimeSeconds, UPLOAD_TTL_SECONDS, Math.floor((a.expiresAt.getTime() - signedAt.getTime()) / 1000));
      if (!Number.isInteger(ttl) || ttl < 1) throw new MediaError('expired');
      if (!/^[a-f0-9]{64}$/.test(checksum)) throw new MediaError('validation');
      const checksumBase64 = Buffer.from(checksum, 'hex').toString('base64');
      const metadata = { 'workspace-asset': a.id, 'workspace-owner': a.userId, 'workspace-project': a.projectId, 'workspace-lesson': a.lessonId??'course-cover', 'workspace-context': a.contextHash };
      const headers: Record<string, string> = { 'Content-Type': a.mimeType, 'If-None-Match': '*', 'x-amz-server-side-encryption': 'AES256', 'x-amz-expected-bucket-owner': config.accountId, 'x-amz-checksum-sha256': checksumBase64 };
      for (const [key, value] of Object.entries(metadata)) headers[`x-amz-meta-${key}`] = value;
      const command = new PutObjectCommand({ ...common(a), ContentType: a.mimeType, ContentLength: a.byteSize, IfNoneMatch: '*', ServerSideEncryption: 'AES256', ChecksumSHA256: checksumBase64, Metadata: metadata });
      const url = await getSignedUrl(client, command, { expiresIn: ttl, signingDate: signedAt, signableHeaders: new Set(['content-length', ...Object.keys(headers).map(h => h.toLowerCase())]), unhoistableHeaders: new Set(Object.keys(headers).filter(h => h.startsWith('x-amz-'))) });
      return { url, method: 'PUT', headers, expiresAt: new Date(signedAt.getTime() + ttl * 1000).toISOString() };
    },
    inspect: async (a, signal) => {
      common(a); await privateBucket(signal);
      let head;
      try { head = await client.send(new HeadObjectCommand({ ...common(a), ChecksumMode: 'ENABLED', ...(a.objectVersionId ? { VersionId: a.objectVersionId } : {}) }), options(signal)); }
      catch (error) { if (['NotFound', 'NoSuchKey', 'NoSuchVersion'].includes((error as { name?: string }).name || '')) throw new MediaError('object_missing'); throw error; }
      const expected = { 'workspace-asset': a.id, 'workspace-owner': a.userId, 'workspace-project': a.projectId, 'workspace-lesson': a.lessonId??'course-cover', 'workspace-context': a.contextHash };
      if (head.ContentLength !== a.byteSize || head.ContentType !== a.mimeType || head.ContentEncoding || head.ServerSideEncryption !== 'AES256' || Object.entries(expected).some(([k, v]) => head.Metadata?.[k] !== v)) throw new MediaError('verification');
      const versionId = version(head.VersionId), checksum = digest(head.ChecksumSHA256);
      if (a.objectVersionId && a.objectVersionId !== versionId || a.checksum && a.checksum !== checksum) throw new MediaError('verification');
      const maximum = a.assetKind === 'video' ? Math.min(a.byteSize, 4096) : a.byteSize;
      const data = await client.send(new GetObjectCommand({ ...common(a), VersionId: versionId, ...(a.assetKind === 'video' ? { Range: `bytes=0-${maximum - 1}` } : {}) }), options(signal));
      if (data.VersionId !== versionId || data.ContentLength !== maximum || (a.assetKind === 'video' && data.ContentRange !== `bytes 0-${maximum - 1}/${a.byteSize}`)) { await discard(data.Body); throw new MediaError('verification'); }
      const bytes = await boundedBody(data.Body, maximum, signal);
      if (bytes.byteLength !== maximum) throw new MediaError('verification');
      return { versionId, checksum, prefix: bytes.slice(0, 4096), ...(a.assetKind !== 'video' ? { bytes } : {}) };
    },
    download: async (a, signal) => {
      if (!['resource', 'caption'].includes(a.assetKind) || a.byteSize > MAX_RESOURCE_BYTES) throw new MediaError('not_ready');
      common(a); await privateBucket(signal);
      const data = await client.send(new GetObjectCommand({ ...common(a), VersionId: version(a.objectVersionId || undefined), ChecksumMode: 'ENABLED' }), options(signal));
      if (data.VersionId !== a.objectVersionId || data.ContentLength !== a.byteSize || data.ContentEncoding || data.ContentType !== a.mimeType) { await discard(data.Body); throw new MediaError('verification'); }
      const bytes = await boundedBody(data.Body, a.byteSize, signal); if (bytes.byteLength !== a.byteSize) throw new MediaError('verification'); return bytes;
    },
    open: async (a, range, signal, headOnly) => {
      const base = { ...common(a), VersionId: version(a.objectVersionId || undefined) };
      await privateBucket(signal); signal.throwIfAborted();
      const options = { abortSignal: signal };
      const head = await client.send(new HeadObjectCommand({ ...base, ChecksumMode: 'ENABLED' }), options);
      const expected = { 'workspace-asset': a.id, 'workspace-owner': a.userId, 'workspace-project': a.projectId, 'workspace-lesson': a.lessonId ?? 'course-cover', 'workspace-context': a.contextHash };
      if (head.VersionId !== a.objectVersionId || head.ContentLength !== a.byteSize || head.ContentType !== a.mimeType || head.ContentEncoding || head.ServerSideEncryption !== 'AES256'
        || digest(head.ChecksumSHA256) !== a.checksum || Object.entries(expected).some(([k, v]) => head.Metadata?.[k] !== v)) throw new MediaError('verification');
      if (headOnly) return { size: a.byteSize };
      const size = range ? range.end - range.start + 1 : a.byteSize;
      const data = await client.send(new GetObjectCommand({ ...base, ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}) }), options);
      if (!data.Body || data.VersionId !== a.objectVersionId || data.ContentLength !== size || data.ContentEncoding || data.ContentType !== a.mimeType
        || (range ? data.ContentRange !== `bytes ${range.start}-${range.end}/${a.byteSize}` : !!data.ContentRange)) { await discard(data.Body); throw new MediaError('verification'); }
      return { size, body: storageBodyStream(data.Body) };
    },
  };
}
