'use client';
import { AlertCircle, CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
export type UploadStage = 'validating' | 'preparing' | 'uploading' | 'verifying' | 'processing' | 'ready' | 'verified' | 'failed' | 'cancelled' | 'recoverable';
const labels: Record<UploadStage,string> = {validating:'Validating file',preparing:'Preparing smaller video',uploading:'Uploading privately',verifying:'Verifying uploaded file',processing:'Processing video',ready:'Ready for playback',verified:'Upload verified',failed:'Action needed',cancelled:'Cancelled · recoverable',recoverable:'Incomplete upload · recovery available'};
export function formatBytes(bytes:number) { if(bytes<1024)return `${bytes} B`; const unit=bytes<1024**2?'KiB':bytes<1024**3?'MiB':'GiB';return `${(bytes/(unit==='KiB'?1024:unit==='MiB'?1024**2:1024**3)).toFixed(1)} ${unit}`; }
export function UploadStatus({stage,title,detail,progress,loaded,total,speed,children}:{stage:UploadStage;title?:string;detail?:string;progress?:number;loaded?:number;total?:number;speed?:number;children?:ReactNode}) {
 const determinate=['validating','preparing','uploading'].includes(stage)&&progress!==undefined;
 const active=['validating','preparing','uploading','verifying','processing'].includes(stage);
 const Icon=stage==='failed'||stage==='recoverable'?AlertCircle:stage==='cancelled'?XCircle:['ready','verified'].includes(stage)?CheckCircle2:stage==='uploading'?UploadCloud:Loader2;
 return <div className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${stage==='processing'?'border-primary/35 bg-primary/5 ring-1 ring-primary/10':'border-border/80 bg-card'}`} role={stage==='failed'?'alert':'status'} aria-live="polite">
  <div className="flex items-start gap-3"><div className={`rounded-xl p-2 ${stage==='failed'?'bg-destructive/10 text-destructive':'bg-primary/10 text-primary'}`}><Icon aria-hidden className={`size-5 ${['validating','preparing','verifying','processing'].includes(stage)?'animate-spin motion-reduce:animate-none':''}`} /></div><div className="min-w-0 flex-1"><p className="font-outfit text-sm font-semibold">{labels[stage]}</p>{title&&<p className="mt-1 break-words text-xs text-muted-foreground">{title}</p>}</div>{determinate&&<span className="text-sm font-semibold tabular-nums text-primary">{Math.round(progress!)}%</span>}</div>
  {determinate&&<progress value={progress} max={100} aria-label={`${labels[stage]} progress`} className="mt-4 h-2 w-full accent-primary" />}
  {!determinate&&active&&<div className="mt-4 overflow-hidden rounded-full bg-primary/15"><progress aria-label={`${labels[stage]} progress`} className="h-2.5 w-full accent-primary motion-safe:animate-pulse"/></div>}
  {stage==='processing'&&<p className="mt-3 text-sm font-medium text-primary">Preparing secure playback · processing continues if you leave this page.</p>}
  {loaded!==undefined&&total!==undefined&&<p className="mt-2 text-xs tabular-nums text-muted-foreground">{formatBytes(loaded)} / {formatBytes(total)}{speed&&speed>0?` · ${formatBytes(speed)}/s`:''}</p>}
  {detail&&<p className="mt-3 text-xs leading-6 text-muted-foreground">{detail}</p>}{children&&<div className="mt-4 flex flex-wrap gap-2">{children}</div>}
 </div>;
}
export function FileDropzone({disabled,onFiles,onChoose,children}:{disabled:boolean;onFiles:(files:FileList)=>void;onChoose:()=>void;children:ReactNode}) {
 return <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!disabled)onFiles(e.dataTransfer.files);}} className={`rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center transition-colors sm:p-7 ${disabled?'opacity-60':'hover:border-primary/60 hover:bg-primary/10'}`}><UploadCloud className="mx-auto size-8 text-primary" aria-hidden /><div className="my-3 text-sm leading-6">{children}</div><button type="button" disabled={disabled} onClick={onChoose} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">Choose file</button><p className="mt-2 text-xs text-muted-foreground">or drag one file here</p></div>;
}
