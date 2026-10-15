import { refundHttp } from '@/lib/workspace/refunds/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return refundHttp(request,(await params).id,'request');}
