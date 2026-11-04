import 'server-only';
import { generateAndSaveInvoice } from '@/lib/invoice-generator';
import { serverTrack } from '@/lib/analytics-server';
import type { orders } from '@/lib/db/schema';
export async function recordCoursePurchase(actor:string,order:typeof orders.$inferSelect) {
 await Promise.allSettled([
  generateAndSaveInvoice(order.id),
  serverTrack(actor,'payment_succeeded',{order_id:order.id,course_id:order.courseId,amount:Number(order.amount)}),
  serverTrack(actor,'enrollment_completed',{order_id:order.id,course_id:order.courseId,is_free:false,amount:Number(order.amount)}),
 ]);
}
