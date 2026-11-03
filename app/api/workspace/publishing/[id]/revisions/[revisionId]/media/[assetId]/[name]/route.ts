import { revisionMediaHttp } from '@/lib/workspace/publishing/delivery';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string;revisionId:string;assetId:string;name:string}>}){const p=await params;return revisionMediaHttp(request,p.id,p.revisionId,p.assetId,p.name);}
