import {getWorkspaceUser} from '@/lib/workspace/eligibility/service';
import {eligibilitySameOrigin} from '@/lib/workspace/eligibility/request';
import {readJson,privateJson} from '@/lib/workspace/http';
import {MentorError} from '@/lib/mentorship/model';
import {mentorRepository} from '@/lib/mentorship/repository';
export async function POST(request:Request){try{
 if(!eligibilitySameOrigin(request))return privateJson({error:'A same-origin request is required.'},403);
 const user=await getWorkspaceUser();if(!user)return privateJson({error:'Please sign in to withdraw your application.'},401);
 let body;try{body=await readJson(request,1024);}catch{return privateJson({error:'Confirm your withdrawal using this form.'},400);}
 const result=await mentorRepository().withdraw(user.id,body);return privateJson({reference:result.id,withdrawn:true,message:'Your application is withdrawn. Screening and routine mentorship contact are stopped. This does not delete your saved records.'});
 }catch(e){return e instanceof MentorError?privateJson({error:e.message},e.status):privateJson({error:'Withdrawal could not be confirmed. Retry safely using this form.'},503);}}
