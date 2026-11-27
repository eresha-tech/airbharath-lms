import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { reviewHttp } from '@/lib/reviews/http';
export async function POST(r:Request,c:{params:Promise<{reviewId:string}>}){
 const admin=await getAuthorizedAdminSession();if(!admin)return privateJson({error:'Admin access required.'},403);
 return reviewHttp(r,(await c.params).reviewId,'moderate',admin.id);
}
