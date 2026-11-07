import {supportHttp} from '@/lib/workspace/operations/http';
export const dynamic='force-dynamic';
export const GET=(r:Request)=>supportHttp(r);
export const POST=(r:Request)=>supportHttp(r);
