import { revisionMediaHttp } from '@/lib/workspace/publishing/delivery';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string;revisionId:string;assetId:string;name:string}>}){const admin=await getAuthorizedAdminSession();if(!admin)return privateJson({error:'Forbidden'},403);const p=await params;return revisionMediaHttp(request,p.id,p.revisionId,p.assetId,p.name,admin.id);}

export const HEAD = GET;
export const maxDuration = 60;
