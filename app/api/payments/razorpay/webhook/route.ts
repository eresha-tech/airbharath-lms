import { receiveCourseWebhook } from '@/lib/creator-payments/webhook';
import { privateJson } from '@/lib/workspace/http';
import { commerceFailure } from '@/lib/commerce/http';
export const runtime='nodejs';
export async function POST(request:Request) {try{return privateJson(await receiveCourseWebhook(request));}catch(e){return commerceFailure(e);}}
