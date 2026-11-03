// Local-only polling client. Load a dedicated nonproduction env file explicitly
// with node --env-file=<path>; this script never reads repository .env files.
if (process.env.WORKSPACE_MEDIA_LOCAL_WORKER_ENABLED !== 'true' || process.env.DATABASE_ENV !== 'development' || process.env.NODE_ENV === 'production' || process.env.VERCEL !== undefined) {
  console.error('Local media worker refused startup.'); process.exit(1);
}
const secret = process.env.WORKSPACE_MEDIA_WORKER_SECRET;
if (!secret || secret.length < 32) { console.error('Configure a dedicated media worker secret of at least 32 characters.'); process.exit(1); }
const base = process.env.WORKSPACE_MEDIA_LOCAL_APP_URL || 'http://localhost:3000';
const url = new URL(base);
if(url.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) { console.error('Local media worker requires a loopback application URL.'); process.exit(1); }
let stopped = false;
process.on('SIGINT', () => { stopped = true; }); process.on('SIGTERM', () => { stopped = true; });
while(!stopped) {
  try {
    const response = await fetch(new URL('/api/internal/workspace/media',url),{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(300000),redirect:'error'});
    if(!response.ok) console.error(`Local media worker request failed (${response.status}).`);
    else { const result = await response.json(); if(result.examined) console.log(JSON.stringify({examined:result.examined,dispatched:result.dispatched,reconciled:result.reconciled,deferred:result.deferred})); }
  } catch { console.error('Local media worker could not reach the application.'); }
  if(!stopped) await new Promise(resolve => setTimeout(resolve,10000));
}
