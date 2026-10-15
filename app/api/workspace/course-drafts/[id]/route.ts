import { creatorHttp } from '@/lib/workspace/creator/http';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return creatorHttp(request, 'read', (await context.params).id); }
export async function PATCH(request: Request, context: Context) { return creatorHttp(request, 'update', (await context.params).id); }
