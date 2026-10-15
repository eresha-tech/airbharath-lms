import { beforeEach, expect, it, vi } from 'vitest';
import { noticeEnv, noticeHarness } from './workspace-notice-fixtures';
const mocks=vi.hoisted(()=>({pool:vi.fn(),close:vi.fn(),store:vi.fn(),adapter:vi.fn()}));
vi.mock('@/lib/workspace/payments/worker-database',()=>({createFinancialWorkerDatabase:mocks.pool}));
vi.mock('@/lib/workspace/refund-notifications/repository',()=>({createPostgresNoticeStore:mocks.store}));
vi.mock('@/lib/workspace/refund-notifications/provider',()=>({createNoticeMailercloudAdapter:mocks.adapter}));
import { runRefundNoticeWorker, refundNoticeDiagnostics } from '@/lib/workspace/refund-notifications/worker';
beforeEach(()=>{for(const [key,value]of Object.entries(noticeEnv))vi.stubEnv(key,value);mocks.pool.mockReturnValue({db:{},close:mocks.close});});
it('uses an independent bounded pool and provider deadline then closes after committed acceptance',async()=>{
 const h=noticeHarness();h.setRecipient({userId:h.owner,email:'creator@example.test',verification:'verified',verifiedAt:new Date('2020-01-01')});mocks.store.mockReturnValue(h.store);mocks.adapter.mockReturnValue(h.provider);const timeout=vi.spyOn(AbortSignal,'timeout');const result=await runRefundNoticeWorker();expect(result.delivery.accepted).toBe(1);expect(timeout).toHaveBeenCalledWith(30000);expect(mocks.pool).toHaveBeenCalledWith(process.env,'workspace_refund_notice_worker');expect(mocks.close).toHaveBeenCalledOnce();
});
it('fails closed before pool/provider construction when send capability is absent',async()=>{
 vi.stubEnv('WORKSPACE_NOTICE_DELIVERY_ENABLED','false');await expect(runRefundNoticeWorker()).rejects.toThrow('notice_delivery_unavailable');expect(mocks.pool).not.toHaveBeenCalled();expect(mocks.adapter).not.toHaveBeenCalled();
});
it('a diagnostics failure closes the isolated pool without creating a provider sender',async()=>{
 mocks.store.mockReturnValue({summary:vi.fn(async()=>{throw Error('synthetic DB failure')})});await expect(refundNoticeDiagnostics()).rejects.toThrow('synthetic DB failure');expect(mocks.close).toHaveBeenCalledOnce();expect(mocks.adapter).not.toHaveBeenCalled();
});
