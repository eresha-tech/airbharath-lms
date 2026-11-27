export const maxDuration = 60;
import { financeHttp } from '@/lib/creator-payments/http';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
export async function GET(request:Request) {
 if(!await getAuthorizedAdminSession())return privateJson({error:'Unauthorized'},401);
 return financeHttp(request,true);
}
export async function POST(request:Request) {
 if(!await getAuthorizedAdminSession())return privateJson({error:'Unauthorized'},401);
 return financeHttp(request,true);
}
