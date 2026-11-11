import 'server-only';
import type { razorpay } from '@/lib/razorpay';
import type { CommerceProvider } from '@/lib/commerce/service';
import { courseScope } from './config';
import { abortable } from '@/lib/async-budget';
export type RecoveryProvider = CommerceProvider & { disputes: Pick<typeof razorpay.disputes, 'all' | 'fetch'>; payments: { fetchRefunds?: import('@/lib/academy-entitlements/refunds').RefundReader } };

// Read-only access to the same merchant/API used by checkout. No new charge path.
export function courseRecoveryProvider(signal:AbortSignal, http:typeof fetch=fetch, env:Record<string,string|undefined>=process.env):RecoveryProvider {
  if (!courseScope(env)) throw Error('course_recovery_configuration');
  const key=env.RAZORPAY_KEY_ID||env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  async function read(path:string) {
    const callSignal=AbortSignal.any([signal,AbortSignal.timeout(6000)]);
    const response=await abortable(http(`https://api.razorpay.com/v1/${path}`,{method:'GET',headers:{Authorization:`Basic ${Buffer.from(`${key}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`},signal:callSignal,redirect:'error'}),callSignal);
    if(!response.ok||!response.body){await response.body?.cancel();throw Error('course_provider_unavailable');}
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
    try {while(true){const part=await abortable(reader.read(),callSignal);if(part.done)break;size+=part.value.length;if(size>256000)throw Error('course_provider_response_limit');chunks.push(part.value);}}
    catch(error){await reader.cancel().catch(()=>undefined);throw error;}finally{reader.releaseLock();}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const id=(v:string,prefix:string)=>{if(!new RegExp(`^${prefix}_[A-Za-z0-9_]{6,100}$`).test(v))throw Error('course_provider_identity');return encodeURIComponent(v);};
  return {
    orders:{create:async()=>{throw Error('recovery_is_read_only');},fetchPayments:order=>read(`orders/${id(order,'order')}/payments`)},
    payments:{fetch:payment=>read(`payments/${id(payment,'pay')}`),fetchRefunds:(payment,query)=>{
      if(!Number.isSafeInteger(query.count)||query.count<1||query.count>10||!Number.isSafeInteger(query.skip)||query.skip<0||query.skip>1000000)throw Error('course_refund_page');
      return read(`payments/${id(payment,'pay')}/refunds?count=${query.count}&skip=${query.skip}`);
    }},
    disputes:{fetch:dispute=>read(`disputes/${id(dispute,'disp')}`),all:query=>{
      const count=Number(query?.count??5),skip=Number(query?.skip??0);
      if(!Number.isSafeInteger(count)||count<1||count>5||!Number.isSafeInteger(skip)||skip<0)throw Error('course_dispute_page');
      return read(`disputes?count=${count}&skip=${skip}`);
    }},
  };
}
