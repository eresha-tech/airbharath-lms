import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceAccessGrants as grants, workspaceAccessGrantEvents as events, workspaceCreatorProfiles as profiles, workspaceEligibilityAttempts as attempts, workspaceEligibilitySettings as settings, workspacePolicyVersions as policies, workspaceCreatorTermsVersions as versions, workspaceCreatorTermsAcceptances as acceptances } from '@/lib/db/schema';
import { acceptanceMatches, currentCreatorTerms } from '../terms/model';
import { classifyWorkspaceRuntime } from '../payments/classification';
import { GrantError, grantCommand, grantEnvironment, grantTerm, revokeCommand, type GrantEvidence } from './model';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function lock(tx:Tx, actor:string, owner:string){const rows=await tx.select({id:users.id,role:users.role}).from(users).where(inArray(users.id,[actor,owner])).orderBy(users.id).for('update');if(rows.find(r=>r.id===actor)?.role!=='admin')throw new GrantError('forbidden');if(!rows.some(r=>r.id===owner))throw new GrantError('not_found');}
async function time(tx:Tx){const rows=await tx.execute(sql`select date_trunc('milliseconds',clock_timestamp()) as now`);return rows[0].now instanceof Date?new Date(rows[0].now):new Date(String(rows[0].now));}
async function close(tx:Tx,g:typeof grants.$inferSelect,actor:string,action:'revoked'|'expired',reason:string,key:string,payloadHash:string,now:Date){await tx.update(grants).set({status:action,closedAt:now,closedBy:actor,closeReason:reason}).where(eq(grants.id,g.id));await tx.insert(events).values({grantId:g.id,userId:g.userId,actorId:actor,action,reason,requestKey:key,payloadHash,createdAt:now});}
export async function createAccessGrant(actor:string,raw:unknown){const c=grantCommand(raw),payloadHash=hash(c),environment=grantEnvironment(classifyWorkspaceRuntime()),terms=currentCreatorTerms();return db.transaction(async tx=>{
 await lock(tx,actor,c.targetUserId);const now=await time(tx);
 const prior=await tx.query.workspaceAccessGrants.findFirst({where:and(eq(grants.grantedBy,actor),eq(grants.requestKey,c.requestKey))});if(prior){if(prior.payloadHash!==payloadHash)throw new GrantError('conflict');return prior;}
 const [a]=await tx.select().from(attempts).where(eq(attempts.userId,c.targetUserId)).orderBy(desc(attempts.decidedAt),desc(attempts.id)).limit(1);
 const term=grantTerm(c,now);
 const [s]=await tx.select().from(settings).where(eq(settings.isCurrent,true)).for('share');const [p]=await tx.select().from(policies).where(eq(policies.isCurrent,true)).for('share');
 if(!a||a.result!=='eligible'||!a.eligibleUntil||a.eligibleUntil<=term.startsAt||a.settingsId!==s?.id||a.policyId!==p?.id)throw new GrantError('ineligible');
 const [t]=await tx.select().from(versions).where(eq(versions.isCurrent,true)).for('share');if(t?.termsVersion!==terms.version||t?.contentHash!==terms.contentHash||t.effectiveAt>now)throw new GrantError('unavailable');
 const existing=await tx.query.workspaceAccessGrants.findFirst({where:and(eq(grants.userId,c.targetUserId),eq(grants.environment,environment),eq(grants.status,'active'))});
 if(existing){if(existing.expiresAt>now)throw new GrantError('duplicate');await close(tx,existing,actor,'expired','Previous grant expired before new access was issued.',randomUUID(),hash({expired:existing.id}),now);}
 let profile=await tx.query.workspaceCreatorProfiles.findFirst({where:eq(profiles.userId,c.targetUserId)});if(profile&&profile.status!=='enabled')throw new GrantError('ineligible');
 if(!profile)profile=(await tx.insert(profiles).values({userId:c.targetUserId,status:'enabled',createdAt:now,firstActivatedAt:now}).returning())[0];
 const [g]=await tx.insert(grants).values({userId:c.targetUserId,creatorProfileId:profile.id,eligibilityAttemptId:a.id,environment,...term,reason:c.reason,grantedBy:actor,requestKey:c.requestKey,payloadHash,termsVersion:terms.version,termsContentHash:terms.contentHash,createdAt:now}).returning();
 await tx.insert(events).values({grantId:g.id,userId:g.userId,actorId:actor,action:'granted',reason:c.reason,requestKey:c.requestKey,payloadHash,createdAt:now});return g;
 });}
export async function revokeAccessGrant(actor:string,id:string,raw:unknown){const c=revokeCommand(raw),payloadHash=hash({id,...c});return db.transaction(async tx=>{
 const g=await tx.query.workspaceAccessGrants.findFirst({where:eq(grants.id,id)});if(!g)throw new GrantError('not_found');await lock(tx,actor,g.userId);
 const prior=await tx.query.workspaceAccessGrantEvents.findFirst({where:and(eq(events.actorId,actor),eq(events.requestKey,c.requestKey))});if(prior){if(prior.payloadHash!==payloadHash||prior.grantId!==id||prior.action!=='revoked')throw new GrantError('conflict');return await tx.query.workspaceAccessGrants.findFirst({where:eq(grants.id,id)});}
 const current=await tx.query.workspaceAccessGrants.findFirst({where:eq(grants.id,id)});if(!current||current.status!=='active')throw new GrantError('conflict');const now=await time(tx);if(now>=current.expiresAt)throw new GrantError('conflict');await close(tx,current,actor,'revoked',c.reason,c.requestKey,payloadHash,now);return await tx.query.workspaceAccessGrants.findFirst({where:eq(grants.id,id)});
 });}
// Caller mutation transactions already hold the owner lock, serializing revocation and editing.
export async function readGrantEvidence(userId:string,executor:Tx|typeof db=db):Promise<GrantEvidence|null>{
 const env=grantEnvironment(classifyWorkspaceRuntime()),now=new Date(),terms=currentCreatorTerms();
 const [g]=await executor.select().from(grants).where(and(eq(grants.userId,userId),eq(grants.environment,env))).orderBy(desc(grants.createdAt),desc(grants.id)).limit(1);if(!g)return null;
 const [profile]=await executor.select().from(profiles).where(and(eq(profiles.id,g.creatorProfileId),eq(profiles.userId,userId)));
 const [latest]=await executor.select().from(attempts).where(eq(attempts.userId,userId)).orderBy(desc(attempts.decidedAt),desc(attempts.id)).limit(1);
 const [frozen]=await executor.select().from(attempts).where(eq(attempts.id,g.eligibilityAttemptId));
 const [version]=await executor.select().from(versions).where(eq(versions.isCurrent,true));
 const [accepted]=await executor.select().from(acceptances).where(and(eq(acceptances.userId,userId),eq(acceptances.termsVersion,terms.version)));
 const [original]=await executor.select().from(acceptances).where(and(eq(acceptances.userId,userId),eq(acceptances.termsVersion,g.termsVersion),eq(acceptances.termsContentHash,g.termsContentHash)));
 return{...g,profileStatus:profile?.status||'unavailable',eligibilityValid:!!frozen&&frozen.userId===userId&&frozen.result==='eligible'&&!!frozen.eligibleUntil&&frozen.eligibleUntil>g.startsAt&&latest?.result==='eligible',termsAccepted:version?.termsVersion===terms.version&&version?.contentHash===terms.contentHash&&version.effectiveAt<=now&&acceptanceMatches(accepted,userId,terms,now),legalHistory:!!original&&original.acceptedAt<=now&&original.acceptedAt<g.expiresAt&&(!g.closedAt||original.acceptedAt<=g.closedAt)};
}
