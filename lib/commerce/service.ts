import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, coupons, enrollments, orders, users, workspacePublicationStates as states, workspacePublicationPrices as prices } from '@/lib/db/schema';
import { razorpay } from '@/lib/razorpay';
import { recordCapture } from '@/lib/creator-payments/ledger';
import { courseScope, requireCourseScope } from '@/lib/creator-payments/config';
import { coursePaymentChecks } from '@/lib/db/schema';
import { capturedPayment, CommerceError, moneyPaise, priceEvidence } from './model';
import { effectiveEnrollment, prospectiveAcademyPolicy } from '@/lib/academy-entitlements/model';
import { sourceRelations, isProspectiveAcademyOrder, createPurchaseSource } from '@/lib/academy-entitlements/repository';

// Provider calls stay outside database locks. Tests inject a synthetic adapter.
export type CommerceProvider = {
 orders: Pick<typeof razorpay.orders, 'create' | 'fetchPayments'>;
 payments: Pick<typeof razorpay.payments, 'fetch'>;
};
export function commerceService(database=db, provider:CommerceProvider=razorpay, scope=courseScope()??'test:synthetic') {
 async function quote(actor:string,courseId:string,couponCode?:string, source=database) {
  const user=await source.query.users.findFirst({where:eq(users.id,actor)});
  if(!user) throw new CommerceError(401,'Sign in again.');
  const course=await source.query.courses.findFirst({where:eq(courses.id,courseId)});
  if(!course?.isPublished || course.workspaceState==='suspended' || (course.workspaceProjectId&&course.workspaceState!=='live')) throw new CommerceError(409,'Course is not available for purchase.');
  if(course.instructorId===actor) throw new CommerceError(403,'Creators cannot purchase their own courses.');
  let priceId:string|null=null;
  if(course.workspaceProjectId) {
   const state=await source.query.workspacePublicationStates.findFirst({where:eq(states.projectId,course.workspaceProjectId)});
   const price=state?.currentPriceId ? await source.query.workspacePublicationPrices.findFirst({where:eq(prices.id,state.currentPriceId)}) : null;
   if(!price || !['creator','approved'].includes(price.status) || price.projectId!==course.workspaceProjectId || price.userId!==course.instructorId || price.amountPaise!==moneyPaise(course.price) || state?.status!=='live' || state.courseId!==courseId) throw new CommerceError(409,'The current Creator course price is unavailable.');
   priceId=price.id;
  }
  const coupon=couponCode ? await source.query.coupons.findFirst({where:eq(coupons.code,couponCode)}) : null;
  if(couponCode && (!coupon || (coupon.expiryDate&&coupon.expiryDate<new Date()) || (coupon.usageLimit!==null&&coupon.usedCount>=coupon.usageLimit) || (couponCode==='ABCOMBO'&&course.slug!=='combo-pack'))) throw new CommerceError(400,'Coupon is unavailable for this course.');
  return {course,evidence:priceEvidence(course,priceId,coupon??null)};
 }
 return {
  async create(actor:string,courseId:string,couponCode?:string) {
   if(provider===razorpay) requireCourseScope();
   const initial=await quote(actor,courseId,couponCode);
   const pending=await database.query.orders.findFirst({where:and(eq(orders.userId,actor),eq(orders.courseId,courseId),eq(orders.status,'pending')),orderBy:[desc(orders.createdAt),desc(orders.id)]});
   if(pending) {
    if(initial.course.workspaceProjectId && !pending.purchaseEvidence) throw new CommerceError(409,'A prior payment needs support review before another checkout.');
    return {id:pending.razorpayOrderId,amount:moneyPaise(pending.amount),currency:'INR',discountedAmount:Number(pending.amount),resumed:true};
   }
   if(initial.evidence.totalPaise<=0) throw new CommerceError(409,'This checkout requires a positive payment amount. Contact support for free enrollment.');
   const academyPolicy = initial.course.workspaceProjectId ? null : prospectiveAcademyPolicy();
   const purchaseEvidence = { ...initial.evidence, ...(academyPolicy ? { academyEntitlementPolicy: academyPolicy } : {}) };
   // No contact details need to leave AirBharath in provider order notes.
   const order=await provider.orders.create({amount:initial.evidence.totalPaise,currency:'INR',receipt:`lms_${randomUUID().replaceAll('-','')}`,notes:{courseId}});
   if(!order.id || Number(order.amount)!==initial.evidence.totalPaise || order.currency!=='INR') throw new CommerceError(503,'Payment order could not be confirmed.');
   const persisted=await database.transaction(async tx=>{
    await tx.select({id:users.id}).from(users).where(eq(users.id,actor)).for('update');
    // Publication takes this state lock before changing LMS price/visibility.
    if(initial.course.workspaceProjectId) await tx.select().from(states).where(eq(states.projectId,initial.course.workspaceProjectId)).for('share');
    await tx.select().from(courses).where(eq(courses.id,courseId)).for('share');
    const current=await quote(actor,courseId,couponCode,tx as unknown as typeof db);
    if(JSON.stringify(current.evidence)!==JSON.stringify(initial.evidence)) throw new CommerceError(409,'Course price changed. Please retry checkout.');
    const existing=await tx.query.enrollments.findFirst({where:and(eq(enrollments.userId,actor),eq(enrollments.courseId,courseId)),with:sourceRelations});
    if(effectiveEnrollment(existing).enrollment) throw new CommerceError(409,'You already have course access.');
    const prior=await tx.query.orders.findFirst({where:and(eq(orders.userId,actor),eq(orders.courseId,courseId),eq(orders.status,'pending')),orderBy:[desc(orders.createdAt),desc(orders.id)]});
    if(prior) return {id:prior.razorpayOrderId,amount:moneyPaise(prior.amount),currency:'INR',discountedAmount:Number(prior.amount),resumed:true};
    const [saved]=await tx.insert(orders).values({userId:actor,courseId,razorpayOrderId:order.id,amount:(initial.evidence.totalPaise/100).toFixed(2),status:'pending',purchaseEvidence,creatorId:initial.evidence.creatorId,workspacePriceId:initial.evidence.priceId}).returning();
    await tx.insert(coursePaymentChecks).values({orderId:saved.id,scope});
    return {...order,discountedAmount:initial.evidence.totalPaise/100,resumed:false};
   });
   return persisted;
  },
  quote,
  async recover(actor:string,orderId:string):Promise<{success:boolean;alreadyVerified?:boolean;order?:typeof orders.$inferSelect}> {
   const order=await database.query.orders.findFirst({where:eq(orders.razorpayOrderId,orderId)});
   if(!order) throw new CommerceError(404,'Payment order not found.');
   if(order.userId!==actor) throw new CommerceError(403,'Forbidden.');
   if(order.status==='paid') return {success:true,alreadyVerified:true};
   if(order.status!=='pending') throw new CommerceError(409,'Payment requires support review.');
   const list=await provider.orders.fetchPayments(orderId);
   const captured=list.items.find(p=>capturedPayment(p,order,p.id));
   if(!captured) return {success:false};
   const result=await commerceService(database,provider,scope).verify(actor,orderId,captured.id);
   return {success:true,alreadyVerified:result.alreadyVerified,order:result.order};
  },
  async verify(actor:string,orderId:string,paymentId:string, reconciled=false) {
   const order=await database.query.orders.findFirst({where:eq(orders.razorpayOrderId,orderId)});
   if(!order) throw new CommerceError(404,'Payment order not found.');
   if(order.userId!==actor) throw new CommerceError(403,'Forbidden.');
   if(order.status==='paid'&&!reconciled) {
    if(order.razorpayPaymentId!==paymentId) throw new CommerceError(409,'Payment cannot be verified.');
    return {alreadyVerified:true,order};
   }
   if(!(reconciled?['pending','paid','refunded','chargeback']:['pending','paid']).includes(order.status)||!order.courseId) throw new CommerceError(409,'Payment cannot be verified.');
   // A checkout signature proves authenticity, not capture or amount. Uncertain
   // provider responses leave the order pending and safe to retry.
   const observedAt=new Date();
   const payment=await provider.payments.fetch(paymentId);
   if(!capturedPayment({...payment,status:reconciled&&payment.status==='refunded'?'captured':payment.status,amount_refunded:reconciled?0:payment.amount_refunded},order,paymentId)) throw new CommerceError(409,'Payment is not captured for this order. Please retry after confirmation.');
   return database.transaction(async tx=>{
    if(order.creatorId) await tx.select({id:users.id}).from(users).where(eq(users.id,order.creatorId)).for('update');
    await tx.select({id:users.id}).from(users).where(eq(users.id,actor)).for('update');
    const [locked]=await tx.select().from(orders).where(eq(orders.id,order.id)).for('update');
    if(['paid','refunded','chargeback'].includes(locked.status)&&locked.razorpayPaymentId===paymentId) {await recordCapture(tx,locked,payment,scope,observedAt);return {alreadyVerified:true,order:locked};}
    if(locked.status!=='pending') throw new CommerceError(409,'Payment cannot be verified.');
    const [course]=await tx.select().from(courses).where(eq(courses.id,locked.courseId!));
    if(!course) throw new CommerceError(409,'Course needs manual payment review.');
    // A previously issued approved quote remains valid if the course is later
    // withdrawn. Suspension still blocks delivery in hasCourseAccess.
    const days=locked.purchaseEvidence ? locked.purchaseEvidence.accessDays : course.accessDays;
    const startsAt=new Date(),expiresAt=days?new Date(startsAt.getTime()+days*86400000):null;
    const existing=await tx.query.enrollments.findFirst({where:and(eq(enrollments.userId,actor),eq(enrollments.courseId,course.id)),with:sourceRelations});
    if(existing && !['active','expired'].includes(existing.status)) throw new CommerceError(409,'Access was restricted. Contact support for payment review.');
    const prospective=isProspectiveAcademyOrder(locked);
    // An old pending capture remains exempt even if a new Admin grant created a managed row meanwhile.
    const legacyCapture=!prospective&&!locked.creatorId&&!locked.purchaseEvidence?.projectId&&!!existing?.academySources?.some(source=>source.ownsEnrollment)&&!(reconciled&&Number(payment.amount_refunded)===Number(payment.amount));
    let enrollmentId=existing?.id;
    if(!existing && (prospective || !(reconciled&&Number(payment.amount_refunded)===Number(payment.amount)))) {
     const [created]=await tx.insert(enrollments).values({userId:actor,courseId:course.id,status:'active',expiresAt}).returning();enrollmentId=created.id;
    }
    else if(existing && !prospective && !legacyCapture && !(reconciled&&Number(payment.amount_refunded)===Number(payment.amount))) {
     // Never shorten lifetime or a later existing entitlement; progress is untouched.
     const until=existing.expiresAt===null||expiresAt===null?null:new Date(Math.max(existing.expiresAt.getTime(),expiresAt.getTime()));
     await tx.update(enrollments).set({status:'active',expiresAt:until}).where(eq(enrollments.id,existing.id));
    }
    await tx.update(orders).set({status:'paid',razorpayPaymentId:paymentId}).where(eq(orders.id,locked.id));
    if(locked.purchaseEvidence?.couponId) await tx.update(coupons).set({usedCount:sql`${coupons.usedCount}+1`}).where(eq(coupons.id,locked.purchaseEvidence.couponId));
    await recordCapture(tx,{...locked,status:'paid',razorpayPaymentId:paymentId},payment,scope,observedAt);
    if((prospective||legacyCapture) && enrollmentId) await createPurchaseSource(tx,{...locked,razorpayPaymentId:paymentId},enrollmentId,scope,!existing,startsAt,expiresAt,legacyCapture);
    return {alreadyVerified:false,order:locked};
   });
  },
 };
}
