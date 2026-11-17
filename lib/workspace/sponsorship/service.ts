import 'server-only';
import {randomUUID} from 'node:crypto';
import {sql,type SQL} from 'drizzle-orm';
import {db} from '@/lib/db';
import {addCalendarMonthsIST} from '@/lib/workspace/activation/model';
import {createAccessGrant,revokeAccessGrant} from '@/lib/workspace/access/repository';
import {currentCreatorTerms} from '@/lib/workspace/terms/model';
import {requireSyntheticSponsorship,sponsorshipSyntheticEnabled,type SponsorshipExecutor} from './config';
import {SYNTHETIC_AGREEMENT_BODY,SYNTHETIC_AGREEMENT_HASH,SYNTHETIC_AGREEMENT_VERSION,SponsorshipError,offerDeadline,sha256,type Arrangement} from './model';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function commercialRows<T extends Record<string,unknown>>(executor:SponsorshipExecutor,query:SQL){return Array.from(await executor.execute(query)) as T[];}
type Offer=Record<string,unknown>&{id:string;creator_id:string;scope:string;arrangement:Arrangement;duration_months:number;proposed_by:string;reason:string;legal_hash:string;legal_body:string;legal_version:string;command_hash:string;created_at:Date};
type Event=Record<string,unknown>&{id:string;agreement_id:string;action:string;actor_id:string;effective_at:Date;created_at:Date;grant_id:string|null};
export type SponsorshipCommand={action:'create'|'approve'|'accept'|'decline'|'withdraw';creatorId?:string;offerId?:string;requestKey:string;arrangement?:Arrangement;durationMonths?:number;reason?:string;acknowledged?:boolean;legalHash?:string;offerHash?:string};
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const hash=(v:unknown)=>sha256(JSON.stringify(v));
async function now(tx:SponsorshipExecutor){return new Date(String((await commercialRows<{at:string}>(tx,sql`select clock_timestamp() at`))[0].at));}
function command(raw:SponsorshipCommand){
 const keys=['action','creatorId','offerId','requestKey','arrangement','durationMonths','reason','acknowledged','legalHash','offerHash'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||!UUID.test(raw.requestKey)||!['create','approve','accept','decline','withdraw'].includes(raw.action))throw new SponsorshipError(400,'Invalid private offer request.');
 if(raw.action==='create'){if(!UUID.test(raw.creatorId??'')||!['standard_0','sponsored_20'].includes(raw.arrangement??'')||![3,6,12].includes(raw.durationMonths??0)||typeof raw.reason!=='string'||raw.reason.trim().length<10||raw.reason.length>1000||/[<>\u0000-\u001f]/.test(raw.reason))throw new SponsorshipError(400,'Choose a Creator, fixed arrangement, 3/6/12 months and a private reason.');}
 else if(!UUID.test(raw.offerId??''))throw new SponsorshipError(400,'Select the saved offer.');
 return hash(Object.fromEntries(Object.entries(raw).sort(([a],[b])=>a.localeCompare(b))));
}
async function lock(tx:Tx,actor:string,creator:string){const users=await commercialRows<{id:string;role:string}>(tx,sql`select id,role from users where id in (${actor}::uuid,${creator}::uuid) order by id for update`);if(!users.some(u=>u.id===actor)||!users.some(u=>u.id===creator))throw new SponsorshipError(404,'Account unavailable.');return users.find(u=>u.id===actor)!.role;}
export function sponsorshipService(database:typeof db=db){
 async function list(actor:string,creatorId=actor){
  if(!sponsorshipSyntheticEnabled())return {available:false,financialActivation:false,offers:[]};
  const scope=await requireSyntheticSponsorship(database);if(!UUID.test(creatorId))throw new SponsorshipError(400,'Select an account.');
  const [user]=await commercialRows<{role:string}>(database,sql`select role from users where id=${actor}::uuid`);if(!user||actor!==creatorId&&user.role!=='admin')throw new SponsorshipError(403,'Forbidden');
  const offers=await commercialRows<Offer>(database,sql`select * from creator_commercial_agreements where creator_id=${creatorId}::uuid and scope=${scope} order by created_at desc,id limit 30`);
  const result=[];
  for(const offer of offers){
   const events=await commercialRows<Event>(database,sql`select * from creator_commercial_events where agreement_id=${offer.id}::uuid order by sequence`);
   const approved=events.find(e=>e.action==='approved'),end=events.find(e=>['replaced_paid','released_0'].includes(e.action)&&new Date(e.effective_at)<=new Date()),accepted=events.find(e=>e.action==='accepted');
   const state=end?'replaced':accepted?'accepted':events.some(e=>e.action==='declined')?'declined':events.some(e=>e.action==='withdrawn')?'withdrawn':approved&&offerDeadline(new Date(approved.created_at))<=new Date()?'expired':approved?'awaiting_acceptance':'awaiting_approval';
   result.push({id:offer.id,arrangement:offer.arrangement,durationMonths:offer.duration_months,legalBody:offer.legal_body,legalVersion:offer.legal_version,legalHash:offer.legal_hash,offerHash:offer.command_hash,state,expiresAt:approved?offerDeadline(new Date(approved.created_at)).toISOString():null,grantId:accepted?.grant_id??null,effectiveAt:accepted?new Date(accepted.effective_at).toISOString():null,events:events.map(e=>({action:e.action,effectiveAt:new Date(e.effective_at).toISOString()})),...(user.role==='admin'?{proposedBy:offer.proposed_by,reason:offer.reason}: {})});
  }
  return {available:true,financialActivation:false,offers:result};
 }
 async function execute(actor:string,raw:SponsorshipCommand){
  const scope=await requireSyntheticSponsorship(database),fingerprint=command(raw);
  return database.transaction(async tx=>{
   const [offer]=raw.offerId?await commercialRows<Offer>(tx,sql`select * from creator_commercial_agreements where id=${raw.offerId}::uuid and scope=${scope}`):[];
   if(raw.action!=='create'&&!offer)throw new SponsorshipError(404,'Private offer unavailable.');
   const creator=offer?.creator_id??raw.creatorId!,role=await lock(tx,actor,creator),admin=role==='admin'&&actor!==creator;
   if(['create','approve','withdraw'].includes(raw.action)&&!admin||['accept','decline'].includes(raw.action)&&actor!==creator)throw new SponsorshipError(403,'Forbidden');
   const [prior]=await commercialRows<{id:string;command_hash:string}>(tx,raw.action==='create'?sql`select id,command_hash from creator_commercial_agreements where proposed_by=${actor}::uuid and request_key=${raw.requestKey}::uuid`:sql`select agreement_id id,command_hash from creator_commercial_events where actor_id=${actor}::uuid and request_key=${raw.requestKey}::uuid`);
   if(prior){if(prior.command_hash!==fingerprint)throw new SponsorshipError(409,'This request key belongs to another operation.');return {id:prior.id,replayed:true};}
   if(raw.action==='create'){
    const id=randomUUID();await tx.execute(sql`insert into creator_commercial_agreements(id,creator_id,scope,arrangement,duration_months,proposed_by,reason,legal_version,legal_body,legal_hash,request_key,command_hash) values(${id}::uuid,${creator}::uuid,${scope},${raw.arrangement},${raw.durationMonths},${actor}::uuid,${raw.reason!.trim()},${SYNTHETIC_AGREEMENT_VERSION},${SYNTHETIC_AGREEMENT_BODY},${SYNTHETIC_AGREEMENT_HASH},${raw.requestKey}::uuid,${fingerprint})`);return {id,replayed:false};
   }
   if(!offer)throw new SponsorshipError(404,'Private offer unavailable.');
   const events=await commercialRows<Event>(tx,sql`select * from creator_commercial_events where agreement_id=${offer.id}::uuid order by sequence`),approved=events.find(e=>e.action==='approved');
   if(events.some(e=>['accepted','declined','withdrawn'].includes(e.action)))throw new SponsorshipError(409,'This offer already has a final decision.');
   let grantId:string|null=null,at=await now(tx);
   if(raw.action==='approve'&&(actor===offer.proposed_by||approved))throw new SponsorshipError(403,'A different authorized Admin must approve this exact offer.');
   if(['accept','decline'].includes(raw.action)&&(!approved||offerDeadline(new Date(approved.created_at))<=at))throw new SponsorshipError(409,'This offer is not approved or has expired.');
   if(raw.action==='accept'){
    if(raw.acknowledged!==true||raw.legalHash!==offer.legal_hash||raw.offerHash!==offer.command_hash)throw new SponsorshipError(400,'Review and explicitly accept the exact saved agreement.');
    const terms=currentCreatorTerms();const accepted=await commercialRows(tx,sql`select id from workspace_creator_terms_acceptances where user_id=${creator}::uuid and terms_version=${terms.version} and terms_content_hash=${terms.contentHash}`);if(!accepted.length)throw new SponsorshipError(409,'Accept the current Creator Terms separately before this offer.');
    const paid=await commercialRows(tx,sql`select m.id from workspace_memberships m join workspace_membership_orders o on o.id=m.membership_order_id left join workspace_refund_completions r on r.membership_order_id=o.id where m.user_id=${creator}::uuid and o.activation_state='fulfilled' and r.id is null and m.ends_at>clock_timestamp()`);if(paid.length)throw new SponsorshipError(409,'Existing paid time cannot be replaced by a sponsored grant.');
    const active=await commercialRows<{id:string}>(tx,sql`select a.id from creator_commercial_agreements a join creator_commercial_events e on e.agreement_id=a.id and e.action='accepted' where a.creator_id=${creator}::uuid and a.scope=${scope} and a.arrangement='sponsored_20' and not exists(select 1 from creator_commercial_events ending where ending.agreement_id=a.id and ending.action in ('replaced_paid','released_0') and ending.effective_at<=clock_timestamp())`);
    if(active.length&&offer.arrangement==='sponsored_20')throw new SponsorshipError(409,'An accepted sponsored agreement already applies.');
    if(active.length&&offer.arrangement==='standard_0'){
     const [old]=await commercialRows<{id:string;expires_at:Date}>(tx,sql`select id,expires_at from workspace_access_grants where user_id=${creator}::uuid and environment='test' and status='active' and expires_at>clock_timestamp()`);
     if(old){if(addCalendarMonthsIST(at,offer.duration_months)<new Date(old.expires_at))throw new SponsorshipError(409,'Choose a term that preserves all remaining complimentary time.');await revokeAccessGrant(offer.proposed_by,old.id,{requestKey:randomUUID(),reason:'Explicit accepted 0% replacement preserves remaining access',confirmed:true},tx as unknown as typeof db);}
    }
    const grant=await createAccessGrant(offer.proposed_by,{targetUserId:creator,reason:'Synthetic private offer accepted: '+offer.id,durationMonths:offer.duration_months,requestKey:raw.requestKey},tx as unknown as typeof db);grantId=grant.id;at=grant.startsAt;
    if(offer.arrangement==='standard_0')for(const old of active)await tx.execute(sql`insert into creator_commercial_events(agreement_id,creator_id,actor_id,action,request_key,command_hash,grant_id,effective_at) values(${old.id}::uuid,${creator}::uuid,${creator}::uuid,'released_0',${randomUUID()}::uuid,${sha256(offer.id)},${grantId}::uuid,${at.toISOString()}::timestamptz)`);
   }
   await tx.execute(sql`insert into creator_commercial_events(agreement_id,creator_id,actor_id,action,request_key,command_hash,grant_id,effective_at) values(${offer.id}::uuid,${creator}::uuid,${actor}::uuid,${raw.action==='approve'?'approved':raw.action==='accept'?'accepted':raw.action==='decline'?'declined':'withdrawn'},${raw.requestKey}::uuid,${fingerprint},${grantId}::uuid,${at.toISOString()}::timestamptz)`);
   return {id:offer.id,replayed:false,grantId};
  });
 }
 return {list,execute};
}
