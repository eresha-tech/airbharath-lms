'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
type NavigationEvent=Event&{canIntercept:boolean;navigationType:string;destination:{url:string;key:string};downloadRequest:string|null;hashChange:boolean};
type BrowserNavigation=EventTarget&{traverseTo:(key:string)=>unknown};
export function useStudioNavigation({dirty,active,processing,cancel,discard}:{dirty:boolean;active:boolean;processing:boolean;cancel:()=>void;discard:()=>void}) {
 const router=useRouter(),[pending,setPending]=useState<(()=>void)|null>(null),[background,setBackground]=useState(false),dialog=useRef<HTMLDialogElement>(null),previousFocus=useRef<HTMLElement|null>(null),bypass=useRef(false);
 const guarded=dirty||active||processing&&!background;
 const request=useCallback((next:()=>void)=>{if(!guarded){next();return;}previousFocus.current=document.activeElement as HTMLElement;setPending(()=>next);},[guarded]);
 useEffect(()=>{if(!processing)setBackground(false);},[processing]);
 useEffect(()=>{if(pending)dialog.current?.showModal();else{dialog.current?.close();previousFocus.current?.focus();}},[pending]);
 useEffect(()=>{
  if(!guarded)return;
  const unload=(e:BeforeUnloadEvent)=>{if(dirty||active){e.preventDefault();e.returnValue='';}};
  const click=(e:MouseEvent)=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const anchor=(e.target as Element).closest?.('a[href]') as HTMLAnchorElement|null;if(!anchor||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;const url=new URL(anchor.href,location.href);if(!['http:','https:'].includes(url.protocol)||url.href===location.href||url.pathname===location.pathname&&url.search===location.search&&url.hash)return;e.preventDefault();e.stopPropagation();request(()=>{bypass.current=true;if(url.origin===location.origin)router.push(url.pathname+url.search+url.hash);else location.assign(url.href);});};
  const navigation=(window as Window&{navigation?:BrowserNavigation}).navigation;
  const navigate=(raw:Event)=>{const e=raw as NavigationEvent;if(bypass.current){bypass.current=false;return;}if(!e.canIntercept||e.downloadRequest!==null||e.hashChange||e.navigationType==='replace'&&e.destination.url===location.href)return;e.preventDefault();request(()=>{bypass.current=true;if(e.navigationType==='traverse')navigation?.traverseTo(e.destination.key);else location.assign(e.destination.url);});};
  document.addEventListener('click',click,true);window.addEventListener('beforeunload',unload);navigation?.addEventListener('navigate',navigate);
  return()=>{document.removeEventListener('click',click,true);window.removeEventListener('beforeunload',unload);navigation?.removeEventListener('navigate',navigate);};
 },[guarded,dirty,active,request,router]);
 const protection=<dialog ref={dialog} onCancel={e=>{e.preventDefault();setPending(null);}} aria-labelledby="studio-leave-title" className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/40"><ShieldAlert className="size-8 text-primary" aria-hidden/><h2 id="studio-leave-title" className="mt-4 font-outfit text-xl font-semibold">{active?'Leave this upload?':dirty?'Leave unsaved changes?':'Continue processing in the background?'}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{active?'Leaving cancels local preparation or transfer. Saved content and the previous video are retained. You may need to reselect the exact upload file and restart the full transfer.':dirty?'You have unsaved changes. Stay here to save them, or discard them before leaving.':'Your uploaded video is processing securely on the server. You can leave and return to its saved status.'}</p><div className="mt-5 flex flex-wrap gap-3"><button autoFocus type="button" className="min-h-11 rounded-xl border border-border px-4 text-sm" onClick={()=>setPending(null)}>Stay here</button><button type="button" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={()=>{const next=pending;if(active)cancel();if(dirty)discard();setBackground(true);setPending(null);next?.();}}>{active?'Cancel operation and leave':dirty?'Discard changes and leave':'Continue in background'}</button></div></dialog>;
 return {request,protection,continueInBackground:()=>setBackground(true)};
}
