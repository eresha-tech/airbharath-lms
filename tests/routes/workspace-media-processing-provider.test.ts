import { createHash } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({s3:vi.fn(),mc:vi.fn(),inspect:vi.fn()}));
vi.mock('@aws-sdk/client-mediaconvert',()=>({MediaConvertClient:class {send=mocks.mc;},CreateJobCommand:class {constructor(public input:unknown){}},GetJobCommand:class {constructor(public input:unknown){}}}));
vi.mock('@aws-sdk/client-s3',()=>Object.fromEntries(['S3Client','CopyObjectCommand','HeadObjectCommand','GetObjectCommand','ListObjectsV2Command'].map(name=>[name,name==='S3Client'?class{send=mocks.s3;}:class{constructor(public input:unknown){}}])));
vi.mock('@/lib/workspace/media/provider',()=>({mediaStorageConfig:vi.fn(),s3MediaStorage:()=>({inspect:mocks.inspect})}));
import { processingProvider } from '@/lib/workspace/media/processing-provider';
import { PROCESSING_POLICY } from '@/lib/workspace/media/processing';
import { uploadFixture } from './workspace-media-upload-fixtures';
const config={region:'us-east-1',bucket:'synthetic-private',accountId:'123456789012',accessKeyId:'fake',secretAccessKey:'fake',role:'arn:aws:iam::123456789012:role/Synthetic',queue:'arn:aws:mediaconvert:us-east-1:123456789012:queues/Synthetic'};
async function fixture(){const f=uploadFixture(),{asset}=await f.reserve();await f.uploads.finalize(f.owner,asset.id,{});const a={...f.state.rows[0],processingJobId:'11111111-1111-4111-8111-111111111111'};const j={id:a.processingJobId,assetId:a.id,sourceVersion:a.objectVersionId!,policy:PROCESSING_POLICY,state:'dispatching' as const,providerJobId:null,dispatchedAt:f.state.clock,manifest:null,createdAt:f.state.clock,updatedAt:f.state.clock};return {a,j,provider:processingProvider(config)};}
beforeEach(()=>{mocks.s3.mockReset();mocks.mc.mockReset();mocks.inspect.mockReset();mocks.inspect.mockResolvedValue({});});
it('stages a pinned private source and sends an idempotent correlated job',async()=>{
 const {a,j,provider}=await fixture();mocks.s3.mockResolvedValue({});mocks.mc.mockResolvedValue({Job:{Id:'aws-job'}});expect(await provider.dispatch(a,j)).toBe('aws-job');
 expect(mocks.s3.mock.calls[0][0].input).toMatchObject({CopySource:expect.stringContaining('versionId=source-v1'),ExpectedBucketOwner:config.accountId,ServerSideEncryption:'AES256'});
 expect(mocks.mc.mock.calls[0][0].input).toMatchObject({ClientRequestToken:j.id,Role:config.role,Queue:config.queue,UserMetadata:{workspaceAsset:a.id,sourceVersion:a.objectVersionId,workspaceJob:j.id,policy:PROCESSING_POLICY}});
});
it('rejects unrelated, wrong-input and wrong-policy callbacks even if COMPLETE',async()=>{
 const {a,j,provider}=await fixture();for(const Job of [{Id:'wrong'},{Id:'aws-job',Role:config.role,Queue:config.queue,Status:'COMPLETE',UserMetadata:{workspaceAsset:a.id,workspaceJob:j.id,sourceVersion:'wrong',policy:PROCESSING_POLICY}}]){mocks.mc.mockResolvedValue({Job});await expect(provider.inspect(a,j,'aws-job')).rejects.toThrow('verification');}
 expect(mocks.s3).not.toHaveBeenCalled();
});
it('requires COMPLETE and verifies every output version/checksum and playlist reference',async()=>{
 const {a,j,provider}=await fixture(),prefix=`workspace/${a.creatorProfileId}/${a.projectId}/${a.id}/`;
 const Job={Id:'aws-job',Role:config.role,Queue:config.queue,Status:'COMPLETE',UserMetadata:{workspaceAsset:a.id,workspaceJob:j.id,sourceVersion:j.sourceVersion,policy:PROCESSING_POLICY},Settings:{Inputs:[{FileInput:`s3://${config.bucket}/${prefix}jobs/${j.id}/input.mp4`}],OutputGroups:[{OutputGroupSettings:{HlsGroupSettings:{Destination:`s3://${config.bucket}/${prefix}processed/master`}}}]}};
 mocks.mc.mockResolvedValue({Job:{...Job,Status:'PROGRESSING'}});expect(await provider.inspect(a,j,'aws-job')).toEqual({status:'pending'});expect(mocks.s3).not.toHaveBeenCalled();
 const files:Record<string,Uint8Array>={'master.m3u8':new TextEncoder().encode('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=10\nmaster_720.m3u8\n'),'master_720.m3u8':new TextEncoder().encode('#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:6,\nmaster_720_00001.ts\n#EXT-X-ENDLIST\n'),'master_720_00001.ts':new Uint8Array(188).fill(0x47)};
 mocks.mc.mockResolvedValue({Job});mocks.s3.mockImplementation(async(cmd:{input:{Key?:string;MaxKeys?:number}})=>{
  if(cmd.input.MaxKeys)return {Contents:Object.keys(files).map(name=>({Key:prefix+'processed/'+name}))};
  const bytes=files[cmd.input.Key!.split('/').at(-1)!];return {VersionId:'pinned-v1',ContentLength:bytes.length,ServerSideEncryption:'AES256',Body:{transformToWebStream:()=>new ReadableStream({start(c){c.enqueue(bytes);c.close();}})}};
 });
 const result=await provider.inspect(a,j,'aws-job');expect(result.status).toBe('complete');if(result.status==='complete')expect(result.manifest['master.m3u8']).toEqual({version:'pinned-v1',size:files['master.m3u8'].length,checksum:createHash('sha256').update(files['master.m3u8']).digest('hex')});
 if(result.status==='complete'){mocks.inspect.mockClear();expect(await provider.read(a,'master.m3u8',result.manifest['master.m3u8'])).toEqual(files['master.m3u8']);expect(mocks.inspect).toHaveBeenCalledWith(a);await expect(provider.read(a,'master.m3u8',{...result.manifest['master.m3u8'],checksum:'d'.repeat(64)})).rejects.toThrow('verification');}
 files['master_720.m3u8']=new TextEncoder().encode('#EXTM3U\nhttps://malicious.invalid/x.ts');expect(await provider.inspect(a,j,'aws-job')).toEqual({status:'failed'});
});
