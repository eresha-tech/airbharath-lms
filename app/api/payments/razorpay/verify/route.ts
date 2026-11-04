import { getSession } from '@/lib/auth';
import { privateJson,readJson } from '@/lib/workspace/http';
import { verifyRazorpaySignature } from '@/lib/razorpay-signature';
import { commerceService } from '@/lib/commerce/service';
import { CommerceError } from '@/lib/commerce/model';
import { commerceFailure,commerceOrigin } from '@/lib/commerce/http';
import { recordCoursePurchase } from '@/lib/commerce/effects';
export async function POST(request:Request) {
 try {
  commerceOrigin(request);
  const session=await getSession();if(!session)return privateJson({error:'Unauthorized'},401);
  let body;try{body=await readJson(request,2048);}catch{throw new CommerceError(400,'Invalid payment verification request');}
  const b=body&&typeof body==='object'?body as Record<string,unknown>:{};
  const verified=verifyRazorpaySignature(b.razorpay_order_id,b.razorpay_payment_id,b.razorpay_signature,process.env.RAZORPAY_KEY_SECRET);
  if(!verified.ok) throw new CommerceError(verified.reason==='configuration'?503:400,'Payment verification failed');
  const result=await commerceService().verify(session.id,verified.orderId,verified.paymentId);
  if(!result.alreadyVerified) {
   // These optional effects cannot undo or obscure a committed entitlement.
   await recordCoursePurchase(session.id,result.order);
  }
  return privateJson({success:true,alreadyVerified:result.alreadyVerified,message:'Payment verified and enrolled successfully'});
 }catch(error){return commerceFailure(error);}
}
