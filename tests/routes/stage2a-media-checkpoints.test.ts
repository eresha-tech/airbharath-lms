import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({s3:vi.fn(),mc:vi.fn(),inspect:vi.fn()}));
vi.mock('@aws-sdk/client-mediaconvert',()=>({MediaConvertClient:class{send=mocks.mc;},CreateJobCommand:class{constructor(public input:unknown){}},GetJobCommand:class{constructor(public input:unknown){}}}));
vi.mock('@aws-sdk/client-s3',()=>Object.fromEntries(['S3Client','CopyObjectCommand','HeadObjectCommand','GetObjectCommand','ListObjectsV2Command'].map(n=>[n,n==='S3Client'?class{send=mocks.s3;}:class{constructor(public input:unknown){}}])));
vi.mock('@/lib/workspace/media/provider',()=>({mediaStorageConfig:vi.fn(),s3MediaStorage:()=>({inspect:mocks.inspect})}));
import { processingProvider } from '@/lib/workspace/media/processing-provider';
import { PROCESSING_POLICY } from '@/lib/workspace/media/processing';
import type { VerificationCheckpoint, VerificationPass, VerificationProgress } from '@/lib/workspace/media/verification-checkpoint';
import { uploadFixture } from './workspace-media-upload-fixtures';
const config={region:'us-east-1',bucket:'synthetic-private',accountId:'123456789012',accessKeyId:'synthetic',secretAccessKey:'synthetic',role:'arn:aws:iam::123456789012:role/Synthetic',queue:'arn:aws:mediaconvert:us-east-1:123456789012:queues/Synthetic'};
beforeEach(()=>{mocks.s3.mockReset();mocks.mc.mockReset();mocks.inspect.mockReset();mocks.inspect.mockResolvedValue({});});
async function fixture(segments=150,segmentBytes=188) {
 const f=uploadFixture(),{asset}=await f.reserve();await f.uploads.finalize(f.owner,asset.id,{});
 const a={...f.state.rows[0],processingJobId:'11111111-1111-4111-8111-111111111111'},j={id:a.processingJobId,assetId:a.id,sourceVersion:a.objectVersionId!,policy:PROCESSING_POLICY,state:'submitted' as const,providerJobId:'aws-job',dispatchedAt:f.state.clock,manifest:null,createdAt:f.state.clock,updatedAt:f.state.clock};
 const prefix=`workspace/${a.creatorProfileId}/${a.projectId}/${a.id}/`,names=['master.m3u8','master_720.m3u8',...Array.from({length:segments},(_,i)=>`master_720_${String(i).padStart(5,'0')}.ts`)];
 const data=(name:string)=>new TextEncoder().encode(name==='master.m3u8'?'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nmaster_720.m3u8\n':'#EXTM3U\n'+names.slice(2).map(n=>'#EXTINF:6,\n'+n).join('\n')+'\n#EXT-X-ENDLIST\n');
 const size=(name:string)=>name.endsWith('.m3u8')?data(name).length:segmentBytes;
 let failName='',stallName='',etag='synthetic-etag',checkpoint:VerificationCheckpoint|null=null,bodyReads=0;
 mocks.mc.mockResolvedValue({Job:{Id:'aws-job',Role:config.role,Queue:config.queue,Status:'COMPLETE',UserMetadata:{workspaceAsset:a.id,workspaceJob:j.id,sourceVersion:j.sourceVersion,policy:PROCESSING_POLICY},Settings:{Inputs:[{FileInput:`s3://${config.bucket}/${prefix}jobs/${j.id}/input.mp4`}],OutputGroups:[{OutputGroupSettings:{HlsGroupSettings:{Destination:`s3://${config.bucket}/${prefix}processed/master`}}}]}}});
 mocks.s3.mockImplementation(async(cmd:{input:{Key?:string;MaxKeys?:number;ContinuationToken?:string;VersionId?:string}},options:{abortSignal:AbortSignal})=>{
  if(cmd.input.MaxKeys){const start=Number(cmd.input.ContinuationToken??0),page=names.slice(start,start+1000);return {Contents:page.map(name=>({Key:prefix+'processed/'+name,Size:size(name),ETag:etag})),IsTruncated:start+1000<names.length,...(start+1000<names.length?{NextContinuationToken:String(start+1000)}:{})};}
  const name=cmd.input.Key!.split('/').at(-1)!;
  if(name===failName)throw Error('synthetic interruption');
  return {ETag:etag,VersionId:'output-v1',ContentLength:size(name),ServerSideEncryption:'AES256',Body:{transformToWebStream:()=>new ReadableStream<Uint8Array>({
   async pull(c){bodyReads++;if(name===stallName){await new Promise<void>(resolve=>options.abortSignal.addEventListener('abort',()=>resolve(),{once:true}));c.error(Error('aborted'));return;}c.enqueue(name.endsWith('.m3u8')?data(name):new Uint8Array(segmentBytes).fill(0x47));c.close();},
  },{highWaterMark:0})}};
 });
 const save=async(progress:VerificationProgress)=>{checkpoint={...structuredClone(progress),inventory:progress.inventory.map(e=>({etag:e.etag,name:e.name,size:e.size})),version:(checkpoint?.version??0)+1,providerJobId:'aws-job',sourceVersion:j.sourceVersion};};
 const pass=(signal=AbortSignal.timeout(20000)):VerificationPass=>({checkpoint,signal,save});
 return {a,j,provider:processingProvider(config),pass,checkpoint:()=>checkpoint,fail:(name:string)=>{failName=name;},stall:(name:string)=>{stallName=name;},etag:(value:string)=>{etag=value;},reads:()=>bodyReads};
}
it('persists a bounded partial pass and resumes without fetching already verified objects',async()=>{
 const f=await fixture(),first=await f.provider.inspect(f.a,f.j,'aws-job',f.pass());expect(first.status).toBe('pending');expect(Object.keys(f.checkpoint()!.verified)).toHaveLength(128);expect(f.checkpoint()!.phase).toBe('verifying');
 const calls=mocks.s3.mock.calls.length;let result=first;
 while(result.status==='pending')result=await f.provider.inspect(f.a,f.j,'aws-job',f.pass());
 expect(result.status).toBe('complete');expect(f.checkpoint()!.phase).toBe('complete');
 expect(mocks.s3.mock.calls.slice(calls).filter(([cmd])=>cmd.input.Key?.endsWith('/master.m3u8'))).toHaveLength(0);
});
it('interruption retains verified prefix; a repeated invocation recovers the same job',async()=>{
 const f=await fixture();f.fail('master_720_00002.ts');await expect(f.provider.inspect(f.a,f.j,'aws-job',f.pass())).rejects.toThrow('interruption');
 const before=Object.keys(f.checkpoint()!.verified);expect(before).toHaveLength(4);expect(f.checkpoint()!.phase).not.toBe('complete');
 f.fail('');await f.provider.inspect(f.a,f.j,'aws-job',f.pass());expect(Object.keys(f.checkpoint()!.verified).length).toBeGreaterThan(before.length);expect(mocks.mc.mock.calls.every(([cmd])=>cmd.input.Id==='aws-job')).toBe(true);
});
it('slow body aborts within the pass deadline and never checkpoints that object',async()=>{
 const f=await fixture();f.stall('master_720_00000.ts');const started=Date.now();await expect(f.provider.inspect(f.a,f.j,'aws-job',f.pass(AbortSignal.timeout(30)))).rejects.toThrow();expect(Date.now()-started).toBeLessThan(1000);expect(Object.keys(f.checkpoint()!.verified)).toHaveLength(2);
});
it('changed output inventory fails instead of reusing evidence for different bytes',async()=>{
 const f=await fixture();await f.provider.inspect(f.a,f.j,'aws-job',f.pass());f.etag('changed-version');expect((await f.provider.inspect(f.a,f.j,'aws-job',f.pass())).status).toBe('failed');expect(f.checkpoint()!.phase).not.toBe('complete');
});
it('paginates and completes 2000 objects across bounded passes',async()=>{
 const f=await fixture(1998);let passes=0,result;
 do{result=await f.provider.inspect(f.a,f.j,'aws-job',f.pass());passes++;expect(passes).toBeLessThan(20);}while(result.status==='pending');
 expect(result.status).toBe('complete');expect(passes).toBe(16);expect(Object.keys(f.checkpoint()!.verified)).toHaveLength(2000);
 expect(mocks.s3.mock.calls.some(([c])=>c.input.ContinuationToken==='1000')).toBe(true);
},30000);
it('bounds a pass by bytes as well as object count for large segments',async()=>{
 const f=await fixture(18,Math.floor(32*1024**2/188)*188),result=await f.provider.inspect(f.a,f.j,'aws-job',f.pass());expect(result.status).toBe('pending');const verified=Object.values(f.checkpoint()!.verified);expect(verified.reduce((n,e)=>n+e.size,0)).toBeLessThanOrEqual(512*1024**2);expect(f.reads()).toBeLessThanOrEqual(18);
});
it('rejects a checkpoint belonging to a different provider job/source',async()=>{
 const f=await fixture();await f.provider.inspect(f.a,f.j,'aws-job',f.pass());const pass=f.pass();pass.checkpoint={...pass.checkpoint!,sourceVersion:'other-source'};expect((await f.provider.inspect(f.a,f.j,'aws-job',pass)).status).toBe('failed');
});
