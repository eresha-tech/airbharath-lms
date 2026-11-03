import { deliveryHttp } from '@/lib/workspace/media/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string; name: string }> }) { const p = await params; return deliveryHttp(request, p.id, p.name); }
