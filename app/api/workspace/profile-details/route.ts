import { creatorHttp } from '@/lib/workspace/creator/http';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => creatorHttp(request, 'profileRead');
export const PUT = (request: Request) => creatorHttp(request, 'profileSave');
