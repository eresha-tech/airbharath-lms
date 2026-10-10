import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { adminBuilderHttp } from '@/lib/workspace/builder/http';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdminSession();
  if (!admin) return privateJson({ error: 'Course build inspection is unavailable for this account.' }, 403);
  return adminBuilderHttp(request, (await params).id);
}
