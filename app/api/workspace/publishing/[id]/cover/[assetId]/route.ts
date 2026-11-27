import { coverHttp } from '@/lib/workspace/media/artwork';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string;assetId:string}>}){const p=await params;return coverHttp(request,p.id,p.assetId);}
