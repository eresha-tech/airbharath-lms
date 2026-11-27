import { privateJson, isSameOrigin } from '@/lib/workspace/http';
import { CommerceError } from './model';
export function commerceOrigin(request:Request) {
 if(!isSameOrigin(request)||request.headers.get('sec-fetch-site')==='cross-site') throw new CommerceError(403,'Request origin is not allowed.');
}
export function commerceFailure(error:unknown) {
 if(error instanceof CommerceError) return privateJson({error:error.message},error.status);
 console.error('[commerceFailure]', error instanceof Error ? { name: error.name, message: error.message } : error);
 return privateJson({error:'Payment confirmation is temporarily unavailable. Your order can be retried safely.'},503);
}
