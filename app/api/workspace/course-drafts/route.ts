import { creatorHttp } from '@/lib/workspace/creator/http';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => creatorHttp(request, 'list');
export const POST = (request: Request) => creatorHttp(request, 'create');
