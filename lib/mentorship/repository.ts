import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {applicationInput,reviewInput,withdrawalInput,MentorError,MENTOR_CONSENT,MENTOR_ADULT,mentorFilters,type ReviewStatus} from './model';
import {UUID} from '@/lib/workspace/eligibility/model';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export type MentorApplication={id:string;owner_id:string;full_name:string;email:string;phone:string;specialisation:string;professional_role:string;years_experience:number;profile_url:string;description:string;status:ReviewStatus;withdrawn_at?:Date|string|null;version:number;consent_version:string;consent_text:string;adult_text:string;submitted_at:Date|string;updated_at:Date|string};
export function mentorRepository(database=db){
 async function submit(owner:string,raw:unknown){
  // Count invalid attempts too; persist no applicant data until validation passes.
  const result=await database.transaction(async tx=>{
   const [user]=await tx.execute(sql`select id from users where id=${owner} for update`);if(!user)throw new MentorError(401,'Please sign in again.');
   const [limit]=await tx.execute(sql`insert into mentor_submission_limits(user_id,window_start,attempts) values(${owner},now(),1) on conflict(user_id) do update set window_start=case when mentor_submission_limits.window_start<now()-interval '15 minutes' then now() else mentor_submission_limits.window_start end,attempts=case when mentor_submission_limits.window_start<now()-interval '15 minutes' then 1 else least(mentor_submission_limits.attempts+1,21) end returning attempts`);
   if(Number(limit.attempts)>20)return {limited:true as const};
   let input;try{input=applicationInput(raw);}catch(error){if(error instanceof MentorError)return {validation:error};throw error;}
   const {requestKey,...details}=input,digest=hash(details);
   const [prior]=await tx.execute(sql`select id,payload_hash,submission_key from mentor_applications where owner_id=${owner}`);
   if(prior){if((await tx.execute(sql`select application_id from mentor_withdrawals where application_id=${prior.id}`)).length)return {withdrawn:true as const};if(prior.payload_hash!==digest) return {conflict:true as const};return {id:String(prior.id),created:false};}
   await tx.execute(sql`select set_config('airbharath.mentor_actor',${owner},true)`);
   const id=randomUUID();const inserted=await tx.execute(sql`insert into mentor_applications(id,owner_id,submission_key,payload_hash,full_name,email,phone,specialisation,professional_role,years_experience,profile_url,description,consent_version,consent_text,adult_text) values(${id},${owner},${requestKey},${digest},${details.fullName},${details.email},${details.phone},${details.specialisation},${details.professionalRole},${details.yearsExperience},${details.profileUrl},${details.description},${details.consentVersion},${MENTOR_CONSENT},${MENTOR_ADULT}) on conflict do nothing returning id`);
   if(!inserted.length)return {conflict:true as const};return {id,created:true};
  });
  if('withdrawn'in result)throw new MentorError(409,'Your application is withdrawn. Submitting again cannot restart screening or contact.');
  if('validation'in result)throw result.validation;
  if('limited'in result)throw new MentorError(429,'Please wait 15 minutes before trying again.');
  if('conflict'in result)throw new MentorError(409,'These details cannot create another application. Review your saved application or contact support to correct it.');
  return result;
 }
 async function own(owner:string){const [r]=await database.execute(sql`select id,status,submitted_at,(select created_at from mentor_withdrawals w where w.application_id=mentor_applications.id) withdrawn_at from mentor_applications where owner_id=${owner} and exists(select 1 from users where id=${owner})`);return r as {id:string;status:ReviewStatus;submitted_at:Date|string;withdrawn_at:Date|string|null}|undefined;}
 async function adminRead(actor:string,id:string|null=null,query:Record<string,string|string[]|undefined>={}){if(id&&!UUID.test(id))throw new MentorError(404,'Application not found.');const filters=mentorFilters(query);return database.transaction(async tx=>{
  await tx.execute(sql`set transaction isolation level repeatable read read only`);if(!(await tx.execute(sql`select id from users where id=${actor} and role='admin'`)).length)throw new MentorError(403,'Administrator access is required.');
  if(id){const [application]=await tx.execute(sql`select a.*,(select created_at from mentor_withdrawals w where w.application_id=a.id) withdrawn_at from mentor_applications a where a.id=${id}`);if(!application)throw new MentorError(404,'Application not found.');if(application.withdrawn_at)return {application:{id:application.id,withdrawn_at:application.withdrawn_at,full_name:'Withdrawn application'} as MentorApplication,history:[],more:false,rows:[] as MentorApplication[],filters};const history=await tx.execute(sql`select e.id,e.status,e.note,e.created_at,u.full_name actor from mentor_review_events e join users u on u.id=e.actor_id where application_id=${id} order by e.version desc limit 26 offset ${(filters.page-1)*25}`);return {application:application as unknown as MentorApplication,history:history.slice(0,25) as unknown as {id:string;status:ReviewStatus;note:string;created_at:Date|string;actor:string}[],more:history.length>25,rows:[] as MentorApplication[],filters};}
  const search=filters.search.replace(/[\\%_]/g,'\\$&')+'%';const rows=await tx.execute(sql`select id,full_name,email,specialisation,professional_role,years_experience,status,submitted_at,updated_at from mentor_applications where not exists(select 1 from mentor_withdrawals w where w.application_id=mentor_applications.id) and (${filters.status}='all' or status=${filters.status}) and (${filters.specialisation}='all' or specialisation=${filters.specialisation}) and (${filters.search}='' or full_name ilike ${search} or email ilike ${search}) order by submitted_at desc,id desc limit 21 offset ${(filters.page-1)*20}`);return {application:null,history:[],rows:rows.slice(0,20) as unknown as MentorApplication[],more:rows.length>20,filters};
 });}
 async function review(actor:string,id:string,raw:unknown){if(!UUID.test(id))throw new MentorError(404,'Application not found.');const c=reviewInput(raw),digest=hash({id,...c});return database.transaction(async tx=>{
  const [user]=await tx.execute(sql`select id from users where id=${actor} and role='admin' for share`);if(!user)throw new MentorError(403,'Administrator access is required.');
  const [row]=await tx.execute(sql`select id,version from mentor_applications where id=${id} for update`);if(!row)throw new MentorError(404,'Application not found.');if((await tx.execute(sql`select application_id from mentor_withdrawals where application_id=${id}`)).length)throw new MentorError(409,'This application is withdrawn. Screening and contact are stopped.');const [prior]=await tx.execute(sql`select command_hash,version from mentor_review_events where actor_id=${actor} and request_key=${c.requestKey}`);if(prior){if(prior.command_hash!==digest)throw new MentorError(409,'Request key already used.');return {version:Number(prior.version)};}
  if(Number(row.version)!==c.expectedVersion)throw new MentorError(409,'This application changed. Reload before saving your review.');const version=c.expectedVersion+1;await tx.execute(sql`select set_config('airbharath.mentor_actor',${actor},true)`);await tx.execute(sql`update mentor_applications set status=${c.status},version=${version},updated_at=now() where id=${id}`);await tx.execute(sql`insert into mentor_review_events(application_id,actor_id,request_key,command_hash,version,status,note) values(${id},${actor},${c.requestKey},${digest},${version},${c.status},${c.note})`);return {version};
 });}
 async function withdraw(owner:string,raw:unknown){const c=withdrawalInput(raw);return database.transaction(async tx=>{
  if(!(await tx.execute(sql`select id from users where id=${owner} for share`)).length)throw new MentorError(401,'Please sign in again.');
  const [application]=await tx.execute(sql`select id from mentor_applications where owner_id=${owner} for update`);if(!application)throw new MentorError(404,'Application not found.');
  const [prior]=await tx.execute(sql`select created_at from mentor_withdrawals where application_id=${application.id}`);if(prior)return {id:String(application.id),withdrawnAt:prior.created_at};
  await tx.execute(sql`select set_config('airbharath.mentor_actor',${owner},true)`);
  const [event]=await tx.execute(sql`insert into mentor_withdrawals(application_id,owner_id,request_key) values(${application.id},${owner},${c.requestKey}) returning created_at`);
  return {id:String(application.id),withdrawnAt:event.created_at};
 });}
 return {submit,own,adminRead,review,withdraw};
}
