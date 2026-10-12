import type { NoticeProvider } from '@/lib/workspace/refund-notifications/provider';
import { expect, it, vi } from 'vitest';
import { createRefundNoticeDeliveryService } from '@/lib/workspace/refund-notifications/service';
import { noticeConfiguration } from '@/lib/workspace/refund-notifications/configuration';
import { renderRefundNotification, resolveNoticeRecipient } from '@/lib/workspace/refund-notifications/model';
import { noticeHarness, noticeEnv } from './workspace-notice-fixtures';
const signal=()=>new AbortController().signal;
const service=(h:ReturnType<typeof noticeHarness>)=>createRefundNoticeDeliveryService(h.store,h.provider,noticeConfiguration(noticeEnv)!,()=>h.now.value);
it.each(['received','rejected','initiated','completed'] as const)('renders and accepts only the corresponding %s business milestone',async kind=>{
 const h=noticeHarness(kind);expect((await service(h).run(signal())).accepted).toBe(1);expect(h.row.state).toBe('accepted');expect(h.history[0].outcome?.providerCode).toBe(1000);
 await service(h).run(signal());expect(h.sends).toHaveLength(1);
 const message=renderRefundNotification(h.facts,'https://example.test');expect(message.html).toContain('Eresha Technology Innovators Pvt. Ltd.');expect(message.text).toContain('academy@airbharath.in');expect(message.html).not.toContain(h.owner);
});
it.each(['received','rejected','initiated','completed'] as const)('blocks %s when its financial/workflow proof is missing',async kind=>{
 const h=noticeHarness(kind);h.facts.request=false;h.facts.rejected=false;h.facts.initiated=false;h.facts.completed=false;
 expect((await service(h).run(signal())).blocked).toBe(1);expect(h.provider.send).not.toHaveBeenCalled();
});
it('escapes bounded admin text and distinguishes receipt/initiation/completion',()=>{
 const h=noticeHarness('rejected');h.facts.rejectionReason='<script>alert("x")</script>'.repeat(200);const email=renderRefundNotification(h.facts,'https://example.test');expect(email.html).not.toContain('<script>');expect(email.html).toContain('&lt;script&gt;');expect(email.text.length).toBeLessThan(2500);
 expect(renderRefundNotification(noticeHarness('received').facts,'https://example.test').text).toContain('Approval is not guaranteed');
 expect(renderRefundNotification(noticeHarness('initiated').facts,'https://example.test').text).toContain('does not mean the refund has completed');
 expect(renderRefundNotification(noticeHarness('completed').facts,'https://example.test').text).toContain('Bank or payment-source credit may take additional processing time');
});
it.each(['missing','invalid','unverified','wrong_owner'] as const)('retains a blocked obligation for %s recipient without sending',async kind=>{
 const h=noticeHarness();h.setRecipient(kind==='missing'?null:{userId:kind==='wrong_owner'?'wrong':h.owner,email:kind==='invalid'?'not-an-email':'mutable@example.test',verification:'unverified'});await service(h).run(signal());expect(h.row.state).toBe('blocked');expect(h.sends).toHaveLength(0);
});
it('requires real dated verification evidence, not email syntax or a boolean alone',()=>{
 const h=noticeHarness();expect(resolveNoticeRecipient(h.owner,{userId:h.owner,email:'user@example.test',verification:'verified'},h.now.value)).toEqual({reason:'recipient_unverified'});
});
it('two fake workers produce one claimed send; accepted receipt survives lost response',async()=>{
 const h=noticeHarness();await Promise.all([service(h).run(signal()),service(h).run(signal())]);expect(h.sends).toHaveLength(1);expect(h.history).toHaveLength(1);await service(h).run(signal());expect(h.sends).toHaveLength(1);
});
it('crash after claim before dispatch permits only a later bounded safe retry',async()=>{
 const h=noticeHarness(),claim=await h.store.claim(h.noticeId);h.now.value=new Date(h.now.value.getTime()+60001);await service(h).run(signal());expect(h.row.state).toBe('retryable_failure');expect(h.sends).toHaveLength(0);
 expect(await h.store.dispatch(claim!,{payloadHash:'a'.repeat(64),recipientHash:'a'.repeat(64),providerConfigHash:'a'.repeat(64),templateVersion:'workspace-refund-notice-v1'})).toBe(false);
 h.now.value=new Date(h.row.next!);await service(h).run(signal());expect(h.sends).toHaveLength(1);expect(h.history).toHaveLength(2);
});
it('provider accepted but database receipt failed stays submitted then uncertain, never blindly resent',async()=>{
 const h=noticeHarness();h.failFinish();await service(h).run(signal());expect(h.sends).toHaveLength(1);expect(h.row.state).toBe('submitted');h.now.value=new Date(h.now.value.getTime()+60001);await service(h).run(signal());expect(h.row.state).toBe('uncertain');await service(h).run(signal());expect(h.sends).toHaveLength(1);
});
it('after possible dispatch, a thrown timeout is uncertain and not automatically retryable',async()=>{
 const h=noticeHarness();h.provider.send=vi.fn(async()=>{throw Error('timeout after dispatch')});await service(h).run(signal());expect(h.row.state).toBe('uncertain');await service(h).run(signal());expect(h.provider.send).toHaveBeenCalledTimes(1);
});
it('safe failures back off, bound attempts and reuse the stable delivery identity',async()=>{
 const h=noticeHarness();h.provider.send=vi.fn<NoticeProvider['send']>(async()=>({state:'retryable_failure',reason:'provider_throttled',providerCode:9001}));
 for(let i=0;i<5;i++){await service(h).run(signal());if(h.row.next)h.now.value=new Date(h.row.next);}expect(h.row.state).toBe('blocked');expect(h.row.reason).toBe('retry_exhausted');expect(h.provider.send).toHaveBeenCalledTimes(5);const ids=vi.mocked(h.provider.send).mock.calls.map(c=>c[0].deliveryId);expect(new Set(ids).size).toBe(1);await service(h).run(signal());expect(h.provider.send).toHaveBeenCalledTimes(5);
});
it('pins recipient and content so changes cannot silently redirect a retried obligation',async()=>{
 const h=noticeHarness();h.provider.send=vi.fn<NoticeProvider['send']>(async()=>({state:'retryable_failure',reason:'provider_throttled'}));await service(h).run(signal());h.now.value=new Date(h.row.next!);h.setRecipient({userId:h.owner,email:'other@example.test',verification:'verified',verifiedAt:h.now.value});await service(h).run(signal());expect(h.row.state).toBe('blocked');expect(h.row.reason).toBe('payload_changed');expect(h.provider.send).toHaveBeenCalledTimes(1);
});
it('an expired submitted claim and its stale worker cannot overwrite the held uncertainty',async()=>{
 const h=noticeHarness(),claim=await h.store.claim(h.noticeId);await h.store.dispatch(claim!,{payloadHash:'a'.repeat(64),recipientHash:'a'.repeat(64),providerConfigHash:'a'.repeat(64),templateVersion:'workspace-refund-notice-v1'});h.now.value=new Date(h.now.value.getTime()+60001);await h.store.claim(h.noticeId);expect(await h.store.finish(claim!,{state:'accepted',reason:'provider_accepted',providerCode:1000})).toBe(false);expect(h.row.state).toBe('uncertain');
});
it('aborted invocation and invalid batch make no send',async()=>{
 const h=noticeHarness(),controller=new AbortController();controller.abort();expect((await service(h).run(controller.signal)).attempted).toBe(0);await expect(service(h).run(signal(),4)).rejects.toThrow('notice_invalid_limit');expect(h.sends).toHaveLength(0);
});
it('caps candidate traversal even if an injected store returns an excessive backlog',async()=>{
 const h=noticeHarness();h.store.candidates=vi.fn(async()=>Array(50).fill(h.noticeId));const claim=vi.spyOn(h.store,'claim');await service(h).run(signal(),3);expect(claim).toHaveBeenCalledTimes(3);expect(h.sends).toHaveLength(1);
});
it('does not construct unsafe email links from an unvalidated origin',()=>{
 const h=noticeHarness();for(const origin of ['javascript:alert(1)','https://evil.test@evil.test/','https://example.test/path','http://public.test'])expect(()=>renderRefundNotification(h.facts,origin)).toThrow('notice_origin_invalid');
});
