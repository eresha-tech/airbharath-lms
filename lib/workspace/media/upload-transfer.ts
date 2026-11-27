export type TransferProgress={loaded:number;total:number;percent:number;bytesPerSecond?:number};
export function putPrivateFile(url:string,headers:Record<string,string>,file:File,signal:AbortSignal,progress:(p:TransferProgress)=>void) {
 return new Promise<void>((resolve,reject)=>{
  const xhr=new XMLHttpRequest(),started=performance.now();let settled=false;
  const finish=(error?:Error)=>{if(settled)return;settled=true;signal.removeEventListener('abort',cancel);if(error)reject(error);else resolve();};
  const cancel=()=>{xhr.abort();finish(new DOMException('Upload cancelled. Retry finalization or reselect the same upload file to restart the full transfer.','AbortError'));};
  xhr.open('PUT',url);xhr.timeout=600000;for(const [key,value]of Object.entries(headers))xhr.setRequestHeader(key,value);
  xhr.upload.onprogress=e=>{if(e.lengthComputable){const seconds=(performance.now()-started)/1000;progress({loaded:e.loaded,total:e.total,percent:e.loaded/e.total*100,...(seconds>=1?{bytesPerSecond:e.loaded/seconds}:{})});}};
  xhr.onload=()=>finish(xhr.status>=200&&xhr.status<300||xhr.status===412?undefined:new Error('Upload was rejected. Retry finalization first; otherwise reselect the same upload file.'));
  xhr.onerror=xhr.ontimeout=()=>finish(new Error('Connection interrupted. Retry finalization first; otherwise restart the full transfer with the same file.'));
  signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();else xhr.send(file);
 });
}
