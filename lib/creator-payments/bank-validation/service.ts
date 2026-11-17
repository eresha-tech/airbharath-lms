import { verifyPayoutTestDatabase } from '../razorpayx/test-isolation';
import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorBankValidations as validations, creatorPayees as payees, users } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { type PayoutTx } from '../razorpayx/service';
import { bankValidationConfiguration, requireBankValidation, type BankValidationConfig } from './config';
export async function requestBankValidation(tx:PayoutTx,actor:string,payeeId:string,requestKey:string,c=bankValidationConfiguration()) {
 requireBankValidation(c);
 await verifyPayoutTestDatabase(tx,c.payout);
 const [bank]=await tx.select().from(payees).where(eq(payees.id,payeeId));
 const [admin]=await tx.select({role:users.role}).from(users).where(eq(users.id,actor)).for('share');
 if(!bank||actor===bank.creatorId||admin?.role!=='admin')throw new CommerceError(403,'Independent persisted Admin required.');
 // No new intent on repeated clicks: this version/scope has a single billable submission for its lifetime.
 await tx.insert(validations).values({payeeId,scope:c.payout.scope,mode:c.mode,method:c.method,amountPaise:c.amount,requestedBy:actor,requestKey}).onConflictDoNothing();
 const [v]=await tx.select().from(validations).where(and(eq(validations.payeeId,payeeId),eq(validations.scope,c.payout.scope)));
 if(!v)throw new CommerceError(409,'Bank check could not be prepared.');
 return v;
}
export async function requireVerifiedBank(tx:Pick<PayoutTx,'select'|'execute'>,payeeId:string,c:{mode:'synthetic'|'live';payout:{scope:string}},fundAccountId?:string) {
 const [v]=await tx.select().from(validations).where(and(eq(validations.payeeId,payeeId),eq(validations.scope,c.payout.scope),eq(validations.mode,c.mode)));
 if(!v||!['valid','review'].includes(v.state)||v.accountStatus!=='active'||!v.checkedAt||!v.providerId||!v.contactId||!v.fundAccountId||fundAccountId&&fundAccountId!==v.fundAccountId)throw new CommerceError(409,'A completed bank ownership check for this exact account version is required.');
 const [proof]=await tx.execute(sql`select id from creator_bank_observations where validation_id=${v.id} and source='reconcile' and provider_id=${v.providerId} and fact->>'transactionStatus'='completed' and fact->>'accountStatus'='active' limit 1`);
 if(!proof)throw new CommerceError(409,'Authoritative bank verification evidence is required.');
 if(v.state!=='valid'||v.nameDecision!=='match') {
  if(!['review','missing'].includes(v.nameDecision))throw new CommerceError(409,'A materially different beneficiary cannot be approved by an exception.');
  const [review]=await tx.execute(sql`select id from creator_finance_events where entity_id=${v.id} and action='accept_bank_name' limit 1`);
  if(!review)throw new CommerceError(409,'Independent account-ownership evidence is required to resolve the uncertain name.');
 }
 return v;
}
export function payoutBankScope(c:{mode:'test'|'live';scope:string}) {return {mode:c.mode==='live'?'live' as const:'synthetic' as const,payout:c};}
export async function readBankValidation(payeeId:string,database=db) {return database.select({id:validations.id,mode:validations.mode,method:validations.method,state:validations.state,eligible:sql<boolean>`creator_bank_eligible(${validations.payeeId},${validations.scope})`,transactionStatus:sql<string|null>`(select o.fact->>'transactionStatus' from creator_bank_observations o where o.validation_id=creator_bank_validations.id and o.source='reconcile' order by o.created_at desc,o.id desc limit 1)`,recoveryRound:validations.recoveryRound,attempts:validations.attempts,accountStatus:validations.accountStatus,nameDecision:validations.nameDecision,providerId:validations.providerId,checkedAt:validations.checkedAt,lastError:validations.lastError,createdAt:validations.createdAt}).from(validations).where(eq(validations.payeeId,payeeId)).orderBy(sql`${validations.createdAt} desc,${validations.id} desc`).limit(10);}

export async function reviewUncertainBankName(tx:PayoutTx,actor:string,payeeId:string) {
 const c=bankValidationConfiguration();
 const [v]=await tx.select().from(validations).where(and(eq(validations.payeeId,payeeId),eq(validations.scope,c.payout.scope),eq(validations.mode,c.mode)));
 if(!v||v.state!=='review'||v.accountStatus!=='active'||!['review','missing'].includes(v.nameDecision)||actor===v.requestedBy)throw new CommerceError(409,'Only a second independent Admin may review an active account with an uncertain or absent registered name. Invalid accounts and material mismatches cannot be overridden.');
 const [proof]=await tx.execute(sql`select id from creator_bank_observations where validation_id=${v.id} and source='reconcile' and fact->>'transactionStatus'='completed' and fact->>'accountStatus'='active' limit 1`);
 if(!proof)throw new CommerceError(409,'Completed provider evidence of an active account is mandatory.');
 return v;
}
