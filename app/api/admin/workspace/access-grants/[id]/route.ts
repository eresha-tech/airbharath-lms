import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {privateJson,readJson} from '@/lib/workspace/http';
import {eligibilitySameOrigin} from '@/lib/workspace/eligibility/request';
import {revokeAccessGrant} from '@/lib/workspace/access/repository';
import {GrantError} from '@/lib/workspace/access/model';
import {UUID} from '@/lib/workspace/eligibility/model';
import {grantFailure} from '@/lib/workspace/access/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{if(!eligibilitySameOrigin(request))throw new GrantError('forbidden');const actor=await getAuthorizedAdminSession();if(!actor)throw new GrantError('forbidden');const {id}=await params;if(!UUID.test(id))throw new GrantError('validation');let raw;try{raw=await readJson(request,4096)}catch{throw new GrantError('validation')}return privateJson({grant:await revokeAccessGrant(actor.id,id,raw)});}catch(e){return grantFailure(e);}}
