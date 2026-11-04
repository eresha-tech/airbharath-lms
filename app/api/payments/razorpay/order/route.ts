import { getSession } from '@/lib/auth';
import { privateJson,readJson } from '@/lib/workspace/http';
import { UUID } from '@/lib/reviews/model';
import { commerceService } from '@/lib/commerce/service';
import { CommerceError } from '@/lib/commerce/model';
import { commerceFailure,commerceOrigin } from '@/lib/commerce/http';
export async function POST(request:Request) {
 try {
  commerceOrigin(request);
  const session=await getSession();if(!session)return privateJson({error:'Unauthorized'},401);
  let raw;try{raw=await readJson(request,2048);}catch{throw new CommerceError(400,'Invalid order request.');}
  const b=raw as Record<string,unknown>;
  if(!b||typeof b.courseId!=='string'||!UUID.test(b.courseId)||b.couponCode!==undefined&&b.couponCode!==null&&typeof b.couponCode!=='string') throw new CommerceError(400,'Invalid course or coupon.');
  const coupon=typeof b.couponCode==='string'?b.couponCode.trim().toUpperCase():undefined;
  if(coupon&&(!/^[A-Z0-9_-]{1,64}$/.test(coupon))) throw new CommerceError(400,'Invalid coupon.');
  return privateJson(await commerceService().create(session.id,b.courseId,coupon));
 }catch(error){return commerceFailure(error);}
}
