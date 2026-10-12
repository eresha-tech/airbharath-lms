import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({run:vi.fn(),summary:vi.fn()}));
vi.mock('@/lib/workspace/refund-notifications/worker',()=>({runRefundNoticeWorker:mocks.run,refundNoticeDiagnostics:mocks.summary}));
import { GET } from '@/app/api/internal/workspace/refund-notices/route';
const secret='synthetic-notice-cron-key-at-least-thirty-two-characters';
beforeEach(()=>vi.stubEnv('CRON_SECRET',secret));
it('refuses anonymous, creator/admin cookie, Cron user agent and query secrets',async()=>{
 const invalid:Record<string,string>[]=[{},{cookie:'creator_session=synthetic'},{cookie:'admin_session=synthetic'},{'user-agent':'vercel-cron/1.0'},{authorization:'Bearer wrong'}];for(const headers of invalid)expect((await GET(new Request('https://example.test/api/internal/workspace/refund-notices?secret='+secret,{headers}))).status).toBe(401);expect(mocks.run).not.toHaveBeenCalled();expect(mocks.summary).not.toHaveBeenCalled();
});
it('returns only no-store operational counts/timestamps through strong server auth',async()=>{
 mocks.run.mockResolvedValue({delivery:{attempted:1,blocked:1},outbox:{states:{blocked:1},lastAcceptedAt:null,oldestPendingAt:null}});const response=await GET(new Request('https://example.test/api/internal/workspace/refund-notices',{headers:{authorization:'Bearer '+secret}}));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(JSON.stringify(await response.json())).not.toContain(secret);
});
it('supports protected read-only diagnostics when sending is paused',async()=>{
 mocks.summary.mockResolvedValue({states:{uncertain:1,blocked:2},lastAcceptedAt:null,oldestPendingAt:null});const response=await GET(new Request('https://example.test/api/internal/workspace/refund-notices?view=status',{headers:{authorization:'Bearer '+secret}}));expect(response.status).toBe(200);expect(mocks.run).not.toHaveBeenCalled();expect(mocks.summary).toHaveBeenCalledOnce();
});
it('redacts missing configuration and database/provider exceptions',async()=>{
 mocks.run.mockRejectedValue(Error('private recipient or credential'));const response=await GET(new Request('https://example.test/api/internal/workspace/refund-notices',{headers:{authorization:'Bearer '+secret}}));expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('private');
});
