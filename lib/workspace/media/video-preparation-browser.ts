import { RECORDING_MIMES, type PreparationEngine, type VideoInfo } from './prepare-video';
type CaptureVideo=HTMLVideoElement&{captureStream?:()=>MediaStream};
function media(file:File) { const video=document.createElement('video') as CaptureVideo;video.preload='auto';video.playsInline=true;video.muted=true;const url=URL.createObjectURL(file);video.src=url;return {video,close:()=>{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}}; }
function loaded(video:HTMLVideoElement,signal:AbortSignal) { return new Promise<void>((resolve,reject)=>{const finish=(e?:unknown)=>{clearTimeout(timer);video.removeEventListener('loadeddata',ready);video.removeEventListener('error',failed);signal.removeEventListener('abort',cancel);if(e)reject(e);else resolve();};const ready=()=>finish(),failed=()=>finish(new Error('Video cannot be decoded locally')),cancel=()=>finish(new DOMException('Cancelled','AbortError'));const timer=setTimeout(failed,10000);video.addEventListener('loadeddata',ready,{once:true});video.addEventListener('error',failed,{once:true});signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();else if(video.readyState>=2)ready();}); }
export function browserPreparationEngine():PreparationEngine {
 const nav=navigator as Navigator&{deviceMemory?:number};
 const mime=typeof MediaRecorder==='undefined'?undefined:RECORDING_MIMES.find(type=>MediaRecorder.isTypeSupported(type));
 const policy={capable:!!mime&&typeof HTMLCanvasElement.prototype.captureStream==='function'&&typeof AudioContext!=='undefined',mobile:matchMedia('(pointer: coarse)').matches,memoryGiB:nav.deviceMemory,visible:document.visibilityState==='visible'};
 return {policy,inspect:async(file,signal)=>{const {video,close}=media(file);try{await loaded(video,signal);return {duration:video.duration,width:video.videoWidth,height:video.videoHeight};}finally{close();}},encode:async(file,info:VideoInfo,signal,progress)=>{
  const {video,close}=media(file);let recorder:MediaRecorder|undefined,output:MediaStream|undefined,source:MediaStream|undefined,audio:AudioContext|undefined,frame=0;const chunks:Blob[]=[];let size=0;
  try{
   await loaded(video,signal);signal.throwIfAborted();
   const scale=Math.min(1,1280/Math.max(info.width,info.height),Math.sqrt(921600/(info.width*info.height))),canvas=document.createElement('canvas');canvas.width=Math.max(2,Math.floor(info.width*scale/2)*2);canvas.height=Math.max(2,Math.floor(info.height*scale/2)*2);const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('Canvas unavailable');
   // Native AAC encoding is capability-tested. Audio is captured independently of speaker volume.
   output=canvas.captureStream(24);context.drawImage(video,0,0,canvas.width,canvas.height);
   audio=new AudioContext();const input=audio.createMediaElementSource(video),destination=audio.createMediaStreamDestination();input.connect(destination);source=destination.stream;video.muted=false;video.volume=1;
   await Promise.race([audio.resume(),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Audio preparation unavailable')),5000))]);
   for(const track of source.getAudioTracks())output.addTrack(track);
   recorder=new MediaRecorder(output,{mimeType:mime!,videoBitsPerSecond:2_500_000,audioBitsPerSecond:128_000});
   const active=recorder;
   return await new Promise<File>((resolve,reject)=>{
    const stop=()=>{if(active.state!=='inactive')active.stop();},fail=()=>{stop();reject(new Error('Preparation exceeded safe limits.'));},cancel=()=>{stop();reject(new DOMException('Cancelled','AbortError'));};
    const timer=setTimeout(fail,(policy.mobile?60:210)*1000),visibility=()=>{if(document.visibilityState!=='visible')fail();};
    const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',visibility);video.onended=null;video.onerror=null;cancelAnimationFrame(frame);};
    active.ondataavailable=e=>{if(e.data.size){size+=e.data.size;if(size>Math.min(file.size,96*1024**2))fail();else chunks.push(e.data);}};
    active.onerror=()=>{cleanup();fail();};active.onstop=()=>{cleanup();resolve(new File(chunks,[file.name.replace(/\.mp4$/i,''),'prepared.mp4'].join('.'),{type:'video/mp4',lastModified:file.lastModified}));};
    video.onended=stop;video.onerror=fail;signal.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',visibility);
    let last=0;const draw=(time:number)=>{if(time-last>=1000/24){context.drawImage(video,0,0,canvas.width,canvas.height);last=time;progress(Math.min(99,video.currentTime/info.duration*100));}frame=requestAnimationFrame(draw);};
    active.start(1000);frame=requestAnimationFrame(draw);void video.play().catch(fail);if(signal.aborted)cancel();
   });
  }finally{cancelAnimationFrame(frame);if(recorder&&recorder.state!=='inactive')recorder.stop();source?.getTracks().forEach(t=>t.stop());output?.getTracks().forEach(t=>t.stop());await audio?.close();close();}
 }};
}
