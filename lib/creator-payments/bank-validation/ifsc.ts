import 'server-only';
import {IFSC} from './model';
export async function lookupIFSC(code:string,transport:typeof fetch=fetch) {
 if(!IFSC.test(code))return {status:'invalid_format' as const};
 try {
  const response=await transport('https://ifsc.razorpay.com/'+code,{signal:AbortSignal.timeout(3000),redirect:'error',cache:'no-store'});
  if(response.status===404)return {status:'not_found' as const};
  if(!response.ok)return {status:'unavailable' as const};
  const reader=response.body?.getReader();if(!reader)return {status:'unavailable' as const};const chunks:Uint8Array[]=[];let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();return {status:'unavailable' as const};}chunks.push(part.value);}}finally{reader.releaseLock();}const text=Buffer.concat(chunks).toString('utf8');
  const value=JSON.parse(text);if(value.IFSC!==code||typeof value.BANK!=='string'||typeof value.BRANCH!=='string'||value.BANK.length>150||value.BRANCH.length>150)return {status:'unavailable' as const};
  return {status:'found' as const,bank:value.BANK as string,branch:value.BRANCH as string};
 }catch{return {status:'unavailable' as const};}
}
