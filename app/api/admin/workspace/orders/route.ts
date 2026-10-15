import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { listFinancialOrders } from '@/lib/workspace/payments/repository';
import { paymentFailure } from '@/lib/workspace/payments/http';
export async function GET(request: Request) {
  if (!await getAuthorizedAdminSession()) return privateJson({ error: 'Forbidden' }, 403);
  const page = Number(new URL(request.url).searchParams.get('page') || 1); if (!Number.isInteger(page) || page < 1 || page > 500) return privateJson({ error: 'Invalid page.' }, 400);
  try { return privateJson({ rows: await listFinancialOrders(page), page }); } catch (error) { return paymentFailure(error); }
}
