// Browser-safe incremental SHA-256. Bounded memory even for 2 GiB videos.
const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const r = (v: number, n: number) => (v >>> n) | (v << (32 - n));
export async function fileChecksum(file: Blob, signal?: AbortSignal, progress?: (percent: number) => void) {
  const hash = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]), w = new Uint32Array(64);
  function block(bytes: Uint8Array, offset: number) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 64);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(i * 4);
    for (let i = 16; i < 64; i++) { const x = w[i-15], y = w[i-2]; w[i] = w[i-16] + (r(x,7)^r(x,18)^(x>>>3)) + w[i-7] + (r(y,17)^r(y,19)^(y>>>10)); }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let i=0;i<64;i++) { const t1 = (h + (r(e,6)^r(e,11)^r(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i])|0, t2 = ((r(a,2)^r(a,13)^r(a,22)) + ((a&b)^(a&c)^(b&c)))|0; h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0; }
    for (const [i,v] of [a,b,c,d,e,f,g,h].entries()) hash[i] += v;
  }
  let tail = new Uint8Array(0);
  for (let start = 0; start < file.size; start += 1024**2) {
    signal?.throwIfAborted();
    const bytes = new Uint8Array(await file.slice(start, start + 1024**2).arrayBuffer());
    const joined = new Uint8Array(tail.length + bytes.length); joined.set(tail); joined.set(bytes, tail.length);
    const end = joined.length - joined.length % 64;
    for (let offset = 0; offset < end; offset += 64) block(joined, offset);
    tail = joined.slice(end); progress?.(Math.round(Math.min(file.size, start + bytes.length) / file.size * 100));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  signal?.throwIfAborted();
  const final = new Uint8Array(tail.length < 56 ? 64 : 128); final.set(tail); final[tail.length] = 0x80;
  const view = new DataView(final.buffer); view.setUint32(final.length - 8, Math.floor(file.size / 0x20000000)); view.setUint32(final.length - 4, (file.size * 8) >>> 0);
  for (let i=0;i<final.length;i+=64) block(final,i);
  return [...hash].map(v => v.toString(16).padStart(8,'0')).join('');
}
