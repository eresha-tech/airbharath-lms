import { mediaHttp } from '@/lib/workspace/media/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return mediaHttp(request, 'asset', (await params).id); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return mediaHttp(request, 'asset', (await params).id); }
