import { getSession } from '@/lib/auth';
import { privateJson,readJson } from '@/lib/workspace/http';
import { recordCoursePurchase } from '@/lib/commerce/effects';
import { commerceService } from '@/lib/commerce/service';
import { CommerceError } from '@/lib/commerce/model';
import { commerceOrigin,commerceFailure } from '@/lib/commerce/http';
export async function POST(request:Request) {
 try {
  commerceOrigin(request);
  const session=await getSession();if(!session)return privateJson({error:'Unauthorized'},401);
  let raw;try{raw=await readJson(request,1024);}catch{throw new CommerceError(400,'Invalid recovery request.');}
  const id=(raw as Record<string,unknown>)?.orderId;
  if(typeof id!=='string'||!/^order_[A-Za-z0-9_-]{1,100}$/.test(id))throw new CommerceError(400,'Invalid order.');
  const result=await commerceService().recover(session.id,id);
  if(result.success&&!result.alreadyVerified&&result.order)await recordCoursePurchase(session.id,result.order);
  return privateJson({success:result.success,alreadyVerified:result.alreadyVerified??false});
 }catch(error){return commerceFailure(error);}
}
