import { mediaHttp } from '@/lib/workspace/media/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return mediaHttp(request, 'collection'); }
export async function POST(request: Request) { return mediaHttp(request, 'collection'); }
