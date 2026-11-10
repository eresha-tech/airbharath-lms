import 'server-only';
import { createHash } from 'node:crypto';
import { MediaConvertClient, CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert';
import { S3Client, CopyObjectCommand, HeadObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { MediaError } from './model';
import { mediaStorageConfig, s3MediaStorage, type MediaStorageConfig } from './provider';
import type { Asset, MediaJob } from './service';
import { PROCESSING_POLICY, type MediaProcessor } from './processing';
import type { ByteRange, PrivateObject } from './streaming';
import { storageBodyStream } from './streaming';
import { abortable } from '@/lib/async-budget';
import { VERIFICATION_OBJECTS_PER_PASS, VERIFICATION_BYTES_PER_PASS, VERIFICATION_PASS_MS, type OutputEntry, type VerificationProgress } from './verification-checkpoint';

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
export function processingProvider(c: ProcessingConfig): MediaProcessor & {
  read(asset: Asset, name: string, evidence: { version: string; checksum: string; size: number }, signal?: AbortSignal): Promise<Uint8Array>;
  open(asset: Asset, name: string, evidence: { version: string; checksum: string; size: number }, range: ByteRange | null, signal: AbortSignal, head: boolean): Promise<PrivateObject>;
} {
  const credentials = { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, sessionToken: c.sessionToken };
  const options = { region: c.region, credentials, ignoreConfiguredEndpointUrls: true, maxAttempts: 1 };
  const s3 = new S3Client(options), mc = new MediaConvertClient(options), storage = s3MediaStorage(c);
  const timeout = (signal?:AbortSignal) => ({ abortSignal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000) });
  const target = (a: Asset, key: string) => { if (a.storageContainer !== c.bucket || a.storageAccountId !== c.accountId) throw new MediaError('unavailable'); return { Bucket: c.bucket, Key: key, ExpectedBucketOwner: c.accountId }; };
  const input = (a: Asset, j: MediaJob) => `workspace/${a.creatorProfileId}/${a.projectId}/${a.id}/jobs/${j.id}/input.mp4`;
  async function object(a: Asset, name: string, pinned?: { version: string; checksum: string; size: number }, signal?:AbortSignal, listed?:OutputEntry) {
    outputName(name); const key = outputPrefix(a) + name;
    const head = await s3.send(new HeadObjectCommand({ ...target(a, key), ...(pinned ? { VersionId: pinned.version } : {}) }), timeout(signal));
    const max = name.endsWith('.m3u8') ? 1_048_576 : 32 * 1024 ** 2;
    if (listed && (head.ContentLength!==listed.size||head.ETag!==listed.etag)) throw new MediaError('verification');
    if (!head.VersionId || head.VersionId === 'null' || !head.ContentLength || head.ContentLength > max || head.ContentEncoding || head.ServerSideEncryption !== 'AES256') throw new MediaError('verification');
    const data = await s3.send(new GetObjectCommand({ ...target(a, key), VersionId: head.VersionId }), timeout(signal));
    if (!data.Body || data.VersionId !== head.VersionId || data.ContentLength !== head.ContentLength) throw new MediaError('verification');
    const reader = storageBodyStream(data.Body).getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const { value, done } = await (signal?abortable(reader.read(),signal):reader.read()); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new MediaError('verification'); } chunks.push(value); } } catch(error) { await reader.cancel().catch(()=>undefined); throw error; } finally { reader.releaseLock(); }
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
    inspect: async (a, j, providerJobId, pass) => {
      const signal=pass?.signal??AbortSignal.timeout(VERIFICATION_PASS_MS),started=Date.now();
      const { Job: job } = await abortable(mc.send(new GetJobCommand({ Id: providerJobId }), timeout(signal)),signal);
      if (!job || job.Id !== providerJobId || job.Role !== c.role || job.Queue !== c.queue || job.UserMetadata?.workspaceAsset !== a.id || job.UserMetadata?.workspaceJob !== j.id || job.UserMetadata?.sourceVersion !== j.sourceVersion || job.UserMetadata?.policy !== PROCESSING_POLICY || job.Settings?.Inputs?.[0]?.FileInput !== `s3://${c.bucket}/${input(a, j)}` || job.Settings?.OutputGroups?.[0]?.OutputGroupSettings?.HlsGroupSettings?.Destination !== `s3://${c.bucket}/${outputPrefix(a)}master`) throw new MediaError('verification');
      if (job.Status === 'ERROR' || job.Status === 'CANCELED') return { status: 'failed' };
      if (job.Status !== 'COMPLETE') return { status: 'pending' };
      try {
        await abortable(storage.inspect(a,signal),signal);
        const prior=pass?.checkpoint;
        if(prior&&(prior.providerJobId!==providerJobId||prior.sourceVersion!==j.sourceVersion))throw new MediaError('verification');
        let progress:VerificationProgress=prior?{phase:prior.phase,inventory:prior.inventory,continuation:prior.continuation,verified:{...prior.verified}}:{phase:'listing',inventory:[],continuation:null,verified:{}};
        const save=async()=>{signal.throwIfAborted();await pass?.save(progress);};
        async function list(continuation:string|null) {
          const page=await abortable(s3.send(new ListObjectsV2Command({Bucket:c.bucket,ExpectedBucketOwner:c.accountId,Prefix:outputPrefix(a),MaxKeys:1000,...(continuation?{ContinuationToken:continuation}:{})}),timeout(signal)),signal);
          if(!page.Contents||page.IsTruncated&&!page.NextContinuationToken)throw new MediaError('verification');
          const entries=page.Contents.map(o=>{if(!o.Key?.startsWith(outputPrefix(a))||!o.Size||!o.ETag)throw new MediaError('verification');return {name:outputName(o.Key.slice(outputPrefix(a).length)),size:o.Size,etag:o.ETag};});
          return {entries,next:page.IsTruncated?page.NextContinuationToken!:null};
        }
        for(let pages=0;progress.phase==='listing'&&pages<2;pages++) {
          const page=await list(progress.continuation);progress={...progress,inventory:[...progress.inventory,...page.entries],continuation:page.next,phase:page.next?'listing':'verifying'};
          if(progress.inventory.length>2000||new Set(progress.inventory.map(e=>e.name)).size!==progress.inventory.length||progress.inventory.reduce((n,e)=>n+e.size,0)>4*1024**3)throw new MediaError('verification');
          if(!page.next&&!progress.inventory.some(e=>e.name==='master.m3u8'))throw new MediaError('verification');
          await save();
        }
        if(progress.phase==='listing')return {status:'pending'};
        const names=progress.inventory.map(e=>e.name);let count=0,bytesThisPass=0;
        for(const entry of progress.inventory) {
          if(progress.verified[entry.name])continue;
          if(count>=VERIFICATION_OBJECTS_PER_PASS||bytesThisPass+entry.size>VERIFICATION_BYTES_PER_PASS||Date.now()-started>VERIFICATION_PASS_MS-16000)return {status:'pending'};
          const objectSignal=AbortSignal.any([signal,AbortSignal.timeout(15000)]);
          const {bytes,evidence}=await abortable(object(a,entry.name,undefined,objectSignal,entry),objectSignal);
          if(entry.name.endsWith('.m3u8')) {if(playlistReferences(new TextDecoder('utf-8',{fatal:true}).decode(bytes)).some(r=>!names.includes(r)))throw new MediaError('verification');}
          else if(bytes[0]!==0x47||bytes.length<188||bytes.length%188!==0)throw new MediaError('verification');
          progress.verified={...progress.verified,[entry.name]:evidence};count++;bytesThisPass+=bytes.length;await save();
        }
        if(Object.keys(progress.verified).length!==names.length||names.length<3)throw new MediaError('verification');
        // Check that the complete inventory still matches. Delivery pins every
        // verified immutable version, never whichever version is currently latest.
        const current:OutputEntry[]=[];let continuation:string|null=null;
        do {const page=await list(continuation);current.push(...page.entries);continuation=page.next;if(current.length>2000)throw new MediaError('verification');}while(continuation);
        const ordered=(entries:OutputEntry[])=>JSON.stringify([...entries].sort((a,b)=>a.name.localeCompare(b.name)).map(e=>[e.name,e.size,e.etag]));
        if(ordered(current)!==ordered(progress.inventory))throw new MediaError('verification');
        progress={...progress,phase:'complete'};await save();
        return {status:'complete',manifest:progress.verified};
      }catch(error){if(error instanceof MediaError&&error.code==='verification')return {status:'failed'};throw error;}
    },
    read: async (a, name, evidence, signal = AbortSignal.timeout(45000)) => { await abortable(storage.inspect(a,signal),signal); return (await object(a, name, evidence,signal)).bytes; },
    open: async (a, name, evidence, range, signal, headOnly) => {
      outputName(name);
      if (!evidence.version || evidence.version === 'null' || !/^[a-f0-9]{64}$/.test(evidence.checksum) || !Number.isSafeInteger(evidence.size) || evidence.size < 1 || evidence.size > 32 * 1024 ** 2) throw new MediaError('verification');
      await storage.inspect(a,signal); signal.throwIfAborted();
      const base = { ...target(a, outputPrefix(a) + name), VersionId: evidence.version };
      const head = await s3.send(new HeadObjectCommand(base), { abortSignal: signal });
      if (head.VersionId !== evidence.version || head.ContentLength !== evidence.size || head.ContentEncoding || head.ServerSideEncryption !== 'AES256') throw new MediaError('verification');
      if (headOnly) return { size: evidence.size };
      const size = range ? range.end - range.start + 1 : evidence.size;
      const data = await s3.send(new GetObjectCommand({ ...base, ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}) }), { abortSignal: signal });
      if (!data.Body || data.VersionId !== evidence.version || data.ContentLength !== size || data.ContentEncoding
        || (range ? data.ContentRange !== `bytes ${range.start}-${range.end}/${evidence.size}` : !!data.ContentRange)) {
        await data.Body?.transformToWebStream().cancel(); throw new MediaError('verification');
      }
      // This immutable version was fully SHA256-verified before Ready. A full
      // delivery additionally hashes in-stream; partial delivery pins that version.
      return { size, body: storageBodyStream(data.Body) };
    },
  };
}
