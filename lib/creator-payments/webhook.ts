import 'server-only';
import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { coursePaymentInbox } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { courseScope } from './config';
export async function receiveCourseWebhook(request:Request,database=db,env:NodeJS.ProcessEnv=process.env) {
 const scope=courseScope(env),secret=env.COURSE_RAZORPAY_WEBHOOK_SECRET;
 if(!scope||!secret||secret.length<32||!env.COURSE_RAZORPAY_ACCOUNT_ID)throw new CommerceError(503,'Course webhook is not configured.');
 const reader=request.body?.getReader();if(!reader)throw new CommerceError(400,'Missing body.');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw new CommerceError(413,'Body too large.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=Buffer.concat(chunks),sig=request.headers.get('x-razorpay-signature')??'';
 const expected=createHmac('sha256',secret).update(bytes).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(sig)||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new CommerceError(400,'Invalid webhook signature.');
 let body;try{body=JSON.parse(bytes.toString('utf8'));}catch{throw new CommerceError(400,'Invalid event.');}
 if(!body||typeof body!=='object'||Array.isArray(body)||body.account_id!==env.COURSE_RAZORPAY_ACCOUNT_ID)throw new CommerceError(400,'Wrong provider account.');
 const event=String(body.event),entity=body.payload?.dispute?.entity;
 if(!['payment.captured','order.paid','refund.created','refund.processed','refund.failed'].includes(event)&&!event.startsWith('payment.dispute.'))return {accepted:true,ignored:true};
 const paymentId=entity?.payment_id??body.payload?.payment?.entity?.id??body.payload?.refund?.entity?.payment_id;
 if(typeof paymentId!=='string'||!/^pay_[A-Za-z0-9_]{6,100}$/.test(paymentId))throw new CommerceError(400,'Missing payment identity.');
 const eventId=request.headers.get('x-razorpay-event-id');if(!eventId||!/^[-A-Za-z0-9_]{6,150}$/.test(eventId))throw new CommerceError(400,'Missing event identity.');
 const disputeId=entity?.id;if(disputeId!==undefined&&(typeof disputeId!=='string'||!/^disp_[A-Za-z0-9_]{6,100}$/.test(disputeId)))throw new CommerceError(400,'Invalid dispute identity.');
 const id=`${scope}:${eventId}`,hash=createHash('sha256').update(bytes).digest('hex');
 await database.insert(coursePaymentInbox).values({id,scope,hash,paymentId,disputeId:disputeId??null}).onConflictDoNothing();
 const saved=await database.query.coursePaymentInbox.findFirst({where:eq(coursePaymentInbox.id,id)});
 if(saved?.hash!==hash)throw new CommerceError(409,'Conflicting event replay.');
 return {accepted:true};
}
