import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { adminMediaHttp } from '@/lib/workspace/media/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) { const admin = await getAuthorizedAdminSession(); if (!admin) return privateJson({ error: 'Media inspection is unavailable for this account.' }, 403); const p = await params; return adminMediaHttp(request, p.id, p.assetId); }

export const HEAD = GET;
export const maxDuration = 60;
