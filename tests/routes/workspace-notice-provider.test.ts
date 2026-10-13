import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createNoticeMailercloudAdapter } from '@/lib/workspace/refund-notifications/provider';
import { noticeConfiguration } from '@/lib/workspace/refund-notifications/configuration';
import { noticeDeliveryReadiness } from '@/lib/workspace/refund-notifications/configuration-core.mjs';
import { noticeEnv } from './workspace-notice-fixtures';
const input=()=>({deliveryId:randomUUID(),recipient:'creator@example.test',message:{subject:'Workspace refund completed',html:'<p>Authoritative completion.</p>',text:'Authoritative completion.'}});
it('requires coherent environment, sender verification, scope and authorization before any HTTP',()=>{
 for(const patch of [{WORKSPACE_NOTICE_DELIVERY_ENABLED:'false'},{MAILERCLOUD_API_KEY:''},{MAILERCLOUD_SENDER_EMAIL:''},{WORKSPACE_NOTICE_SENDER_VERIFIED:'false'},{WORKSPACE_NOTICE_PROVIDER_SCOPE:''},{NODE_ENV:'production'},{VERCEL_ENV:'preview'},{NEXT_PUBLIC_BASE_URL:'https://example.test/?token=unsafe'},{MAILERCLOUD_SENDER_NAME:'Injected\r\nSender'}]){const http=vi.fn();expect(()=>createNoticeMailercloudAdapter({...noticeEnv,...patch},http)).toThrow('notice_delivery_unavailable');expect(http).not.toHaveBeenCalled();}
});
it('keeps source/config/scheduling/actual acceptance readiness distinct and never claims operational readiness',()=>{
 const readiness=noticeDeliveryReadiness(noticeEnv,'development');expect(readiness).toMatchObject({noticeImplementationPresent:true,noticeConfigurationReady:true,noticeDeliveryAuthorized:true,noticesReady:false,noticeWorkerScheduled:false,noticeActualAcceptanceVerified:false,noticeRecipientVerificationAvailable:true});expect(JSON.stringify(readiness)).not.toContain(noticeEnv.MAILERCLOUD_API_KEY);expect(JSON.stringify(readiness)).not.toContain(noticeEnv.MAILERCLOUD_SENDER_EMAIL);
});
it('does not couple notice authorization to checkout/refund enablement',()=>{expect(noticeConfiguration(noticeEnv)).not.toBeNull();});
it('uses the existing Email API format, stable UUID message identity and normalized acceptance receipt',async()=>{
 const http=vi.fn<typeof fetch>().mockResolvedValue(Response.json({status:'SUCCESS',statusCode:1000,message:'private response',id:'safe_provider_ref'})),message=input();const result=await createNoticeMailercloudAdapter(noticeEnv,http).send(message);expect(result).toEqual({state:'accepted',reason:'provider_accepted',providerCode:1000,providerReference:'safe_provider_ref'});
 const body=JSON.parse(String(http.mock.calls[0][1]!.body));expect(body.metadata.messageId).toBe(message.deliveryId);expect(body.metadata.custom.store_content).toBe(false);expect(body.email.recipients.to).toHaveLength(1);expect(body.email.from).toBe(noticeEnv.MAILERCLOUD_SENDER_EMAIL);expect(http.mock.calls[0][1]!.signal).toBeInstanceOf(AbortSignal);expect(http.mock.calls[0][1]!.redirect).toBe('error');expect(JSON.stringify(result)).not.toContain('private response');
});
it.each([9002,9003,9007,9010,9011,9018,9024])('does not label HTTP 200 provider error %i as accepted',async statusCode=>{
 const http=vi.fn<typeof fetch>().mockResolvedValue(Response.json({status:'ERROR',statusCode,message:'private'}));expect((await createNoticeMailercloudAdapter(noticeEnv,http).send(input())).state).toBe('blocked');
});
it('only proven throttling is a safe provider-response automatic retry',async()=>{
 const http=vi.fn<typeof fetch>().mockResolvedValue(Response.json({status:'ERROR',statusCode:9001},{status:429}));expect(await createNoticeMailercloudAdapter(noticeEnv,http).send(input())).toEqual({state:'retryable_failure',reason:'provider_throttled',providerCode:9001});
});
it.each([9006,9013,9014,9019,9452,9999])('holds provider outcome %i conservatively rather than blindly resending',async statusCode=>{
 const http=vi.fn<typeof fetch>().mockResolvedValue(Response.json({status:'ERROR',statusCode}));expect((await createNoticeMailercloudAdapter(noticeEnv,http).send(input())).state).toBe('uncertain');
});
it('handles malformed, oversized and unknown responses without body/recipient logging',async()=>{
 for(const response of [new Response('invalid'),new Response('x'.repeat(17000)),Response.json({status:'SUCCESS',statusCode:1000},{status:500}),Response.json({ok:true})]){
  const log=vi.spyOn(console,'log'),warn=vi.spyOn(console,'warn'),http=vi.fn<typeof fetch>().mockResolvedValue(response);expect((await createNoticeMailercloudAdapter(noticeEnv,http).send(input())).state).toBe('uncertain');expect(log).not.toHaveBeenCalled();expect(warn).not.toHaveBeenCalled();log.mockRestore();warn.mockRestore();
 }
});
it('aborted before dispatch performs zero HTTP; a network timeout after dispatch is uncertain',async()=>{
 const controller=new AbortController();controller.abort();const http=vi.fn<typeof fetch>();expect(await createNoticeMailercloudAdapter(noticeEnv,http,controller.signal).send(input())).toEqual({state:'retryable_failure',reason:'not_dispatched'});expect(http).not.toHaveBeenCalled();
 const failure=vi.fn<typeof fetch>().mockRejectedValue(Error('private network timeout'));expect((await createNoticeMailercloudAdapter(noticeEnv,failure).send(input())).state).toBe('uncertain');
});
it('aborts real pending fake HTTP at the shared deadline while preserving uncertainty',async()=>{
 const http=vi.fn<typeof fetch>(async(_url,init)=>new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>reject(Error('synthetic timeout')),{once:true})}));expect((await createNoticeMailercloudAdapter(noticeEnv,http,AbortSignal.timeout(20)).send(input())).state).toBe('uncertain');
});
it('rejects invalid recipient/header data and checks authorization again immediately before dispatch',async()=>{
 const http=vi.fn<typeof fetch>(),env={...noticeEnv},adapter=createNoticeMailercloudAdapter(env,http);expect((await adapter.send({...input(),recipient:'invalid'})).state).toBe('blocked');env.WORKSPACE_NOTICE_DELIVERY_ENABLED='false';expect((await adapter.send(input())).reason).toBe('not_dispatched');expect(http).not.toHaveBeenCalled();
});
