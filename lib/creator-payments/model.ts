import { CommerceError } from '@/lib/commerce/model';
export const SETTLEMENT_POLICY = 'creator-monthly-bank-2026-01';
export const SETTLEMENT_COPY = 'AirBharath charges 0% commission. Recorded course tax and actual evidenced Razorpay fees (including fee tax, counted once) are excluded from Creator proceeds. Previous calendar-month proceeds are scheduled for bank settlement by the 10th of the following month after payee verification and reconciliation. Membership expiry does not pause amounts owed. Missing evidence, bank failures and active disputes are shown for review; uncertain transfers must be traced before retrying. Contact support for overdue settlement. Bank settlement is confirmed only against bank evidence. Refunds and chargebacks adjust the balance and may create a negative balance. Statutory deductions require separate evidenced review; no estimated deductions are applied.';
export type PaymentFact = { id:string; order_id:string; amount:number; currency:'INR'; status:string; amount_refunded:number; fee:number|null; tax:number|null };
export function paise(n:unknown,max=100000000):number {
 if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>max) throw new CommerceError(409,'Invalid provider money evidence.');return n;
}
export function paymentFact(raw:unknown):PaymentFact {
 const p=raw as Record<string,unknown>;
 if(!p||typeof p.id!=='string'||!/^pay_[A-Za-z0-9_]{6,100}$/.test(p.id)||typeof p.order_id!=='string'||!/^order_[A-Za-z0-9_]{6,100}$/.test(p.order_id)||p.currency!=='INR'||!['captured','refunded'].includes(String(p.status))) throw new CommerceError(409,'Captured payment evidence is unavailable.');
 const amount=paise(p.amount),refunded=paise(p.amount_refunded??0,amount);
 const fee=p.fee==null?null:paise(p.fee),tax=p.tax==null?null:paise(p.tax);
 if(fee!==null&&tax!==null&&tax>fee) throw new CommerceError(409,'Gateway fee evidence needs review.');
 return {id:p.id,order_id:p.order_id,amount,currency:'INR',status:String(p.status),amount_refunded:refunded,fee,tax};
}
// Razorpay payment.fee is the total fee; payment.tax is its tax component.
// Refund tax allocation follows the ORIGINAL inclusive-tax quote. It is an
// accounting allocation, not evidence that a statutory tax credit was received.
export function proceeds(total:number,tax:number,refund:number,fee:number) {
 paise(total);paise(tax,total);paise(refund,total);paise(fee);
 const refundTax=refund===total?tax:Math.round(tax*refund/total);
 return {refundTax,net:total-tax-refund+refundTax-fee};
}
export function dueBefore(now=new Date()) {
 const ist=new Date(now.getTime()+330*60000);
 return new Date(Date.UTC(ist.getUTCFullYear(),ist.getUTCMonth(),1)-330*60000);
}
export const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export function requiredText(value:unknown,min=5,max=300) {if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new CommerceError(400,'Provide a valid evidence reference or reason.');return value.trim();}
