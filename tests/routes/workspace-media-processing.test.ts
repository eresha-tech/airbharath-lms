import { describe, expect, it } from 'vitest';
import { mediaProcessing, type MediaProcessor } from '@/lib/workspace/media/processing';
import { uploadFixture } from './workspace-media-upload-fixtures';
const manifest = { 'master.m3u8': {version:'m-v1',checksum:'a'.repeat(64),size:100}, 'master_720.m3u8':{version:'p-v1',checksum:'b'.repeat(64),size:100}, 'master_72000001.ts':{version:'s-v1',checksum:'c'.repeat(64),size:188} };
async function fixture() {
  const f = uploadFixture(), {asset} = await f.reserve(); await f.uploads.finalize(f.owner,asset.id,{});
  const state = { dispatches:0, inspections:0, failure:false, status:'complete' as 'complete'|'pending'|'failed', onInspect:async()=>{} };
  const provider: MediaProcessor = { dispatch:async()=>{ state.dispatches++; if(state.failure) throw new Error('network'); return 'provider-123'; }, inspect:async()=>{ state.inspections++; await state.onInspect(); return state.status==='complete' ? {status:'complete',manifest} : {status:state.status}; } };
  const service = mediaProcessing(f.store,'test',()=>f.state.clock,provider);
  return {...f,asset,stateProcessing:state,service};
}
describe('private durable processing',()=>{
  it('persists one outbox before dispatch and remains unplayable until completion',async()=>{
    const f=await fixture(); await Promise.all([f.service.request(f.owner,f.asset.id,{}),f.service.request(f.owner,f.asset.id,{})]);
    expect(f.state.jobs).toHaveLength(1); expect(f.state.rows[0]).toMatchObject({status:'processing',isAttached:false,outputKey:null}); expect(f.stateProcessing.dispatches).toBe(0);
    await Promise.all([f.service.dispatch(f.owner,f.asset.id),f.service.dispatch(f.owner,f.asset.id)]); expect(f.stateProcessing.dispatches).toBe(1);
    f.stateProcessing.status='pending'; await f.service.reconcile(f.owner,f.asset.id); expect(f.state.rows[0].status).toBe('processing');
    f.stateProcessing.status='complete'; await f.service.reconcile(f.owner,f.asset.id); expect(f.state.rows[0]).toMatchObject({status:'ready',isAttached:false,outputVersionId:'m-v1'});
    const revision=f.state.lesson.mediaRevision; await f.service.reconcile(f.owner,f.asset.id); expect(f.state.lesson.mediaRevision).toBe(revision);
  });
  it('does not duplicate uncertain dispatch and recovers exact identity through callback',async()=>{
    const f=await fixture(); await f.service.request(f.owner,f.asset.id,{}); f.stateProcessing.failure=true;
    await expect(f.service.dispatch(f.owner,f.asset.id)).rejects.toThrow('unavailable'); expect(f.state.jobs[0].state).toBe('uncertain');
    await f.service.dispatch(f.owner,f.asset.id); expect(f.stateProcessing.dispatches).toBe(1);
    await f.service.reconcile(f.owner,f.asset.id,'provider-123'); expect(f.state.rows[0].status).toBe('ready');
  });
  it('rejects wrong callback identity and preserves failure without selecting it',async()=>{
    const f=await fixture(); await f.service.request(f.owner,f.asset.id,{}); await f.service.dispatch(f.owner,f.asset.id);
    await expect(f.service.reconcile(f.owner,f.asset.id,'other-job')).rejects.toThrow('conflict'); expect(f.stateProcessing.inspections).toBe(0);
    f.stateProcessing.status='failed'; await f.service.reconcile(f.owner,f.asset.id); expect(f.state.rows[0]).toMatchObject({status:'failed',isAttached:false});
    f.stateProcessing.status='complete'; await f.service.reconcile(f.owner,f.asset.id,'provider-123'); expect(f.state.rows[0].status).toBe('failed');
  });
  it('cannot revive a canceled upload during provider work',async()=>{
    const f=await fixture(); await f.service.request(f.owner,f.asset.id,{}); await f.service.dispatch(f.owner,f.asset.id);
    f.stateProcessing.onInspect=async()=>{await f.mutate(f.asset.id,'detach');}; await f.service.reconcile(f.owner,f.asset.id); expect(f.state.rows[0].status).toBe('detached'); expect(f.state.jobs[0].state).toBe('submitted');
  });
  it('rechecks revocation after provider work and denies other owners',async()=>{
    const f=await fixture(); await expect(f.service.request(f.other,f.asset.id,{})).rejects.toThrow(); await f.service.request(f.owner,f.asset.id,{}); await f.service.dispatch(f.owner,f.asset.id);
    f.stateProcessing.onInspect=async()=>{f.state.context.evidence!.profileStatus='suspended';}; await expect(f.service.reconcile(f.owner,f.asset.id)).rejects.toThrow('forbidden'); expect(f.state.rows[0].status).toBe('processing');
  });
  it('does not start raw or unconfigured video processing',async()=>{
    const f=uploadFixture(), {asset}=await f.reserve(); const service=mediaProcessing(f.store,'test',()=>f.state.clock,{dispatch:async()=>'',inspect:async()=>({status:'pending'})});
    await expect(service.request(f.owner,asset.id,{})).rejects.toThrow('not_ready'); await expect(service.request(f.owner,asset.id,{status:'ready'})).rejects.toThrow('validation');
    await expect(mediaProcessing(f.store,'test').request(f.owner,asset.id,{})).rejects.toThrow('unavailable');
  });
});
it('uploads verified plain captions bound to the selected source without exposing its version',async()=>{
 const f=await fixture();await f.service.request(f.owner,f.asset.id,{});await f.service.dispatch(f.owner,f.asset.id);await f.service.reconcile(f.owner,f.asset.id);await f.mutate(f.asset.id,'attach');
 const bytes=new TextEncoder().encode('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nPrivate cue\n');
 const command={filename:'en.vtt',byteSize:bytes.length,language:'en',requestKey:crypto.randomUUID(),expectedMediaRevision:f.state.lesson.mediaRevision};
 await expect(f.uploads.captionIntent(f.owner,f.asset.id,{...command,captionSourceVersion:'forged'})).rejects.toThrow('validation');
 const {asset}=await f.uploads.captionIntent(f.owner,f.asset.id,command);
 expect(asset).not.toHaveProperty('captionSourceVersion');expect(f.state.rows.find(a=>a.id===asset.id)?.captionSourceVersion).toBe('source-v1');
 f.state.object={versionId:'caption-version',checksum:(await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'),prefix:bytes,bytes};
 await f.uploads.finalize(f.owner,asset.id,{});await f.mutate(asset.id,'attach');expect(f.state.rows.find(a=>a.id===asset.id)?.isAttached).toBe(true);
 await f.mutate(f.asset.id,'detach');expect(f.state.rows.find(a=>a.id===asset.id)?.status).toBe('detached');
});

it('finishes a previously verified video after membership expiry while new uploads remain blocked',async()=>{const f=await fixture();await f.service.request(f.owner,f.asset.id,{});f.state.clock=new Date(f.state.context.evidence!.membership.endsAt.getTime()+1);await f.service.dispatch(f.owner,f.asset.id);await f.service.reconcile(f.owner,f.asset.id);expect(f.state.rows[0].status).toBe('ready');await expect(f.reserve()).rejects.toThrow('forbidden');});
it('does not make a queued intent uncertain merely because provider configuration is absent',async()=>{const f=await fixture();await f.service.request(f.owner,f.asset.id,{});await expect(mediaProcessing(f.store,'test',()=>f.state.clock).dispatch(f.owner,f.asset.id)).rejects.toThrow('unavailable');expect(f.state.jobs[0].state).toBe('queued');});
