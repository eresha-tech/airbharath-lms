// Client-only orchestration. Native browser encoding is asynchronous; no WASM or dependency download.
export type VideoInfo={duration:number;width:number;height:number};
export type PreparationPolicy={capable:boolean;mobile:boolean;memoryGiB?:number;visible:boolean};
export type PreparedVideo={file:File;original:File;compressed:boolean;reason:string;originalSize:number;uploadSize:number};
export const RECORDING_MIMES=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2'] as const;
export async function compatibleMp4(file:Blob) { const b=new Uint8Array(await file.slice(0,16).arrayBuffer()),text=(a:number,z:number)=>new TextDecoder().decode(b.slice(a,z));return b.length>=16&&text(4,8)==='ftyp'&&/^(isom|iso[2-6]|mp4[12]|avc1|M4V )$/.test(text(8,12)); }
export function preparationDecision(size:number,info:VideoInfo,policy:PreparationPolicy) {
 if(!policy.capable)return 'This browser cannot safely prepare H.264/AAC MP4. Using the original MP4.';
 if(!policy.visible)return 'Keep the tab visible for local preparation. Using the original MP4.';
 if(size<24*1024**2)return 'This file is already small. Using the original MP4.';
 if(size>(policy.mobile?64:256)*1024**2||policy.memoryGiB!==undefined&&policy.memoryGiB<4)return 'Local preparation would use too many resources. Using the original MP4.';
 if(!Number.isFinite(info.duration)||info.duration<=0||info.duration>(policy.mobile?45:180)||info.width*info.height>8_294_400)return 'This video exceeds safe local preparation limits. Using the original MP4.';
 if((2_500_000+128_000)*info.duration/8>size*.8)return 'This video is already efficient. Using the original MP4.';
 return null;
}
export function compatiblePreparation(before:VideoInfo,after:VideoInfo,originalSize:number,preparedSize:number) {
 return preparedSize>0&&preparedSize<=originalSize*.8&&Math.abs(after.duration-before.duration)<=Math.max(.5,before.duration*.02)&&Math.abs(after.width/after.height-before.width/before.height)<.025&&after.width>0&&after.height>0;
}
export type PreparationEngine={policy:PreparationPolicy;inspect:(file:File,signal:AbortSignal)=>Promise<VideoInfo>;encode:(file:File,info:VideoInfo,signal:AbortSignal,progress:(n:number)=>void)=>Promise<File>};
export async function prepareVideo(original:File,signal:AbortSignal,progress:(n:number)=>void,engine?:PreparationEngine):Promise<PreparedVideo> {
 signal.throwIfAborted();
 if(!await compatibleMp4(original))throw new Error('Choose an MP4 video with a supported MP4 container. MOV, WebM and renamed files are not accepted. Export H.264/AAC MP4 and try again.');
 const fallback=(reason:string):PreparedVideo=>({file:original,original,compressed:false,reason,originalSize:original.size,uploadSize:original.size});
 const e=engine??(await import('./video-preparation-browser')).browserPreparationEngine();
 // Do not decode a multi-GiB file simply to decide not to compress it.
 if(!e.policy.capable||original.size<24*1024**2||original.size>(e.policy.mobile?64:256)*1024**2)return fallback(preparationDecision(original.size,{duration:Infinity,width:0,height:0},e.policy)!);
 try {
  const before=await e.inspect(original,signal),reason=preparationDecision(original.size,before,e.policy);if(reason)return fallback(reason);
  progress(0);const file=await e.encode(original,before,signal,progress);signal.throwIfAborted();
  if(!await compatibleMp4(file)||!compatiblePreparation(before,await e.inspect(file,signal),original.size,file.size))return fallback('Preparation did not produce a compatible file with at least 20% savings. Using the original MP4.');
  return {file,original,compressed:true,reason:'Prepared H.264/AAC MP4. Original retained until you finish this upload.',originalSize:original.size,uploadSize:file.size};
 }catch(error){if(signal.aborted)throw error;return fallback('Local preparation could not finish safely. Using the original MP4.');}
}
