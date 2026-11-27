import { expect,it,vi } from 'vitest';
vi.mock('@/lib/db',()=>({db:{}}));
vi.mock('@/lib/workspace/media/runtime',()=>({workspaceMediaProcessing:vi.fn()}));
import { mediaWorkerAuthorized } from '@/lib/workspace/media/worker';
it('uses a dedicated constant-time secret and fails closed on missing, short or unrelated secrets',()=>{
 const secret='s'.repeat(64),request=(token:string)=>new Request('http://localhost/api/internal/workspace/media',{headers:{authorization:token}});
 expect(mediaWorkerAuthorized(request(`Bearer ${secret}`),{})).toBe(false);
 expect(mediaWorkerAuthorized(request('Bearer short'),{WORKSPACE_MEDIA_WORKER_SECRET:'short'})).toBe(false);
 expect(mediaWorkerAuthorized(request(`Bearer ${secret}`),{CRON_SECRET:secret,AWS_WEBHOOK_SECRET:secret})).toBe(false);
 expect(mediaWorkerAuthorized(request(`Bearer ${secret}`),{WORKSPACE_MEDIA_WORKER_SECRET:secret})).toBe(true);
 expect(mediaWorkerAuthorized(request(`Bearer ${secret}x`),{WORKSPACE_MEDIA_WORKER_SECRET:secret})).toBe(false);
});
