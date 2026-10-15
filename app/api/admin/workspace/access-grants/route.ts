import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {privateJson,readJson} from '@/lib/workspace/http';
import {eligibilitySameOrigin} from '@/lib/workspace/eligibility/request';
import {createAccessGrant} from '@/lib/workspace/access/repository';
import {GrantError} from '@/lib/workspace/access/model';
import {grantFailure} from '@/lib/workspace/access/http';
export async function POST(request:Request){try{if(!eligibilitySameOrigin(request))throw new GrantError('forbidden');const actor=await getAuthorizedAdminSession();if(!actor)throw new GrantError('forbidden');let raw;try{raw=await readJson(request,4096)}catch{throw new GrantError('validation')}return privateJson({grant:await createAccessGrant(actor.id,raw)},201);}catch(e){return grantFailure(e);}}
