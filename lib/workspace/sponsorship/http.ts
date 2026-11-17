import {getSession} from '@/lib/auth';
import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {privateJson,readJson} from '@/lib/workspace/http';
import {commerceOrigin} from '@/lib/commerce/http';
import {CommerceError} from '@/lib/commerce/model';
import {SponsorshipError} from './model';
import {sponsorshipService,type SponsorshipCommand} from './service';
export async function sponsorshipHttp(request:Request,admin=false){
 try{
  commerceOrigin(request);const actor=admin?await getAuthorizedAdminSession():await getSession();if(!actor)return privateJson({error:'Sign in again.'},401);
  if(request.method==='GET')return privateJson(await sponsorshipService().list(actor.id,admin?new URL(request.url).searchParams.get('creatorId')??'':actor.id));
  let raw;try{raw=await readJson(request,4096);}catch{return privateJson({error:'Invalid private offer request.'},400);}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return privateJson({error:'Invalid private offer request.'},400);
  const input=raw as SponsorshipCommand;
  if(admin?!['create','approve','withdraw'].includes(input.action):!['accept','decline'].includes(input.action))return privateJson({error:'Forbidden'},403);
  return privateJson(await sponsorshipService().execute(actor.id,input));
 }catch(e){if(e instanceof SponsorshipError||e instanceof CommerceError)return privateJson({error:e.message},e.status);return privateJson({error:'The private offer result could not be confirmed. Reload saved history before retrying the same request.'},503);}
}
