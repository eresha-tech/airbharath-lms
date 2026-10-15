import { builderHttp } from '@/lib/workspace/builder/http';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return builderHttp(request, (await params).id); }
export const POST = GET;
export const PATCH = GET;
