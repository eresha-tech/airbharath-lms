import { expect, it, vi } from 'vitest';
import { courseRecoveryProvider } from '@/lib/creator-payments/worker-provider';
const env={DATABASE_ENV:'test',RAZORPAY_KEY_ID:'rzp_test_SYNTHETIC',RAZORPAY_KEY_SECRET:'synthetic-only-key',COURSE_RAZORPAY_ACCOUNT_ID:'acc_synthetic'};
it('uses the existing merchant for bounded read-only API operations',async()=>{
 const http=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({items:[]})),provider=courseRecoveryProvider(new AbortController().signal,http,env);
 await provider.orders.fetchPayments('order_synthetic_recovery');await provider.payments.fetch('pay_synthetic_recovery');await provider.disputes.fetch('disp_synthetic_recovery');await provider.disputes.all({count:3,skip:3});
 expect(http.mock.calls.map(([url])=>url)).toEqual(['https://api.razorpay.com/v1/orders/order_synthetic_recovery/payments','https://api.razorpay.com/v1/payments/pay_synthetic_recovery','https://api.razorpay.com/v1/disputes/disp_synthetic_recovery','https://api.razorpay.com/v1/disputes?count=3&skip=3']);
 for(const[,options]of http.mock.calls){expect(options?.method).toBe('GET');expect(options?.signal).toBeInstanceOf(AbortSignal);expect(options?.redirect).toBe('error');}
 await expect(provider.orders.create({amount:100,currency:'INR'})).rejects.toThrow('read_only');expect(http).toHaveBeenCalledTimes(4);
});
it('aborts a slow read and does not await a late uncooperative transport',async()=>{
 const abort=new AbortController(),http=vi.fn<typeof fetch>().mockImplementation(()=>new Promise(()=>{})),provider=courseRecoveryProvider(abort.signal,http,env);const pending=provider.payments.fetch('pay_synthetic_recovery');abort.abort();await expect(pending).rejects.toThrow('deadline');expect(http.mock.calls[0][1]?.signal?.aborted).toBe(true);
});
it('aborts stalled body reads and cancels the body',async()=>{
 let reading=false;const abort=new AbortController(),cancel=vi.fn(),body=new ReadableStream<Uint8Array>({pull(){reading=true;return new Promise(()=>{});},cancel});const http=vi.fn<typeof fetch>().mockResolvedValue(new Response(body));const pending=courseRecoveryProvider(abort.signal,http,env).payments.fetch('pay_synthetic_recovery');await vi.waitFor(()=>expect(reading).toBe(true));abort.abort();await expect(pending).rejects.toThrow();expect(cancel).toHaveBeenCalled();
});
it('rejects oversized/provider-error responses without sensitive error details',async()=>{
 const http=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('x'.repeat(256001))).mockResolvedValueOnce(new Response('private-provider-reason',{status:500})),provider=courseRecoveryProvider(new AbortController().signal,http,env);await expect(provider.payments.fetch('pay_synthetic_recovery')).rejects.toThrow('response_limit');await expect(provider.payments.fetch('pay_synthetic_recovery')).rejects.toThrow('unavailable');
});
it('fails closed before network with invalid scope, IDs or page sizes',async()=>{
 const http=vi.fn<typeof fetch>();expect(()=>courseRecoveryProvider(new AbortController().signal,http,{})).toThrow('configuration');const provider=courseRecoveryProvider(new AbortController().signal,http,env);
 expect(()=>provider.payments.fetch('../escape')).toThrow();expect(()=>provider.payments.fetch('pay_'+ 'x'.repeat(101))).toThrow();expect(()=>provider.disputes.all({count:100})).toThrow('page');expect(http).not.toHaveBeenCalled();
});
