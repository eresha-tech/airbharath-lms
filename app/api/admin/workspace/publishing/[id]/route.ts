import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { publishingHttp } from '@/lib/workspace/publishing/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const admin=await getAuthorizedAdminSession();if(!admin)return privateJson({error:'Forbidden'},403);return publishingHttp(request,(await params).id,admin.id);}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const admin=await getAuthorizedAdminSession();if(!admin)return privateJson({error:'Forbidden'},403);return publishingHttp(request,(await params).id,admin.id);}
