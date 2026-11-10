import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { deliveryHttp } from '@/lib/workspace/media/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string; assetId: string; name: string }> }) { const admin = await getAuthorizedAdminSession(); if (!admin) return privateJson({ error: 'Forbidden' }, 403); const p = await params; return deliveryHttp(request, p.assetId, p.name, { id: admin.id, project: p.id }); }

export const HEAD = GET;
export const maxDuration = 60;
