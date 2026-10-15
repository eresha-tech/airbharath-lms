import { reviewHttp } from '@/lib/workspace/review/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return reviewHttp(request, 'submit', (await context.params).id); }
