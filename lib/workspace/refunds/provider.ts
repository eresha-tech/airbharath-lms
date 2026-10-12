import { object } from '../eligibility/model';
import { ProviderFailure } from '../payments/provider';
import type { ProviderContext } from '../payments/model';
import { REFUND_ID, type ProviderRefund } from './model';
export function parseProviderRefund(raw: unknown, context: ProviderContext): ProviderRefund {
 if(!object(raw)||raw.entity!=='refund'||typeof raw.id!=='string'||!REFUND_ID.test(raw.id)||typeof raw.payment_id!=='string'||!/^pay_[A-Za-z0-9]{6,80}$/.test(raw.payment_id)||!Number.isSafeInteger(raw.amount)||Number(raw.amount)<1||raw.currency!=='INR'||!['pending','processed','failed'].includes(String(raw.status))||typeof raw.created_at!=='number'||!Number.isSafeInteger(raw.created_at)||raw.created_at<=0||raw.created_at>=10_000_000_000)throw new ProviderFailure('ambiguous');
 return {...context,id:raw.id,paymentId:raw.payment_id,amountPaise:Number(raw.amount),currency:raw.currency,status:raw.status as ProviderRefund['status'],createdAt:new Date(raw.created_at*1000)};
}
