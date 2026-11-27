import {getSession} from '@/lib/auth';
import {privateJson} from '@/lib/workspace/http';
import {lookupIFSC} from '@/lib/creator-payments/bank-validation/ifsc';
export async function GET(request:Request) {
 if(!await getSession())return privateJson({error:'Please sign in again.'},401);
 const code=new URL(request.url).searchParams.get('code')??'';
 if(process.env.RAZORPAY_IFSC_LOOKUP_ENABLED!=='true')return privateJson({status:'unavailable'});
 return privateJson(await lookupIFSC(code));
}
