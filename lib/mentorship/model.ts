import {normalizeProfileUrl,UUID} from '@/lib/workspace/eligibility/model';
import {normalizeEmail} from '@/lib/workspace/email/model';
export const SPECIALISATIONS=[['flight_operations','Pilots & Flight Operations'],['cabin_crew','Cabin Crew & Inflight Operations'],['ground_operations','Airport & Ground Operations'],['safety_quality','Aviation Safety & Quality'],['maintenance','Aircraft Maintenance & Engineering'],['training','Aviation Training & Instruction'],['management_other','Aviation Management & Other Specialisations']] as const;
export const REVIEW_STATUSES=['submitted','under_review','shortlisted','not_selected','contacted'] as const;
export type ReviewStatus=typeof REVIEW_STATUSES[number];
export const STATUS_LABELS:Record<ReviewStatus,string>={submitted:'Submitted',under_review:'Under Review',shortlisted:'Shortlisted',not_selected:'Not Selected',contacted:'Contacted'};
export const MENTOR_CONSENT_VERSION='aviation-mentor-preregistration-v1';
export const MENTOR_CONSENT='I agree that AirBharath may use the details I submit to assess my mentor application and contact me about its review and mentorship onboarding. This does not subscribe me to general marketing.';
export const MENTOR_ADULT='I confirm that I am at least 18 years old and that my submitted professional information is accurate.';
export class MentorError extends Error{constructor(public status:number,message:string,public fields:Record<string,string>={}){super(message);}}
export type ApplicationInput={requestKey:string;fullName:string;email:string;phone:string;specialisation:typeof SPECIALISATIONS[number][0];professionalRole:string;yearsExperience:number;profileUrl:string;description:string;adult:true;consent:true;consentVersion:string};
const plain=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function applicationInput(raw:unknown):ApplicationInput{
 if(!plain(raw))throw new MentorError(400,'Check the application fields.');const r=raw as Record<string,unknown>,errors:Record<string,string>={};
 const fields=['requestKey','fullName','email','phone','specialisation','professionalRole','yearsExperience','profileUrl','description','adult','consent','consentVersion','website'];
 if(Object.keys(r).some(k=>!fields.includes(k))||!UUID.test(String(r.requestKey))||r.website!==undefined&&r.website!=='')throw new MentorError(400,'Check the application and try again.');
 const text=(key:string,min:number,max:number)=>{const v=typeof r[key]==='string'?(r[key] as string).trim():'';if(v.length<min||v.length>max||(key==='description'?/[\u0000-\u0008\u000b-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(v))errors[key]=`Use ${min}–${max} characters.`;return v;};
 const fullName=text('fullName',2,120),professionalRole=text('professionalRole',2,160),description=text('description',30,2000),phone=text('phone',0,24),profile=text('profileUrl',0,2048),email=normalizeEmail(r.email);
 if(!email)errors.email='Enter a valid contact email.';
 if(phone&&(!/^\+?[0-9 ()-]{7,24}$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15))errors.phone='Enter a phone number with country code, or leave it blank.';
 if(!SPECIALISATIONS.some(([key])=>key===r.specialisation))errors.specialisation='Choose your aviation specialisation.';
 if(!Number.isInteger(r.yearsExperience)||Number(r.yearsExperience)<0||Number(r.yearsExperience)>70)errors.yearsExperience='Enter whole years from 0 to 70.';
 const profileUrl=profile?normalizeProfileUrl(profile):'';if(profile&&(!profileUrl||profileUrl.length>2048))errors.profileUrl='Use a public professional HTTPS profile URL without credentials.';
 if(r.adult!==true)errors.adult='Confirm adult eligibility and accuracy.';
 if(r.consent!==true||r.consentVersion!==MENTOR_CONSENT_VERSION)errors.consent='Review and accept the current privacy/contact consent.';
 if(Object.keys(errors).length)throw new MentorError(400,'Please check the highlighted fields.',errors);
 return {requestKey:String(r.requestKey),fullName,email:email!,phone,specialisation:r.specialisation as ApplicationInput['specialisation'],professionalRole,yearsExperience:Number(r.yearsExperience),profileUrl:profileUrl!,description,adult:true,consent:true,consentVersion:MENTOR_CONSENT_VERSION};
}
export function reviewInput(raw:unknown){if(!plain(raw))throw new MentorError(400,'Check the review action.');const r=raw as Record<string,unknown>;if(Object.keys(r).some(k=>!['requestKey','expectedVersion','status','note'].includes(k))||!UUID.test(String(r.requestKey))||!Number.isSafeInteger(r.expectedVersion)||Number(r.expectedVersion)<1||!(REVIEW_STATUSES as readonly unknown[]).includes(r.status)||r.status==='submitted'||typeof r.note!=='string'||r.note.trim().length<3||r.note.length>2000||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(r.note))throw new MentorError(400,'Choose a review status and add a private screening note (3–2000 characters).');return {requestKey:String(r.requestKey),expectedVersion:Number(r.expectedVersion),status:r.status as ReviewStatus,note:r.note.trim()};}
export function mentorFilters(q:Record<string,string|string[]|undefined>){const page=Number(q.page??1),search=q.q??'',status=q.status??'all',specialisation=q.specialisation??'all';if(!Number.isInteger(page)||page<1||page>500||typeof search!=='string'||search.length>120||typeof status!=='string'||status!=='all'&&!(REVIEW_STATUSES as readonly string[]).includes(status)||typeof specialisation!=='string'||specialisation!=='all'&&!SPECIALISATIONS.some(([key])=>key===specialisation))throw new MentorError(400,'Check the search filters.');return {page,search,status,specialisation};}
