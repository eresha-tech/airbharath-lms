import 'server-only';
import { getSession } from '@/lib/auth';
import { isSameOrigin, privateJson, readJson } from '@/lib/workspace/http';
import { UUID, ReviewError } from './model';
import { mutateReview, readReviews, reportReview, moderateReview } from './repository';
export function reviewFailure(error:unknown) {
  if(error instanceof ReviewError) return privateJson({error:error.message},error.status);
  const e=error as { code?:string; message?:string; cause?:{code?:string;message?:string} };
  const message=e.cause?.message ?? e.message ?? '';
  if (message.includes('review_rate_limit')) return privateJson({error:'Please wait a minute between review changes; up to five changes per day.'},429);
  if (e.code==='23505' || e.cause?.code==='23505') return privateJson({error:'A review already exists. Refresh to edit it.'},409);
  return privateJson({error:'Reviews are temporarily unavailable. Please try again.'},503);
}
export async function reviewHttp(request:Request,id:string,kind:'course'|'report'|'moderate'='course',adminId?:string) {
  try {
    if (!UUID.test(id)) throw new ReviewError(400,'Invalid identifier.');
    if (request.method!=='GET' && (!isSameOrigin(request) || request.headers.get('sec-fetch-site')==='cross-site')) throw new ReviewError(403,'Request origin is not allowed.');
    const actor = adminId ?? (await getSession())?.id;
    if (request.method==='GET') return privateJson(await readReviews(id,actor ?? null,Number(new URL(request.url).searchParams.get('page'))||1));
    if (!actor) throw new ReviewError(401,'Sign in to continue.');
    let body;try {body=await readJson(request,8192);}catch{throw new ReviewError(400,'Invalid request.');}
    if(kind==='report') return privateJson(await reportReview(actor,id,(body as Record<string,unknown>)?.reason));
    if(kind==='moderate') return privateJson(await moderateReview(actor,id,body));
    return privateJson(await mutateReview(actor,id,body,request.method==='DELETE'));
  } catch(error) { return reviewFailure(error); }
}
