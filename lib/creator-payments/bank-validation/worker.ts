import { verifyPayoutTestDatabase } from '../razorpayx/test-isolation';
import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorBankValidations as validations, creatorBankObservations as observations, creatorBankInbox as inbox, creatorPayees as payees, users } from '@/lib/db/schema';
import { decryptPayee } from '../crypto';
import { hash } from '../razorpayx/model';
import { bankValidationAdapter, type BankValidationAdapter } from './adapter';
import { bankValidationConfiguration, requireBankValidation } from './config';
import { validationFact } from './model';
export async function runBankValidationWorker(database=db,c=bankValidationConfiguration(),provider:BankValidationAdapter=bankValidationAdapter(c),limit=5) {
 requireBankValidation(c);
 await verifyPayoutTestDatabase(database,c.payout);
 if(!Number.isInteger(limit)||limit<1||limit>10)throw Error('validation_limit');
 const result={processed:0,review:0};const deadline=Date.now()+45000;
 const hints=await database.select().from(inbox).where(and(eq(inbox.scope,c.payout.scope),sql`${inbox.processedAt} is null`)).limit(100);
 for(const hint of hints) await database.transaction(async tx=>{
  // Hints bind by request UUID only. The authenticated GET still proves exact bank/fund identity.
  const [v]=await tx.select().from(validations).where(and(eq(validations.scope,c.payout.scope),hint.requestId?eq(validations.id,hint.requestId):eq(validations.providerId,hint.providerId)));
  if(!v)return; // Retain unmatched hints for later intent recovery.
  const [bank]=await tx.select().from(payees).where(eq(payees.id,v.payeeId));
  await tx.select({id:users.id}).from(users).where(eq(users.id,bank.creatorId)).for('update');
  const [locked]=await tx.select().from(validations).where(eq(validations.id,v.id)).for('update');
  if(locked.submitCount===1&&locked.state==='pending')await tx.update(validations).set({nextAt:new Date()}).where(eq(validations.id,v.id));
  if(locked.providerId===hint.providerId)await tx.update(inbox).set({processedAt:new Date()}).where(eq(inbox.id,hint.id));
 });
 for(let n=0;n<limit&&Date.now()<deadline-13000;n++) {
  const claim=await database.transaction(async tx=>{
   const [candidate]=await tx.select().from(validations).where(and(eq(validations.scope,c.payout.scope),eq(validations.mode,c.mode),sql`${validations.state} in ('prepared','pending') and ${validations.nextAt}<=now() and ${validations.attempts}<20 and (${validations.leaseUntil} is null or ${validations.leaseUntil}<now())`)).orderBy(validations.nextAt,validations.id).limit(1);
   if(!candidate)return null;
   const [bank]=await tx.select().from(payees).where(eq(payees.id,candidate.payeeId));
   await tx.select({id:users.id}).from(users).where(eq(users.id,bank.creatorId)).for('update');
   const [v]=await tx.select().from(validations).where(eq(validations.id,candidate.id)).for('update');
   if(!['prepared','pending'].includes(v.state)||v.attempts>=20||v.nextAt>new Date()||v.leaseUntil&&v.leaseUntil>new Date())return null;
   const token=randomUUID();const [updated]=await tx.update(validations).set({leaseToken:token,leaseUntil:new Date(Date.now()+120000),attempts:v.attempts+1}).where(eq(validations.id,v.id)).returning();
   return {v:updated,bank};
  });
  if(!claim)break;
  let v=claim.v;const bank=decryptPayee(claim.bank.encrypted,claim.bank.creatorId);
  async function persist(values:Partial<typeof validations.$inferInsert>) {await database.transaction(async tx=>{
   await tx.select({id:users.id}).from(users).where(eq(users.id,claim!.bank.creatorId)).for('update');
   const [current]=await tx.select().from(validations).where(eq(validations.id,v.id)).for('update');
   if(current.leaseToken!==v.leaseToken)throw Error('validation_lease_expired');
   if(values.submitCount===1&&c.minIntervalSeconds>0){await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${c.payout.scope},2501))`);const [recent]=await tx.select({id:validations.id}).from(validations).where(and(eq(validations.scope,c.payout.scope),sql`${validations.submittedAt}>now()-make_interval(secs=>${c.minIntervalSeconds})`)).limit(1);if(recent)throw Error('bank_validation_frequency_limit');}
   await tx.update(validations).set(values).where(eq(validations.id,v.id));
  });v={...v,...values};}
  try {
   if(v.amountPaise!==c.amount||v.method!==c.method)throw Error('validation_configuration_changed');
   if(!v.contactId)await persist({contactId:await provider.contact(v.payeeId)});
   if(!v.fundAccountId)await persist({fundAccountId:await provider.fund(v.contactId!,bank)});
   const bound={id:v.id,contactId:v.contactId!,fundAccountId:v.fundAccountId!,amount:v.amountPaise,bank};
   if(!v.submitCount) {
    // Traditional FAV does not document an idempotency header. Commit one lifetime POST intent; never resend after uncertainty.
    await persist({submitCount:1,submittedAt:new Date(),state:'pending'});
    const raw=await provider.create(v.id,v.fundAccountId!);const fact=validationFact(raw,bound);
    await persist({providerId:fact.providerId});
    await database.insert(observations).values({validationId:v.id,source:'create',providerId:fact.providerId,fact,hash:hash(fact)}).onConflictDoNothing();
   }
   if(!v.providerId) {
    const hints=await database.select().from(inbox).where(and(eq(inbox.scope,c.payout.scope),eq(inbox.requestId,v.id),sql`${inbox.processedAt} is null`)).limit(1);
    if(hints[0]){try{const hinted=validationFact(await provider.fetch(hints[0].providerId),bound);await persist({providerId:hinted.providerId});}catch{/* A signed hint cannot bind mismatched provider evidence. */}await database.update(inbox).set({processedAt:new Date()}).where(eq(inbox.id,hints[0].id));}
    const page=v.providerId?{items:[]}:await provider.list(v.scanSkip);
    if(!Array.isArray(page.items)||page.items.length>100)throw Error('validation_search_incomplete');
    const matches=page.items.filter((r:Record<string,unknown>)=>(r.notes as Record<string,unknown>)?.airbharath_validation===v.id);
    if(matches.length>1)throw Error('validation_duplicate_provider_intent');
    if(matches.length===1)await persist({providerId:validationFact(matches[0],bound).providerId});
    else if(!v.providerId){await persist({scanSkip:page.items.length===100?v.scanSkip+100:0,nextAt:new Date(Date.now()+60000),lastError:'validation_response_unconfirmed',...(v.attempts>=20?{state:'review'}:{})});continue;}
   }
   const fact=validationFact(await provider.fetch(v.providerId!),bound);
   if(fact.providerId!==v.providerId)throw Error('validation_identity_changed');
   await database.transaction(async tx=>{
    await tx.select({id:users.id}).from(users).where(eq(users.id,claim.bank.creatorId)).for('update');
    const [current]=await tx.select().from(validations).where(eq(validations.id,v.id)).for('update');
    if(current.leaseToken!==v.leaseToken||current.state==='invalid')throw Error('validation_lease_or_invalid');
    await tx.insert(observations).values({validationId:v.id,source:'reconcile',providerId:fact.providerId,fact,hash:hash(fact)}).onConflictDoNothing();
    await tx.update(validations).set({state:fact.state==='pending'&&v.attempts>=20?'review':fact.state,accountStatus:fact.accountStatus,nameDecision:fact.nameDecision,checkedAt:new Date(),lastError:null,nextAt:new Date(Date.now()+60000)}).where(eq(validations.id,v.id));
   });result.processed++;
  } catch {result.review++;await persist({state:v.attempts>=20?'review':v.submitCount?'pending':'prepared',lastError:'bank_check_needs_reconciliation',nextAt:new Date(Date.now()+Math.min(3600000,30000*2**Math.min(v.attempts,7)))});}
  finally {await persist({leaseUntil:null,leaseToken:null});}
 }
 const [backlog]=await database.execute(sql`select count(*) filter(where state in ('prepared','pending'))::int pending,count(*) filter(where state='pending' and submit_count=1 and provider_id is null)::int uncertain,count(*) filter(where state in ('review','invalid') or attempts>=20)::int blocked,count(*) filter(where state in ('prepared','pending') and next_at<now()-interval '10 minutes')::int stale from creator_bank_validations where scope=${c.payout.scope} and mode=${c.mode}`);
 return {...result,pending:Number(backlog.pending),backlog:Number(backlog.pending),uncertain:Number(backlog.uncertain),blocked:Number(backlog.blocked),stale:Number(backlog.stale)};
}
