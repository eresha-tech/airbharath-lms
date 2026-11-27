import {getWorkspaceUser} from '@/lib/workspace/eligibility/service';
import {eligibilitySameOrigin} from '@/lib/workspace/eligibility/request';
import {readJson,privateJson} from '@/lib/workspace/http';
import {MentorError} from '@/lib/mentorship/model';
import {mentorRepository} from '@/lib/mentorship/repository';
export async function POST(request:Request){try{
 if(!eligibilitySameOrigin(request))return privateJson({error:'A same-origin request is required.'},403);
 const user=await getWorkspaceUser();if(!user)return privateJson({error:'Please sign in to apply. No Creator membership is required.'},401);
 let body;try{body=await readJson(request,16384);}catch{return privateJson({error:'Send a valid application within the size limit.'},400);}
 const result=await mentorRepository().submit(user.id,body);return privateJson({saved:true,reference:result.id,created:result.created,message:'Application saved. No mentor profile, booking or paid service has been activated. This on-screen receipt confirms submission; no email acknowledgement was sent.'},result.created?201:200);
 }catch(e){return e instanceof MentorError?privateJson({error:e.message,fields:e.fields},e.status):privateJson({error:'Your application could not be confirmed. Retry using this form; duplicate submissions are protected.'},503);}}
