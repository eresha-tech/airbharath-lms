import { learnerMediaHttp } from '@/lib/workspace/publishing/delivery';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{courseId:string;lessonId:string;assetId:string;name:string}>}){const p=await params;return learnerMediaHttp(request,p.courseId,p.lessonId,p.assetId,p.name);}

export const HEAD = GET;
export const maxDuration = 60;
