import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { reviewHttp } from '@/lib/workspace/review/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdminSession();
  if (!admin) return privateJson({ code: 'forbidden', error: 'This action is unavailable for your current account.' }, 403);
  return reviewHttp(request, 'review', (await context.params).id); }
