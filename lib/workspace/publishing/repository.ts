import 'server-only';
import { and,asc,desc,eq,inArray,sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, courses, modules, lessons, lessonMaterials, courseAuthors, workspaceCourseProjects as projects, workspaceCourseSubmissions as submissions, workspaceCourseModules as studioModules, workspaceCourseLessons as studioLessons, workspaceCourseAssets as assets, workspaceMediaJobs as jobs, workspaceCreatorProfiles as profiles, workspaceCreatorProfileDetails as details, workspaceMembershipOrders as orders, workspaceTrustedCreators as trust, workspaceTrustEvents as trustEvents, workspacePublicationStates as states, workspacePublicationRevisions as revisions, workspacePublicationPrices as prices, workspacePublicationEvents as events, workspacePublicationModules as moduleMap, workspacePublicationLessons as lessonMap, workspacePublicationReleases as releases } from '@/lib/db/schema';
import { readWorkspaceAccess } from '../activation/repository';
import { readGrantEvidence } from '../access/repository';
import { creatorCapabilities,environment } from '../creator/model';
import { publishingService,type PublishingStore,type State } from './service';
import { metadata as validateMetadata, rupees, PublishingError,publishingEnabled,type FrozenCourse,type PublicationMetadata } from './model';
export const postgresPublishingStore:PublishingStore={transaction:(actor,project,work)=>db.transaction(async tx=>{
 const [p]=await tx.select().from(projects).where(eq(projects.id,project));if(!p)throw new PublishingError('not_found');
 const people=await tx.select().from(users).where(inArray(users.id,[actor,p.userId])).orderBy(asc(users.id)).for('update');const requester=people.find(u=>u.id===actor),owner=people.find(u=>u.id===p.userId);if(!requester||!owner)throw new PublishingError('authentication');
 await tx.select({id:orders.id}).from(orders).where(eq(orders.userId,p.userId)).orderBy(orders.id).for('update');
 const [profile]=await tx.select().from(profiles).where(eq(profiles.id,p.creatorProfileId)).for('update');if(!profile)throw new PublishingError('not_found');
 await tx.select({id:projects.id}).from(projects).where(eq(projects.id,project)).for('update');
 const access=await readWorkspaceAccess(p.userId,tx),grant=await readGrantEvidence(p.userId,tx),cap=creatorCapabilities(access.row?{refundedAt:access.row.refund?.confirmedAt,profileStatus:access.row.profile.status,activationState:access.row.order.activationState,providerMode:access.row.order.providerMode,commercialPolicyVersion:access.row.order.commercialPolicyVersion,membership:access.row.membership}:null,new Date(),environment(),access.latestOrder?.activationState==='held_for_review',grant);
 const admin=requester.role==='admin';if(!admin&&(actor!==p.userId||!cap.canViewCreatorWorkspace))throw new PublishingError('forbidden');
 const [source]=await tx.select().from(submissions).where(eq(submissions.id,p.approvedSubmissionId));if(!source||source.reviewStatus!=='approved')throw new PublishingError('not_ready');
 const [d]=await tx.select().from(details).where(eq(details.creatorProfileId,p.creatorProfileId));
 const [state]=await tx.select().from(states).where(eq(states.projectId,project)).for('update');const [t]=await tx.select().from(trust).where(eq(trust.creatorProfileId,p.creatorProfileId));
 const revisionRows=await tx.select().from(revisions).where(eq(revisions.projectId,project)).orderBy(desc(revisions.number));const priceRows=await tx.select().from(prices).where(eq(prices.projectId,project)).orderBy(desc(prices.number));
 const defaults:PublicationMetadata={title:source.title,shortDescription:source.description.slice(0,300),description:source.description,targetLearner:source.targetLearner,learningOutcomes:source.learningOutcomes,artworkAssetId:null};
 const scopedAssets=()=>tx.select().from(assets).where(eq(assets.projectId,project)).orderBy(asc(assets.lessonId),asc(assets.createdAt),asc(assets.id));
 const guard=()=>tx.execute(sql`select set_config('airbharath.workspace_publishing',${project},true)`);
 return work({context:{ownerId:p.userId,profileId:profile.id,profileStatus:profile.status,admin,canView:cap.canViewCreatorWorkspace,canEdit:cap.canEditWorkspace&&profile.status==='enabled',defaults,trust:t??null},state:state??null,revisions:revisionRows,prices:priceRows,
  prior:async key=>(await tx.select({commandHash:events.commandHash,result:events.result}).from(events).where(and(eq(events.actorId,actor),eq(events.requestKey,key))))[0]??null,
  artwork:async()=>(await scopedAssets()).filter(a=>a.status==='ready'&&a.assetKind==='resource'&&['image/png','image/jpeg'].includes(a.mimeType)).map(a=>({id:a.id,displayName:a.displayName})),
  capture:async meta=>{
   const metadata=validateMetadata(meta),ms=await tx.select().from(studioModules).where(eq(studioModules.projectId,project)).orderBy(asc(studioModules.position)),ls=await tx.select().from(studioLessons).where(eq(studioLessons.projectId,project)).orderBy(asc(studioLessons.moduleId),asc(studioLessons.position)),all=await scopedAssets();
   const unfinished=all.filter(a=>a.status!=='detached'&&(a.status!=='ready'||a.lessonId!==null&&!a.isAttached&&a.id!==metadata.artworkAssetId));if(unfinished.length)throw new PublishingError('not_ready',['Finish or detach pending, failed and unattached media before submission.']);
   const selected=all.filter(a=>a.status==='ready'&&(a.isAttached||a.id===metadata.artworkAssetId)),jobRows=selected.length?await tx.select().from(jobs).where(inArray(jobs.assetId,selected.map(a=>a.id))):[];
   const frozen:FrozenCourse={schemaVersion:1,projectId:project,ownerId:p.userId,sourceId:source.id,metadata,author:{name:d?.displayName||owner.fullName||'AirBharath Creator',bio:d?.shortBio||''},modules:ms.map(({id,title,description,position})=>({id,title,description,position})),lessons:ls.map(({id,moduleId,title,summary,content,contentFormat,position,mediaRevision})=>({id,moduleId,title,summary,content,contentFormat,position,mediaRevision})),media:selected.map(asset=>{const job=jobRows.find(j=>j.assetId===asset.id);if(asset.assetKind==='video'&&(job?.state!=='complete'||job.id!==asset.processingJobId||job.sourceVersion!==asset.objectVersionId))throw new PublishingError('not_ready',['Video processing evidence is incomplete.']);return {asset,manifest:job?.manifest??null};})};
   return frozen;
  },
  revision:async(snapshot,contentHash,at)=>(await tx.insert(revisions).values({projectId:project,userId:p.userId,number:(revisionRows[0]?.number??0)+1,snapshot,contentHash,createdAt:at,updatedAt:at}).returning())[0],
  review:async(r,status,feedback,decider,at)=>{await tx.update(revisions).set({status,feedback,decidedBy:status==='under_review'?null:decider,updatedAt:at}).where(eq(revisions.id,r.id));},
  price:async(amount,at)=>(await tx.insert(prices).values({projectId:project,userId:p.userId,number:(priceRows[0]?.number??0)+1,amountPaise:amount,createdAt:at}).returning())[0],
  decidePrice:async(price,status,note,decider,at)=>{await tx.update(prices).set({status,note,decidedBy:decider,decidedAt:at}).where(eq(prices.id,price.id));},
  trust:async(trusted,expected,decider,reason,at)=>{await tx.insert(trust).values({creatorProfileId:p.creatorProfileId,userId:p.userId,trusted,version:expected+1,updatedAt:at}).onConflictDoUpdate({target:trust.creatorProfileId,set:{trusted,version:expected+1,updatedAt:at}});await tx.insert(trustEvents).values({creatorProfileId:p.creatorProfileId,actorId:decider,trusted,version:expected+1,reason,createdAt:at});},
  publish:async(snapshot,revision,price,decider,at)=>{
   await guard();let courseId=state?.courseId;
   const c={category:source.category,title:snapshot.metadata.title,description:snapshot.metadata.description,shortDescription:snapshot.metadata.shortDescription,whoIsThisFor:snapshot.metadata.targetLearner,whatYouWillLearn:snapshot.metadata.learningOutcomes.join('\n'),aboutCourse:snapshot.metadata.description,price:rupees(price.amountPaise),workspaceProjectId:project,workspaceState:'live' as const,isPublished:true,instructorId:p.userId};
   if(!courseId){const [row]=await tx.insert(courses).values({...c,slug:`creator-${project}`,createdAt:at}).returning();courseId=row.id;await tx.insert(courseAuthors).values({courseId,name:snapshot.author.name,bio:snapshot.author.bio,orderIndex:0});}else{await tx.update(courses).set(c).where(eq(courses.id,courseId));await tx.update(courseAuthors).set({name:snapshot.author.name,bio:snapshot.author.bio,updatedAt:at}).where(eq(courseAuthors.courseId,courseId));}
   await tx.update(courses).set({thumbnailUrl:`/api/courses/${courseId}/artwork`}).where(eq(courses.id,courseId));
   const existingModules=await tx.select().from(moduleMap).where(eq(moduleMap.projectId,project)),existingLessons=await tx.select().from(lessonMap).where(eq(lessonMap.projectId,project));
   // Retire rather than delete: enrollment, lesson IDs, comments and progress survive updates.
   await tx.update(modules).set({workspaceRetired:true}).where(eq(modules.courseId,courseId));if(existingLessons.length)await tx.update(lessons).set({workspaceRetired:true}).where(inArray(lessons.id,existingLessons.map(l=>l.lmsId)));
   const moduleIds=new Map<string,string>();
   for(const m of snapshot.modules){let target=existingModules.find(x=>x.sourceId===m.id)?.lmsId;const patch={title:m.title,description:m.description,orderIndex:m.position,workspaceRetired:false};if(target)await tx.update(modules).set(patch).where(eq(modules.id,target));else{const [row]=await tx.insert(modules).values({...patch,courseId}).returning();target=row.id;await tx.insert(moduleMap).values({projectId:project,sourceId:m.id,lmsId:target});}moduleIds.set(m.id,target);}
   for(const l of snapshot.lessons){let target=existingLessons.find(x=>x.sourceId===l.id)?.lmsId;const video=snapshot.media.find(a=>a.asset.lessonId===l.id&&a.asset.assetKind==='video'&&a.asset.isAttached)?.asset;const patch={moduleId:moduleIds.get(l.moduleId)!,title:l.title,summary:l.summary,content:l.content,contentFormat:l.contentFormat,videoUrl:video?.id??null,orderIndex:l.position,workspaceRetired:false,workspaceRevisionId:revision.id,isFreePreview:false,deliveryType:'recorded'};if(target)await tx.update(lessons).set(patch).where(eq(lessons.id,target));else{const [row]=await tx.insert(lessons).values(patch).returning();target=row.id;await tx.insert(lessonMap).values({projectId:project,sourceId:l.id,lmsId:target});}
    await tx.delete(lessonMaterials).where(eq(lessonMaterials.lessonId,target));for(const media of snapshot.media.filter(a=>a.asset.lessonId===l.id&&a.asset.assetKind==='resource'&&a.asset.isAttached).sort((a,b)=>a.asset.resourcePosition!-b.asset.resourcePosition!))await tx.insert(lessonMaterials).values({lessonId:target,title:media.asset.displayName,fileType:media.asset.mimeType,fileSize:media.asset.byteSize,fileUrl:`/api/courses/${courseId}/lessons/${target}/media/${media.asset.id}/resource`});
   }
   const [last]=await tx.select().from(releases).where(eq(releases.projectId,project)).orderBy(desc(releases.number)).limit(1);await tx.insert(releases).values({projectId:project,courseId,revisionId:revision.id,priceId:price.id,actorId:decider,number:(last?.number??0)+1,authority:revision.status==='approved'?'admin_approved':'trusted',trustVersion:revision.status==='approved'?null:t?.version,createdAt:at});return courseId;
  },
  visibility:async(status)=>{await guard();if(!state?.courseId)throw new PublishingError('not_ready');await tx.update(courses).set({isPublished:false,workspaceState:status}).where(eq(courses.id,state.courseId));},
  save:async(s:State)=>{await tx.insert(states).values(s).onConflictDoUpdate({target:states.projectId,set:{...s}});},
  event:async(action,requestKey,commandHash,note,result,at)=>{await tx.insert(events).values({projectId:project,actorId:actor,action,requestKey,commandHash,note,result,createdAt:at});},
  history:async()=>tx.select({action:events.action,note:events.note,createdAt:events.createdAt}).from(events).where(eq(events.projectId,project)).orderBy(desc(events.createdAt)).limit(100),
 });
})};
export function workspacePublishing(){return publishingService(postgresPublishingStore,()=>new Date(),()=>publishingEnabled());}
