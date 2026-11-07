import type { workspacePublicationStates, workspacePublicationRevisions, workspacePublicationPrices, workspaceTrustedCreators } from '@/lib/db/schema';
import { randomUUID } from 'node:crypto';
import { PUBLISHING_GUIDELINES,GUIDELINE_HASH,currentGuidelines,publishRestricted } from './policy';
import { command, hash, adminActions, readiness, revisionReceipt, PublishingError, type FrozenCourse, type PublicationMetadata, type PublicationCommand } from './model';
type StoredState=typeof workspacePublicationStates.$inferSelect;
export type State=Omit<StoredState,'guidelines'|'moderation'>&Partial<Pick<StoredState,'guidelines'|'moderation'>>;
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
 reprice?(revision:Revision,price:Price,actor:string,at:Date):Promise<void>;
 notices?():Promise<{id:string;message:string;createdAt:Date}[]>;
 visibility(state:'unpublished'|'suspended'|'live',at:Date):Promise<void>;
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
  return {projectId:project,version:tx.state?.version??0,metadata:tx.state?.metadata??tx.context.defaults,status:tx.state?.status??'draft',courseId:tx.state?.courseId??null,currentRevisionId:tx.state?.currentRevisionId??null,currentPriceId:tx.state?.currentPriceId??null,canRespond:tx.context.ownerId===actor&&tx.context.canView&&tx.context.profileStatus==='enabled',canEdit:tx.context.ownerId===actor&&tx.context.canEdit,admin:tx.context.admin,independentAdmin:tx.context.admin&&tx.context.ownerId!==actor,publishingEnabled:enabled(),guidelines:PUBLISHING_GUIDELINES,guidelineHash:GUIDELINE_HASH,guidelinesAccepted:currentGuidelines(tx.state?.guidelines,tx.context.ownerId),moderation:tx.state?.moderation??null,notices:await tx.notices?.()??[],revisions:tx.revisions.map(revisionReceipt),prices:tx.prices,history:await tx.history(),artwork:await tx.artwork()};
 }),
 execute:(actor:string,project:string,raw:unknown)=>{
  const c=command(raw),digest=hash({project,...c});
  return store.transaction(actor,project,async tx=>{
   const x=tx.context;
   if(adminActions.has(c.action)){if(!x.admin||actor===x.ownerId)throw new PublishingError('forbidden');}
   else if(actor!==x.ownerId||!(['appeal','submit_correction'].includes(c.action)?x.canView:x.canEdit)||x.profileStatus!=='enabled')throw new PublishingError('forbidden');
   const prior=await tx.prior(c.requestKey);if(prior){if(prior.commandHash!==digest)throw new PublishingError('conflict');return prior.result;}
   const now=clock();const s:State=tx.state??{projectId:project,userId:x.ownerId,version:0,metadata:x.defaults,status:'draft',courseId:null,currentRevisionId:null,currentPriceId:null,guidelines:null,moderation:null,updatedAt:now};
   if(s.version!==c.expectedVersion)throw new PublishingError('conflict');
   let result:Record<string,unknown>={};
   if(c.action==='save_metadata')s.metadata=c.metadata!;
   if(c.action==='accept_guidelines'){
    if(c.guidelineVersion!==PUBLISHING_GUIDELINES.version||c.guidelineHash!==GUIDELINE_HASH)throw new PublishingError('guidelines_required');
    s.guidelines={version:c.guidelineVersion,contentHash:c.guidelineHash,acceptedAt:now.toISOString(),actorId:actor};result={guidelines:s.guidelines};
   }
   if(c.action==='set_price'){
    const p=await tx.price(c.amountPaise!,now);result={priceId:p.id,amountPaise:p.amountPaise};
    if(s.courseId){const r=tx.revisions.find(r=>r.id===s.currentRevisionId);if(!r||!tx.reprice)throw new PublishingError('unavailable');await tx.reprice(r,p,actor,now);s.currentPriceId=p.id;}
   }
   if(c.action==='publish'){
    if(!enabled())throw new PublishingError('disabled');if(s.status==='suspended'||publishRestricted(s.moderation))throw new PublishingError('suspended');
    if(!currentGuidelines(s.guidelines,x.ownerId))throw new PublishingError('guidelines_required');
    const p=tx.prices.find(p=>['creator','approved'].includes(p.status));if(!p)throw new PublishingError('price_required');
    const snapshot=await tx.capture(s.metadata),issues=readiness(snapshot);if(issues.length)throw new PublishingError('not_ready',issues);
    const contentHash=hash(snapshot);let r=tx.revisions.find(r=>r.contentHash===contentHash);if(!r)r=await tx.revision(snapshot,contentHash,now);
    if(hash(r.snapshot)!==r.contentHash)throw new PublishingError('not_ready');
    s.courseId=await tx.publish(r.snapshot,r,p,actor,now);s.currentRevisionId=r.id;s.currentPriceId=p.id;s.status='live';result={courseId:s.courseId,revisionId:r.id,priceId:p.id,guidelines:s.guidelines};
   }
   if(c.action==='unpublish'){
    if(!s.courseId)throw new PublishingError('not_ready');if(s.status==='suspended'||publishRestricted(s.moderation))throw new PublishingError('suspended');s.status='unpublished';await tx.visibility(s.status,now);
   }
   if(adminActions.has(c.action)){
    if(!s.courseId)throw new PublishingError('not_ready');
    if(c.action==='restore'){if(!enabled())throw new PublishingError('disabled');if(s.status!=='unpublished'||s.moderation?.restriction!=='none'||(await tx.history())[0]?.action!=='resolve')throw new PublishingError('conflict');s.status='live';await tx.visibility('live',now);}
    else if(c.action==='resolve'){if(!s.moderation||s.moderation.restriction==='none')throw new PublishingError('conflict');s.moderation={...s.moderation,restriction:'none',reason:c.note!};if(s.status==='suspended'){s.status='unpublished';await tx.visibility(s.status,now);}}
    else{
     if(publishRestricted(s.moderation)&&c.action!=='suspend')throw new PublishingError('suspended');
     s.moderation={restriction:c.action==='flag'?'flagged':c.action==='request_corrections'?'corrections':c.action==='moderate_unpublish'?'unpublished':'suspended',reason:c.note!,caseId:randomUUID(),correction:null,appeal:null};
     if(['moderate_unpublish','suspend'].includes(c.action)){s.status=c.action==='suspend'?'suspended':'unpublished';await tx.visibility(s.status,now);}
    }
    result={moderation:s.moderation};
   }
   if(c.action==='submit_correction'||c.action==='appeal'){
    if(!s.moderation||s.moderation.restriction==='none')throw new PublishingError('conflict');s.moderation={...s.moderation,[c.action==='appeal'?'appeal':'correction']:c.note!};result={moderation:s.moderation};
   }
   s.version++;s.updatedAt=now;await tx.save(s);result={...result,version:s.version,status:s.status};await tx.event(c.action,c.requestKey,digest,c.note??'',result,now);return result;
  });
 }
 };
}
export type PublishingView=Awaited<ReturnType<ReturnType<typeof publishingService>['read']>>;
export type ParsedPublicationCommand=PublicationCommand;
