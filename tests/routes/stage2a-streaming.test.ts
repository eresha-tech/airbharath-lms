import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { expect, it, vi } from 'vitest';
import { byteRange, privateObjectResponse, privateBytesResponse, storageBodyStream } from '@/lib/workspace/media/streaming';

const request = (headers:Record<string,string>={},method='GET',signal?:AbortSignal) => new Request('http://localhost/media',{headers,method,signal});
const bytes = new TextEncoder().encode('0123456789');
function object(size=bytes.length) {
  const cancelled=vi.fn(),reads=vi.fn(),open=vi.fn(async(range:{start:number;end:number}|null,_signal:AbortSignal,head:boolean)=>{
    const length=range?range.end-range.start+1:size;let sent=0;
    return {size:length,...(!head?{body:new ReadableStream<Uint8Array>({pull(c){reads();const count=Math.min(65536,length-sent);if(!count){c.close();return;}c.enqueue(size===bytes.length?bytes.subarray((range?.start??0)+sent,(range?.start??0)+sent+count):new Uint8Array(count).fill(7));sent+=count;},cancel(){cancelled();}},{highWaterMark:0})}:{})};
  });return {size,type:'application/octet-stream',open,cancelled,reads};
}
it.each([['bytes=0-2','012','bytes 0-2/10'],['bytes=7-','789','bytes 7-9/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=8-999','89','bytes 8-9/10']])('serves exact single range %s',async(range,text,contentRange)=>{
  const o=object(),r=await privateObjectResponse(request({range}),o,async()=>{});
  expect(r.status).toBe(206);expect(r.headers.get('content-range')).toBe(contentRange);expect(r.headers.get('content-length')).toBe(String(text.length));expect(await r.text()).toBe(text);
});
it.each(['bytes=20-','bytes=4-2','bytes=-0','bytes=0-1,3-4','bytes=x-2','bytes=9007199254740992-'])('rejects malformed/unsatisfiable range %s without reading storage',async range=>{
  const o=object(),r=await privateObjectResponse(request({range}),o,async()=>{});expect(r.status).toBe(416);expect(r.headers.get('content-range')).toBe('bytes */10');expect(o.open).not.toHaveBeenCalled();
});
it('HEAD authenticates and validates metadata but never opens a body',async()=>{
  const o=object(),auth=vi.fn(async()=>{}),r=await privateObjectResponse(request({range:'bytes=0-1'},'HEAD'),o,auth);
  expect(r.status).toBe(200);expect(r.body).toBeNull();expect(r.headers.get('content-length')).toBe('10');expect(o.open).toHaveBeenCalledWith(null,expect.any(AbortSignal),true);expect(o.reads).not.toHaveBeenCalled();expect(auth).toHaveBeenCalledTimes(2);
});
it('If-Range mismatch returns a full representation, never splices two versions',async()=>{
  const o={...object(),checksum:createHash('sha256').update(bytes).digest('hex')};
  const r=await privateObjectResponse(request({range:'bytes=0-1','if-range':'"other-version"'}),o,async()=>{});expect(r.status).toBe(200);expect(await r.text()).toBe('0123456789');
});
it.each([20,32])('streams %i MiB with backpressure and <=64KiB outgoing chunks',async mib=>{
  const o=object(mib*1024**2),r=await privateObjectResponse(request(),o,async()=>{});expect(o.reads).not.toHaveBeenCalled();
  const reader=r.body!.getReader();let total=0,max=0;
  while(true){const p=await reader.read();if(p.done)break;total+=p.value.length;max=Math.max(max,p.value.length);}
  expect(total).toBe(mib*1024**2);expect(max).toBeLessThanOrEqual(65536);expect(r.headers.get('cache-control')).toContain('no-store');expect(r.headers.get('cross-origin-resource-policy')).toBe('same-origin');expect(r.headers.get('access-control-allow-origin')).toBeNull();
});
it('denies unauthorized users before storage and cancels if permission changes while opening',async()=>{
  const o=object();await expect(privateObjectResponse(request(),o,async()=>{throw Error('denied');})).rejects.toThrow('denied');expect(o.open).not.toHaveBeenCalled();
  const auth=vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('revoked'));await expect(privateObjectResponse(request(),o,auth)).rejects.toThrow('revoked');expect(o.cancelled).toHaveBeenCalledOnce();
});
it('consumer cancellation aborts upstream without draining the large object',async()=>{
  const o=object(32*1024**2),r=await privateObjectResponse(request(),o,async()=>{}),reader=r.body!.getReader();await reader.read();await reader.cancel();expect(o.cancelled).toHaveBeenCalledOnce();expect(o.reads).toHaveBeenCalledTimes(1);expect(o.open.mock.calls[0][1].aborted).toBe(true);
});
it('request abort stops an interrupted stream and a short provider body cannot complete',async()=>{
  const abort=new AbortController(),o=object(32*1024**2),r=await privateObjectResponse(request({},'GET',abort.signal),o,async()=>{});const reader=r.body!.getReader();await reader.read();abort.abort();await expect(reader.read()).rejects.toThrow();
  const bad={...object(),open:async()=>({size:10,body:new ReadableStream<Uint8Array>({start(c){c.enqueue(bytes.subarray(0,2));c.close();}})})};const short=await privateObjectResponse(request(),bad,async()=>{});await expect(short.arrayBuffer()).rejects.toThrow();
});
it('full-body hash mismatch terminates the response rather than completing corrupt bytes',async()=>{
  const r=await privateObjectResponse(request(),{...object(),checksum:'f'.repeat(64)},async()=>{});await expect(r.arrayBuffer()).rejects.toThrow();
});
it('small parsed playlists use the same private streaming/HEAD/range behavior',async()=>{
  const r=await privateBytesResponse(request(),bytes,'application/vnd.apple.mpegurl');expect(r.body).not.toBeNull();expect(await r.text()).toBe('0123456789');expect(byteRange(null,10)).toBeNull();
});
it('Node SDK body conversion uses byte-based backpressure rather than a huge chunk-count queue',async()=>{
 let produced=0;
 const node=Readable.from((function*(){for(let i=0;i<1000;i++){produced++;yield Buffer.alloc(65536);}})(),{objectMode:false,highWaterMark:65536});
 const body=Object.assign(node,{transformToWebStream:()=>{throw Error('Do not use the SDK default chunk-count strategy');}});
 const reader=storageBodyStream(body).getReader();await new Promise(r=>setTimeout(r,15));expect(produced).toBeLessThanOrEqual(4);await reader.read();await reader.cancel();expect(produced).toBeLessThan(10);
});
