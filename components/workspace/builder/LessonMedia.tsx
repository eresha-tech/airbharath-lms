'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileVideo, Paperclip, Subtitles } from 'lucide-react';
import { FileDropzone, UploadStatus, formatBytes, type UploadStage } from '@/components/media/UploadStatus';
import { prepareVideo, type PreparedVideo } from '@/lib/workspace/media/prepare-video';
import { putPrivateFile, type TransferProgress } from '@/lib/workspace/media/upload-transfer';
import { lessonReadiness } from '@/lib/workspace/builder/readiness';
import { fileChecksum } from '@/lib/workspace/media/file-checksum';
import { MAX_VIDEO_BYTES, MAX_RESOURCE_BYTES, MAX_CAPTION_BYTES, RESOURCE_TYPES } from '@/lib/workspace/media/model';
import { LessonPreview, type StudioAsset } from './Preview';
import type { lessonReceipt } from '@/lib/workspace/builder/service';
const control = 'min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40';
const field = 'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm';
type SavedLesson = ReturnType<typeof lessonReceipt>;
async function json(url: string, method = 'GET', command?: unknown) {
  const response = await fetch(url, { method, cache: 'no-store', signal: AbortSignal.timeout(20000), ...(command === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) }) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error || 'This private media request could not complete. Reload and retry.'); return body;
}
export function LessonMedia({ lesson, projectId, editable, admin, dirty, onChanged, onBusy, onOperation, onProcessing, previewOnly = false }: { lesson: SavedLesson; projectId: string; editable: boolean; admin: boolean; dirty: boolean; onChanged: () => Promise<void>; onBusy: (busy: boolean) => void; onOperation?: (cancel:(()=>void)|null)=>void; onProcessing?: (processing:boolean)=>void; previewOnly?: boolean }) {
  const [assets,setAssets] = useState<StudioAsset[]>([]), [revision,setRevision] = useState(lesson.mediaRevision), [loaded,setLoaded] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [status,setStatus] = useState(''), [progress,setProgress] = useState<number | null>(null), [language,setLanguage] = useState('en');
  const [stage,setStage]=useState<UploadStage|null>(null),[transfer,setTransfer]=useState<TransferProgress|null>(null),[prepared,setPrepared]=useState<PreparedVideo|null>(null);
  const retryFile=useRef<File|null>(null), reservation=useRef<{key:string;filename:string;size:number;kind:string;revision:number}|null>(null);
  const [showPreview,setShowPreview] = useState(previewOnly), [kind,setKind] = useState<'video'|'resource'|'caption'>('video'), [resume,setResume] = useState<StudioAsset | null>(null);
  const mounted=useRef(true),watched=useRef<string|null>(null);
  const fileInput = useRef<HTMLInputElement>(null), abort = useRef<AbortController | null>(null), working = useRef(false), currentRevision = useRef(lesson.mediaRevision);
  const base = useCallback((id: string) => admin ? `/api/admin/workspace/course-builds/${projectId}/media/${id}` : `/api/workspace/media/${id}`, [admin, projectId]);
  const collection = admin ? `/api/admin/workspace/course-builds/${projectId}/media` : '/api/workspace/media';
  const load = useCallback(async () => {
    const body = await json(`${collection}?lessonId=${lesson.id}`); if(!mounted.current)return;setAssets(body.assets);const tracked=body.assets.find((a:StudioAsset)=>a.id===watched.current);if(tracked?.status==='ready'){setStage('ready');setStatus('Your video is ready. Choose Use this video below to add it to the lesson.');watched.current=null;}else if(tracked?.status==='failed'){setStage('failed');setError('Video processing could not finish. Your current video is unchanged. Upload a new file to retry safely.');watched.current=null;} const next = body.mediaRevision ?? lesson.mediaRevision; setRevision(next); setLoaded(true);
    if (currentRevision.current !== next) { currentRevision.current = next; await onChanged(); }
  }, [collection,lesson.id,lesson.mediaRevision,onChanged]);
  useEffect(() => { let live = true; void load().catch(e => { if(live) setError(e.message); }); const timer = setInterval(() => { if(!working.current) void load().catch(e => { if(live) setError(e.message); }); }, 5000); return () => { live = false; clearInterval(timer); }; }, [load]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();};},[]);
  useEffect(()=>{onOperation?.(busy?()=>abort.current?.abort():null);},[busy,onOperation]);
  const processing=assets.some(a=>a.status==='processing');
  useEffect(()=>{onProcessing?.(processing);return()=>onProcessing?.(false);},[processing,onProcessing]);
  const video = assets.find(a => a.assetKind === 'video' && a.isAttached);
  const disabled = !editable || dirty || busy || !loaded;
  async function work(action: () => Promise<void>) {
    if(working.current) return; working.current = true; setBusy(true); onBusy(true); setError('');
    try { await action(); } catch(e) { setStatus(''); setStage(e instanceof Error&&e.name==='AbortError'?'cancelled':'failed');setError(e instanceof Error ? e.message : 'Media request failed. Reload and retry.'); }
    finally { try { if(mounted.current)await load(); } catch { if(mounted.current)setError('Could not refresh saved media. Reload before editing.'); } working.current=false;if(mounted.current){setBusy(false);onBusy(false);setProgress(null);} }
  }
  async function mutation(a: StudioAsset, action: string, extra = {}) {
    if(disabled) return;
    if(action === 'detach' && !window.confirm(`Detach ${a.displayName}? Its history will be retained.`)) return;
    await work(async () => { await json(base(a.id),'PATCH',{ action, expectedVersion:a.version, expectedMediaRevision:revision, ...extra }); setStatus('Saved media updated.'); });
  }
  async function upload(file: File, fresh = false) {
    if(disabled) return;
    await work(async () => {
      const recovered=fresh?null:resume;
      const assetKind = recovered?.assetKind || kind;
      abort.current=new AbortController();const signal=abort.current.signal;setStage('validating');setTransfer(null);setProgress(null);setError('');
      let selected=file;
      if(assetKind==='video'&&!recovered){
        setPrepared(null);setProgress(null);
        const result=await prepareVideo(file,signal,n=>{setStage('preparing');setProgress(n);});setPrepared(result);selected=result.file;
      }
      const ext=selected.name.split('.').at(-1)?.toLowerCase()||'';
      const mimeType=assetKind==='video'?ext==='mp4'?'video/mp4':'':assetKind==='caption'?ext==='vtt'?'text/vtt':'':RESOURCE_TYPES[ext];
      const limit=assetKind==='video'?MAX_VIDEO_BYTES:assetKind==='caption'?MAX_CAPTION_BYTES:MAX_RESOURCE_BYTES;
      if(!mimeType||selected.size<1||selected.size>limit)throw new Error('Choose MP4 up to 2 GiB, PDF/PNG/JPEG up to 20 MiB, or plain WebVTT up to 1 MiB.');
      if(recovered&&(recovered.displayName!==selected.name||recovered.byteSize!==selected.size||recovered.mimeType!==mimeType))throw new Error('Reselect the exact upload file, including its prepared filename and bytes. The full transfer restarts; byte-range resume is not supported.');
      if(recovered&&new Date(recovered.expiresAt).getTime()<=Date.now())throw new Error('This upload intent has expired. Choose the file as a new upload. The previous selected video is unchanged.');
      retryFile.current=selected;setStage('validating');setStatus('Checking the final upload bytes…');setProgress(0);
      // Authorization is always calculated AFTER preparation, over exactly the bytes sent.
      const checksumSHA256=await fileChecksum(selected,signal,setProgress);signal.throwIfAborted();
      let id=recovered?.id;
      if(!id){
        const prior=reservation.current;
        if(!prior||prior.filename!==selected.name||prior.size!==selected.size||prior.kind!==assetKind)reservation.current={key:crypto.randomUUID(),filename:selected.name,size:selected.size,kind:assetKind,revision};
        const request=reservation.current!;
        const receipt=assetKind==='caption'?await json(`${base(video!.id)}/captions`,'POST',{filename:selected.name,byteSize:selected.size,language,requestKey:request.key,expectedMediaRevision:request.revision}):await json('/api/workspace/media','POST',{lessonId:lesson.id,assetKind,filename:selected.name,mimeType,byteSize:selected.size,requestKey:request.key,expectedMediaRevision:request.revision,...(assetKind==='video'&&video?{replacesAssetId:video.id}:{})});
        id=receipt.asset.id;setResume(receipt.asset);
      }
      signal.throwIfAborted();const {upload:authorization}=await json(`${base(id!)}/upload`,'POST',{checksumSHA256});signal.throwIfAborted();
      setStage('uploading');setStatus('Uploading privately…');setProgress(null);
      await putPrivateFile(authorization.url,authorization.headers,selected,signal,setTransfer);
      setStage('verifying');setProgress(null);setTransfer(null);setStatus('Verifying size, identity and checksum…');
      const finalized=await json(`${base(id!)}/finalize`,'POST',{});if(assetKind==='video')watched.current=id!;
      setResume(null);reservation.current=null;setStage(assetKind==='video'?'processing':'verified');setStatus(assetKind==='video'?'Upload checked. Video processing is queued automatically; you can leave and return. Your current video stays selected.':'Upload complete. Add it to the lesson below.');if(finalized.asset.status==='ready')setStage('ready');

    });
  }
  const resources = assets.filter(a => a.assetKind === 'resource' && a.isAttached).sort((a,b) => a.resourcePosition! - b.resourcePosition!);
  const pending = assets.filter(a => a.status !== 'detached' && !a.isAttached && (!busy || resume?.id !== a.id));
  return <section className="ph-no-capture mt-8 space-y-6 border-t border-border pt-8" aria-label="Lesson media" aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-primary">Lesson files</p><h3 className="mt-2 font-outfit text-2xl">Lesson media</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Video, supporting resources and captions stay private while you build.</p></div><button type="button" className={control} disabled={busy || !loaded} onClick={() => setShowPreview(v => !v)}>{showPreview ? 'Close preview' : 'Preview saved lesson'}</button></div>
    {error&&!stage&&<p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    {!loaded&&<p role="status" className="text-sm text-muted-foreground">Loading your saved lesson files. Uploads will be available in a moment.</p>}
    {dirty&&<p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">Save or cancel your text changes before changing media. Your saved preview stays separate.</p>}
    {stage&&<UploadStatus stage={stage} detail={error||status} progress={transfer?.percent??progress??undefined} loaded={transfer?.loaded} total={transfer?.total} speed={transfer?.bytesPerSecond}>
      {busy&&<button type="button" className={control} onClick={()=>abort.current?.abort()}>Cancel file transfer</button>}
      {!busy&&resume&&retryFile.current&&<button type="button" className={control} disabled={disabled} onClick={()=>void upload(retryFile.current!)}>Retry same upload file</button>}
    </UploadStatus>}
    {prepared&&<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-6"><p className="font-semibold">{prepared.compressed?'Smaller upload prepared':'Original video selected'}</p><p>Original {formatBytes(prepared.originalSize)} · Upload {formatBytes(prepared.uploadSize)}{prepared.compressed?` · ${Math.round((1-prepared.uploadSize/prepared.originalSize)*100)}% smaller`:''}</p><p className="text-muted-foreground">{prepared.reason}</p>{prepared.compressed&&<button type="button" className={`${control} mt-2`} onClick={()=>{const url=URL.createObjectURL(prepared.file),a=document.createElement('a');a.href=url;a.download=prepared.file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Save prepared file for recovery</button>}</div>}
    {editable&&!previewOnly&&<div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Add media<select value={kind} disabled={disabled} onChange={e=>{setKind(e.target.value as typeof kind);setResume(null);setStage(null);setPrepared(null);reservation.current=null;}} className={`${field} mt-2`}><option value="video">{video?'Replace selected video':'Video · MP4'}</option><option value="resource">Resource · PDF / PNG / JPEG</option><option value="caption" disabled={!video}>Captions · WebVTT</option></select></label>{kind==='caption'&&<label className="text-xs font-semibold">Caption language<input value={language} disabled={disabled} onChange={e=>setLanguage(e.target.value)} pattern="[a-z]{2,3}(-[A-Z]{2})?" maxLength={6} className={`${field} mt-2`} /></label>}</div>
      <FileDropzone disabled={disabled||kind==='caption'&&!video} onChoose={()=>{setResume(null);reservation.current=null;fileInput.current?.click();}} onFiles={files=>{if(files.length!==1){setError('Choose one file at a time.');setStage('failed');return;}setResume(null);reservation.current=null;void upload(files[0],true);}}><span className="inline-flex items-center gap-2 font-outfit font-semibold">{kind==='video'?<FileVideo className="size-4" aria-hidden/>:kind==='caption'?<Subtitles className="size-4" aria-hidden/>:<Paperclip className="size-4" aria-hidden/>}{kind==='video'?'Upload a lesson video':kind==='caption'?'Add plain-text captions':'Add a lesson resource'}</span><p className="mt-1 text-xs text-muted-foreground">{kind==='video'?'MP4 · up to 2 GiB. Smaller files are prepared automatically when beneficial.':kind==='caption'?'WebVTT · up to 1 MiB · selected video required':'PDF, PNG or JPEG · up to 20 MiB each · 10 resources'}</p></FileDropzone>
      <input ref={fileInput} disabled={disabled||kind==='caption'&&!video} type="file" className="sr-only" tabIndex={-1} aria-label="Choose private lesson file" accept={resume?undefined:kind==='video'?'.mp4':kind==='caption'?'.vtt':'.pdf,.png,.jpg,.jpeg'} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}} />
    </div>}
    <section><h4 className="font-outfit text-lg">Selected video</h4>{video ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><p className="min-w-0 break-all text-sm">{video.displayName} <span className="ml-2 text-xs text-primary">Ready · Version {video.replacementVersion}</span></p>{editable && !previewOnly && <button type="button" className={control} disabled={disabled} onClick={() => void mutation(video,'detach')}>Detach video</button>}</div> : <p className="mt-2 text-sm text-muted-foreground">No playable video selected.</p>}</section>
    {resources.length > 0 && <section><h4 className="font-outfit text-lg">Resources · {resources.length}/10</h4><ol className="mt-3 divide-y divide-border rounded-lg border border-border">{resources.map((a,i) => <li key={a.id} className="flex flex-wrap items-center gap-2 p-3"><span className="mr-1 text-xs tabular-nums text-muted-foreground">{String(i+1).padStart(2,'0')}</span><a className="w-full break-words text-sm text-primary underline sm:min-w-0 sm:w-auto sm:flex-1" href={`${base(a.id)}/access`} download>{a.displayName}</a>{editable && !previewOnly && <><button type="button" className={control} disabled={disabled} onClick={() => { const name = window.prompt('Resource display name',a.displayName); if(name !== null) void mutation(a,'rename',{displayName:name}); }}>Rename</button><button type="button" className={control} aria-label={`Move ${a.displayName} up`} disabled={disabled || i === 0} onClick={() => void mutation(a,'move',{direction:'up'})}>↑</button><button type="button" className={control} aria-label={`Move ${a.displayName} down`} disabled={disabled || i === resources.length-1} onClick={() => void mutation(a,'move',{direction:'down'})}>↓</button><button type="button" className={control} disabled={disabled} onClick={() => void mutation(a,'detach')}>Detach</button></>}</li>)}</ol></section>}
    {assets.filter(a => a.assetKind === 'caption' && a.isAttached).map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><p className="text-sm">Caption · {a.language} · {a.displayName}</p>{editable && !previewOnly && <button type="button" className={control} disabled={disabled} onClick={() => void mutation(a,'detach')}>Detach caption</button>}</div>)}
    {pending.length > 0 && <section><h4 className="font-outfit text-lg">Uploads and processing</h4><ul className="mt-3 space-y-3">{pending.map(a => <li key={a.id} className="rounded-lg border border-border p-4"><UploadStatus stage={a.processingState==='uncertain'?'recoverable':a.status==='processing'?'processing':a.status==='ready'?(a.assetKind==='video'?'ready':'verified'):a.status==='verified'?'verified':a.status==='failed'?'failed':a.status==='uploaded'?'verifying':'recoverable'} title={a.displayName} detail={a.processingState==='uncertain'?'Processing needs a status check. Your file and current video are safe. Contact Admin before retrying this job; you can cancel this upload and choose a new file.':a.processingState==='queued'?'Upload checked and queued securely. Processing starts automatically, even if you leave.':a.status==='pending_upload'?'Incomplete upload. Retry finalization or reselect the exact upload file; the full transfer restarts.':a.status==='verified'?'This upload needs recovery. Retry processing to prepare private playback.':a.status==='ready'?'Ready to use. Add this upload to your lesson when you are happy with it.':a.status==='failed'?'This upload could not be processed. Your previous video remains selected. Create a new upload.':undefined}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="break-all text-sm font-medium">{a.displayName}</p><p className="mt-1 text-xs text-muted-foreground">{a.assetKind} · {formatBytes(a.byteSize)}</p></div>{editable && !previewOnly && <div className="flex flex-wrap gap-2">
      {a.status === 'pending_upload' && <button type="button" className={control} disabled={disabled} onClick={() => { setResume(a); fileInput.current?.click(); }}>Resume same file</button>}
      {['pending_upload','uploaded'].includes(a.status) && <button type="button" className={control} disabled={disabled} onClick={() => void work(async () => { await json(`${base(a.id)}/finalize`,'POST',{}); setStatus('Finalization complete.'); })}>Retry finalization</button>}
      {a.assetKind === 'video' && a.status === 'verified' && <button type="button" className={control} disabled={disabled} onClick={() => void work(async () => { await json(`${base(a.id)}/process`,'POST',{}); setStatus('Processing queued. This page refreshes saved status automatically.'); })}>Retry processing</button>}
      {a.status === 'ready' && <button type="button" className={control} disabled={disabled} onClick={() => void mutation(a,'attach')}>{a.assetKind === 'video' ? video?'Replace lesson video':'Use this video' : 'Attach to lesson'}</button>}
      <button type="button" className={control} disabled={disabled} onClick={() => void mutation(a,'detach')}>{a.status === 'failed' ? 'Dismiss failed upload' : 'Cancel / detach'}</button></div>}</div></UploadStatus>{a.status === 'processing' && <p className="mt-3 text-xs leading-6 text-muted-foreground">Processing continues on the server if you leave. Return to this lesson to see its status. Your previous video stays selected until you choose the new ready video.</p>}</li>)}</ul></section>}
    {!loaded && <button type="button" className={control} onClick={() => void load().catch(e => setError(e.message))}>Load saved media</button>}
    {loaded && <aside className="rounded-lg border border-border p-4"><h4 className="text-sm font-semibold">Ready to continue?</h4>{lessonReadiness(lesson,assets).length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-muted-foreground">{lessonReadiness(lesson,assets).map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className="mt-2 text-xs leading-6 text-muted-foreground">Saved lesson content is ready for your review. Next, preview your course and submit it for approval. Your price needs separate Admin approval.</p>}</aside>}
    {showPreview && <div className="rounded-xl border border-border bg-background p-5 sm:p-8"><LessonPreview lesson={lesson} assets={assets} base={base} /></div>}
  </section>;
}
