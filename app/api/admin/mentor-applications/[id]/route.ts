import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {eligibilitySameOrigin} from '@/lib/workspace/eligibility/request';
import {readJson,privateJson} from '@/lib/workspace/http';
import {MentorError} from '@/lib/mentorship/model';
import {mentorRepository} from '@/lib/mentorship/repository';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{
 const admin=await getAuthorizedAdminSession();if(!admin)return privateJson({error:'Administrator access is required.'},403);
 if(!eligibilitySameOrigin(request))return privateJson({error:'A same-origin request is required.'},403);
 let body;try{body=await readJson(request,12288);}catch{return privateJson({error:'Send a valid bounded review action.'},400);}
 return privateJson(await mentorRepository().review(admin.id,(await context.params).id,body));
 }catch(e){return e instanceof MentorError?privateJson({error:e.message},e.status):privateJson({error:'The review could not be confirmed. Reload before retrying.'},503);}}
