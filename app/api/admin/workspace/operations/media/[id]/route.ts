import {operationActor,operationFailure,operationBody} from '@/lib/workspace/operations/http';
import {recheckMedia} from '@/lib/workspace/operations/recovery';
import {privateJson} from '@/lib/workspace/http';
export const maxDuration=300;
export async function POST(r:Request,c:{params:Promise<{id:string}>}){try{const u=await operationActor(r,true);if(new URL(r.url).search)return privateJson({error:'Unexpected query.'},400);return privateJson(await recheckMedia(u.id,(await c.params).id,await operationBody(r,1024)));}catch(e){return operationFailure(e);}}
