import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { refundHttp } from '@/lib/workspace/refunds/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await getAuthorizedAdminSession())return privateJson({error:'Forbidden'},403);
 // Shared handler rechecks auth; transaction also locks and checks persisted role before deciding.
 return refundHttp(request,(await params).id,'decision');
}
