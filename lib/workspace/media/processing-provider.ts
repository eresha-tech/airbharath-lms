import 'server-only';
import { createHash } from 'node:crypto';
import { MediaConvertClient, CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert';
import { S3Client, CopyObjectCommand, HeadObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { MediaError } from './model';
import { mediaStorageConfig, s3MediaStorage, type MediaStorageConfig } from './provider';
import type { Asset, MediaJob } from './service';
import { PROCESSING_POLICY, type MediaProcessor } from './processing';

export type ProcessingConfig = MediaStorageConfig & { role: string; queue: string };
export function processingConfig(env: Record<string, string | undefined> = process.env): ProcessingConfig {
  const storage = mediaStorageConfig(env), role = env.WORKSPACE_MEDIA_MEDIACONVERT_ROLE, queue = env.WORKSPACE_MEDIA_MEDIACONVERT_QUEUE;
  if (env.WORKSPACE_MEDIA_PROCESSING_ENABLED !== 'true' || !role || !role.startsWith(`arn:aws:iam::${storage.accountId}:role/`) || !/^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/.test(role)
    || !queue || !queue.startsWith(`arn:aws:mediaconvert:${storage.region}:${storage.accountId}:queues/`) || !/^arn:aws:mediaconvert:[a-z0-9-]+:\d{12}:queues\/[\w-]+$/.test(queue)) throw new MediaError('unavailable');
  return { ...storage, role, queue };
}
export const outputPrefix = (a: Asset) => `workspace/${a.creatorProfileId}/${a.projectId}/${a.id}/processed/`;
export function outputName(name: string) { if (!/^(?:master(?:_[a-zA-Z0-9-]+)?\.m3u8|master_[a-zA-Z0-9-]+(?:_\d+)?\.ts)$/.test(name) || name.length > 180) throw new MediaError('verification'); return name; }
export function playlistReferences(text: string) {
  if (!text.startsWith('#EXTM3U') || text.length > 1_048_576 || /[\x00-\x08\x0b-\x1f\x7f]/.test(text)) throw new MediaError('verification');
  const refs: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) { if (/URI\s*=|EXT-X-(?:KEY|MAP|MEDIA|I-FRAME-STREAM-INF)\s*:/i.test(line)) throw new MediaError('verification'); continue; }
    refs.push(outputName(line));
  }
  if (!refs.length) throw new MediaError('verification'); return refs;
}
export function processingProvider(c: ProcessingConfig): MediaProcessor & { read(asset: Asset, name: string, evidence: { version: string; checksum: string; size: number }): Promise<Uint8Array> } {
  const credentials = { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, sessionToken: c.sessionToken };
  const options = { region: c.region, credentials, ignoreConfiguredEndpointUrls: true, maxAttempts: 1 };
  const s3 = new S3Client(options), mc = new MediaConvertClient(options), storage = s3MediaStorage(c);
  const timeout = () => ({ abortSignal: AbortSignal.timeout(15000) });
  const target = (a: Asset, key: string) => { if (a.storageContainer !== c.bucket || a.storageAccountId !== c.accountId) throw new MediaError('unavailable'); return { Bucket: c.bucket, Key: key, ExpectedBucketOwner: c.accountId }; };
  const input = (a: Asset, j: MediaJob) => `workspace/${a.creatorProfileId}/${a.projectId}/${a.id}/jobs/${j.id}/input.mp4`;
  async function object(a: Asset, name: string, pinned?: { version: string; checksum: string; size: number }) {
    outputName(name); const key = outputPrefix(a) + name;
    const head = await s3.send(new HeadObjectCommand({ ...target(a, key), ...(pinned ? { VersionId: pinned.version } : {}) }), timeout());
    const max = name.endsWith('.m3u8') ? 1_048_576 : 32 * 1024 ** 2;
    if (!head.VersionId || head.VersionId === 'null' || !head.ContentLength || head.ContentLength > max || head.ContentEncoding || head.ServerSideEncryption !== 'AES256') throw new MediaError('verification');
    const data = await s3.send(new GetObjectCommand({ ...target(a, key), VersionId: head.VersionId }), timeout());
    if (!data.Body || data.VersionId !== head.VersionId || data.ContentLength !== head.ContentLength) throw new MediaError('verification');
    const reader = data.Body.transformToWebStream().getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new MediaError('verification'); } chunks.push(value); } } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(Buffer.concat(chunks, size)), evidence = { version: head.VersionId, checksum: createHash('sha256').update(bytes).digest('hex'), size };
    if (size !== head.ContentLength || pinned && (pinned.version !== evidence.version || pinned.size !== size || pinned.checksum !== evidence.checksum)) throw new MediaError('verification');
    return { bytes, evidence };
  }
  return {
    dispatch: async (a, j) => {
      if (a.objectVersionId !== j.sourceVersion || j.policy !== PROCESSING_POLICY || a.processingJobId !== j.id) throw new MediaError('verification');
      await storage.inspect(a); // Privacy, checksum, pinned source and owner metadata.
      // MediaConvert S3 input cannot pin a version. Stage the verified version into
      // a worker-only job key; Creators have no authorization for this prefix.
      await s3.send(new CopyObjectCommand({ ...target(a, input(a, j)), CopySource: `${c.bucket}/${a.storageKey}?versionId=${encodeURIComponent(j.sourceVersion)}`, CopySourceIfMatch: undefined, ServerSideEncryption: 'AES256', MetadataDirective: 'REPLACE', Metadata: { 'workspace-job': j.id, 'workspace-source-version': j.sourceVersion, 'workspace-sha256': a.checksum! } }), timeout());
      const response = await mc.send(new CreateJobCommand({ ClientRequestToken: j.id, Role: c.role, Queue: c.queue,
        UserMetadata: { workspaceAsset: a.id, workspaceJob: j.id, sourceVersion: j.sourceVersion, policy: j.policy },
        Settings: { Inputs: [{ FileInput: `s3://${c.bucket}/${input(a, j)}`, AudioSelectors: { default: { DefaultSelection: 'DEFAULT' } }, VideoSelector: {} }],
          OutputGroups: [{ Name: 'Workspace private HLS', OutputGroupSettings: { Type: 'HLS_GROUP_SETTINGS', HlsGroupSettings: { Destination: `s3://${c.bucket}/${outputPrefix(a)}master`, SegmentLength: 6, MinSegmentLength: 0, DirectoryStructure: 'SINGLE_DIRECTORY', SegmentControl: 'SEGMENTED_FILES', OutputSelection: 'MANIFESTS_AND_SEGMENTS', ManifestDurationFormat: 'INTEGER', ClientCache: 'DISABLED' } }, Outputs: [{ NameModifier: '_720', ContainerSettings: { Container: 'M3U8', M3u8Settings: {} }, VideoDescription: { Width: 1280, Height: 720, CodecSettings: { Codec: 'H_264', H264Settings: { RateControlMode: 'QVBR', MaxBitrate: 3000000, QvbrSettings: { QvbrQualityLevel: 7 }, CodecProfile: 'MAIN', GopSize: 2, GopSizeUnits: 'SECONDS' } } }, AudioDescriptions: [{ AudioSourceName: 'default', CodecSettings: { Codec: 'AAC', AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 } } }] }] }] },
      }), timeout());
      if (!response.Job?.Id) throw new MediaError('unavailable'); return response.Job.Id;
    },
    inspect: async (a, j, providerJobId) => {
      const { Job: job } = await mc.send(new GetJobCommand({ Id: providerJobId }), timeout());
      if (!job || job.Id !== providerJobId || job.Role !== c.role || job.Queue !== c.queue || job.UserMetadata?.workspaceAsset !== a.id || job.UserMetadata?.workspaceJob !== j.id || job.UserMetadata?.sourceVersion !== j.sourceVersion || job.UserMetadata?.policy !== PROCESSING_POLICY || job.Settings?.Inputs?.[0]?.FileInput !== `s3://${c.bucket}/${input(a, j)}` || job.Settings?.OutputGroups?.[0]?.OutputGroupSettings?.HlsGroupSettings?.Destination !== `s3://${c.bucket}/${outputPrefix(a)}master`) throw new MediaError('verification');
      if (job.Status === 'ERROR' || job.Status === 'CANCELED') return { status: 'failed' };
      if (job.Status !== 'COMPLETE') return { status: 'pending' };
      try {
      await storage.inspect(a);
      const list = await s3.send(new ListObjectsV2Command({ Bucket: c.bucket, ExpectedBucketOwner: c.accountId, Prefix: outputPrefix(a), MaxKeys: 2001 }), timeout());
      if (list.IsTruncated || !list.Contents || list.Contents.length > 2000) throw new MediaError('verification');
      const names = list.Contents.map(o => outputName(o.Key!.slice(outputPrefix(a).length)));
      if (!names.includes('master.m3u8')) throw new MediaError('verification');
      const manifest: NonNullable<MediaJob['manifest']> = {}; let total = 0;
      for (const name of names) {
        const { bytes, evidence } = await object(a, name); total += bytes.length;
        if (total > 4 * 1024 ** 3) throw new MediaError('verification');
        if (name.endsWith('.m3u8')) { const refs = playlistReferences(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); if (refs.some(r => !names.includes(r))) throw new MediaError('verification'); }
        else if (bytes[0] !== 0x47 || bytes.length < 188 || bytes.length % 188 !== 0) throw new MediaError('verification');
        manifest[name] = evidence;
      }
      return { status: 'complete', manifest };
      } catch(error) { if(error instanceof MediaError && error.code === 'verification') return {status:'failed'}; throw error; }
    },
    read: async (a, name, evidence) => { await storage.inspect(a); return (await object(a, name, evidence)).bytes; },
  };
}
