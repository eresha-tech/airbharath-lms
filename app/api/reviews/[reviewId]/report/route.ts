import { reviewHttp } from '@/lib/reviews/http';
export async function POST(r:Request,c:{params:Promise<{reviewId:string}>}){return reviewHttp(r,(await c.params).reviewId,'report');}
