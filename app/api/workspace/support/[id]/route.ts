import {supportHttp} from '@/lib/workspace/operations/http';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export const GET=async(r:Request,c:Context)=>supportHttp(r,(await c.params).id);
export const POST=async(r:Request,c:Context)=>supportHttp(r,(await c.params).id);
