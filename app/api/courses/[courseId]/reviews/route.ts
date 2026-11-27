import { reviewHttp } from '@/lib/reviews/http';
type Context={params:Promise<{courseId:string}>};
export async function GET(r:Request,c:Context){return reviewHttp(r,(await c.params).courseId);}
export async function POST(r:Request,c:Context){return reviewHttp(r,(await c.params).courseId);}
export async function DELETE(r:Request,c:Context){return reviewHttp(r,(await c.params).courseId);}
