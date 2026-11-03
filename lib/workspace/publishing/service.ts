import type { workspacePublicationStates, workspacePublicationRevisions, workspacePublicationPrices, workspaceTrustedCreators } from '@/lib/db/schema';
import { command, hash, adminActions, readiness, revisionReceipt, PublishingError, type FrozenCourse, type PublicationMetadata, type PublicationCommand } from './model';
export type State=typeof workspacePublicationStates.$inferSelect;
export type Revision=typeof workspacePublicationRevisions.$inferSelect;
export type Price=typeof workspacePublicationPrices.$inferSelect;
export type Trust=typeof workspaceTrustedCreators.$inferSelect;
export type Context={ownerId:string;profileId:string;profileStatus:string;admin:boolean;canView:boolean;canEdit:boolean;defaults:PublicationMetadata;trust:Trust|null};
export interface PublishingTx{
 context:Context;state:State|null;revisions:Revision[];prices:Price[];
 prior(key:string):Promise<{commandHash:string;result:Record<string,unknown>}|null>;
 capture(metadata:PublicationMetadata):Promise<FrozenCourse>;
 revision(snapshot:FrozenCourse,digest:string,at:Date):Promise<Revision>;
 review(revision:Revision,status:Revision['status'],feedback:string,actor:string,at:Date):Promise<void>;
 price(amount:number,at:Date):Promise<Price>;
 decidePrice(price:Price,status:'approved'|'rejected',note:string,actor:string,at:Date):Promise<void>;
 trust(trusted:boolean,expected:number,actor:string,note:string,at:Date):Promise<void>;
 publish(snapshot:FrozenCourse,revision:Revision,price:Price,actor:string,at:Date):Promise<string>;
 visibility(state:'unpublished'|'suspended',at:Date):Promise<void>;
 save(state:State):Promise<void>;
 event(action:string,key:string,digest:string,note:string,result:Record<string,unknown>,at:Date):Promise<void>;
 history():Promise<{action:string;createdAt:Date;note:string}[]>;
 artwork():Promise<{id:string;displayName:string}[]>;
}
export interface PublishingStore{transaction<T>(actor:string,project:string,work:(tx:PublishingTx)=>Promise<T>):Promise<T>}
export function publishingService(store:PublishingStore,clock=()=>new Date(),enabled=()=>false){
 return {
 read:(actor:string,project:string)=>store.transaction(actor,project,async tx=>{
  if(!tx.context.admin&&(!tx.context.canView||tx.context.ownerId!==actor))throw new PublishingError('forbidden');
  return {projectId:project,version:tx.state?.version??0,metadata:tx.state?.metadata??tx.context.defaults,status:tx.state?.status??'draft',courseId:tx.state?.courseId??null,currentRevisionId:tx.state?.currentRevisionId??null,currentPriceId:tx.state?.currentPriceId??null,canEdit:tx.context.ownerId===actor&&tx.context.canEdit,admin:tx.context.admin,independentAdmin:tx.context.admin&&tx.context.ownerId!==actor,trusted:!!tx.context.trust?.trusted,trustVersion:tx.context.trust?.version??0,publishingEnabled:enabled(),revisions:tx.revisions.map(revisionReceipt),prices:tx.prices,history:(await tx.history()).map(e=>({...e,note:tx.context.admin||e.action==='request_changes'?e.note:''})),artwork:await tx.artwork()};
 }),
 execute:(actor:string,project:string,raw:unknown)=>{
  const c=command(raw),digest=hash({project,...c});
  return store.transaction(actor,project,async tx=>{
   const x=tx.context,isAdminAction=adminActions.has(c.action),management=['publish','unpublish'].includes(c.action);
   if(isAdminAction&&!x.admin)throw new PublishingError('forbidden');
   if(isAdminAction&&['approve_content','approve_price','reject_price','grant_trust','revoke_trust'].includes(c.action)&&actor===x.ownerId)throw new PublishingError('forbidden');
   if(!isAdminAction&&!(management&&x.admin)&&(actor!==x.ownerId||!x.canEdit))throw new PublishingError('forbidden');
   if(c.action==='publish'&&(!x.canEdit||x.profileStatus!=='enabled'))throw new PublishingError('forbidden');
   const prior=await tx.prior(c.requestKey);if(prior){if(prior.commandHash!==digest)throw new PublishingError('conflict');return prior.result;}
   const now=clock();const s:State=tx.state??{projectId:project,userId:x.ownerId,version:0,metadata:x.defaults,status:'draft',courseId:null,currentRevisionId:null,currentPriceId:null,updatedAt:now};
   if(s.version!==c.expectedVersion)throw new PublishingError('conflict');
   let result:Record<string,unknown>={};
   if(c.action==='save_metadata')s.metadata=c.metadata!;
   if(c.action==='submit'){
    const latest=tx.revisions[0];if(latest&&['submitted','under_review'].includes(latest.status)&&latest.id!==s.currentRevisionId)throw new PublishingError('conflict',['A submitted revision is already awaiting review.']);
    const snapshot=await tx.capture(s.metadata),issues=readiness(snapshot);if(issues.length)throw new PublishingError('not_ready',issues);
    const contentHash=hash(snapshot);if(latest?.contentHash===contentHash)throw new PublishingError('conflict',['Change saved content or metadata before resubmitting.']);
    const revision=await tx.revision(snapshot,contentHash,now);result={revisionId:revision.id,revisionNumber:revision.number};
   }
   if(['start_review','approve_content','request_changes'].includes(c.action)){
    const r=tx.revisions.find(r=>r.id===c.revisionId);if(!r)throw new PublishingError('not_found');
    if(c.action==='start_review'&&r.status!=='submitted'||c.action!=='start_review'&&!['submitted','under_review'].includes(r.status))throw new PublishingError('conflict');
    const status=c.action==='start_review'?'under_review':c.action==='approve_content'?'approved':'changes_requested';await tx.review(r,status,c.note??'',actor,now);result={revisionId:r.id,reviewStatus:status};
   }
   if(c.action==='propose_price'){
    if(tx.prices.some(p=>p.status==='proposed'))throw new PublishingError('conflict',['A price proposal is awaiting Admin approval.']);
    const p=await tx.price(c.amountPaise!,now);result={priceId:p.id,amountPaise:p.amountPaise};
   }
   if(c.action==='approve_price'||c.action==='reject_price'){
    const p=tx.prices.find(p=>p.id===c.priceId);if(!p)throw new PublishingError('not_found');if(p.status!=='proposed')throw new PublishingError('conflict');await tx.decidePrice(p,c.action==='approve_price'?'approved':'rejected',c.note??'',actor,now);result={priceId:p.id,priceStatus:c.action==='approve_price'?'approved':'rejected'};
   }
   if(c.action==='grant_trust'||c.action==='revoke_trust'){
    if((x.trust?.version??0)!==c.expectedTrustVersion||c.action==='grant_trust'&&(x.profileStatus!=='enabled'||!x.canEdit))throw new PublishingError('conflict');await tx.trust(c.action==='grant_trust',c.expectedTrustVersion!,actor,c.note!,now);result={trusted:c.action==='grant_trust',trustVersion:c.expectedTrustVersion!+1};
   }
   if(c.action==='publish'){
    if(!enabled())throw new PublishingError('disabled');if(s.status==='suspended')throw new PublishingError('suspended');
    const r=tx.revisions.find(r=>r.id===c.revisionId);if(!r)throw new PublishingError('not_found');
    if(r.status!=='approved'&&!(x.trust?.trusted&&r.status==='submitted'))throw new PublishingError('approval_required');
    const issues=readiness(r.snapshot);if(issues.length||hash(r.snapshot)!==r.contentHash)throw new PublishingError('not_ready',issues);
    const p=tx.prices.filter(p=>p.status==='approved').sort((a,b)=>b.number-a.number)[0];if(!p||p.id!==c.priceId||p.decidedBy===x.ownerId)throw new PublishingError('price_required');
    s.courseId=await tx.publish(r.snapshot,r,p,actor,now);s.currentRevisionId=r.id;s.currentPriceId=p.id;s.status='live';result={courseId:s.courseId,revisionId:r.id,priceId:p.id};
   }
   if(c.action==='unpublish'||c.action==='suspend'||c.action==='restore'){
    if(!s.courseId)throw new PublishingError('not_ready');if(s.status==='suspended'&&c.action==='unpublish'||s.status!=='suspended'&&c.action==='restore')throw new PublishingError('conflict');
    s.status=c.action==='suspend'?'suspended':'unpublished';await tx.visibility(s.status,now);result={courseId:s.courseId,status:s.status};
   }
   s.version++;s.updatedAt=now;await tx.save(s);result={...result,version:s.version,status:s.status};await tx.event(c.action,c.requestKey,digest,c.note??'',result,now);return result;
  });
 }
 };
}
export type PublishingView=Awaited<ReturnType<ReturnType<typeof publishingService>['read']>>;
export type ParsedPublicationCommand=PublicationCommand;
