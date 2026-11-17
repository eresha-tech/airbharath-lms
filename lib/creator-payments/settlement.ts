import {requestBankValidation,requireVerifiedBank,payoutBankScope,reviewUncertainBankName} from './bank-validation/service';
import {bankValidationConfiguration} from './bank-validation/config';
import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import { and,desc,eq,sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users,workspaceCreatorProfiles,creatorPayees as payees,creatorPayouts as payouts,creatorFinanceEvents as events,creatorLedger as ledger,coursePaymentChecks as checks,courseFinanceRuns as runs,orders } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { encryptPayee,decryptPayee } from './crypto';
import { SETTLEMENT_POLICY,dueBefore,requiredText,UUID,paise } from './model';
import { requireCourseScope } from './config';
import {verifyPayoutTestDatabase} from './razorpayx/test-isolation';
import {preparePayoutJob} from './razorpayx/service';
import {requirePayoutExecution} from './razorpayx/config';
import {creatorPayoutJobs,creatorBankValidations} from '@/lib/db/schema';
import { ledgerBalance } from './ledger';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export type FinanceCommand={action:string;requestKey:string;creatorId:string;entityId?:string;holder?:string;account?:string;confirmAccount?:string;ifsc?:string;acknowledged?:boolean;amountPaise?:number;evidence?:string;bankReference?:string;adjustmentPaise?:number;providerPayoutId?:string};
async function identity(tx:Tx,id:string,admin=false) {
 const [u]=await tx.select().from(users).where(eq(users.id,id)).for('share');
 if(!u||admin&&u.role!=='admin')throw new CommerceError(403,'Forbidden.');return u;
}
async function creator(tx:Tx,id:string) {
 const p=await tx.query.workspaceCreatorProfiles.findFirst({where:eq(workspaceCreatorProfiles.userId,id)});
 if(!p)throw new CommerceError(403,'Creator account required.');
}
export function settlementService(database=db,scope= requireCourseScope(),execution:'razorpayx'|'legacy-manual'='razorpayx') {
 if(execution==='legacy-manual'&&process.env.DATABASE_ENV!=='test')throw new CommerceError(403,'Legacy manual fixture creation is test-only.');
 async function read(actor:string,creatorId=actor,page=1) {
  return database.transaction(async tx=>{
   await identity(tx,actor,creatorId!==actor);await creator(tx,creatorId);
   const ownPayees=await tx.select({id:payees.id,masked:payees.masked,createdAt:payees.createdAt,policyVersion:payees.policyVersion}).from(payees).where(eq(payees.creatorId,creatorId)).orderBy(desc(payees.createdAt)).limit(20);
   const history=await tx.select().from(payouts).where(and(eq(payouts.creatorId,creatorId),eq(payouts.scope,scope))).orderBy(desc(payouts.createdAt)).limit(25).offset((page-1)*25);
   const entries=await tx.select().from(ledger).where(and(eq(ledger.creatorId,creatorId),eq(ledger.scope,scope))).orderBy(desc(ledger.createdAt),desc(ledger.id)).limit(25).offset((page-1)*25);
   const audit=await tx.select().from(events).where(eq(events.creatorId,creatorId)).orderBy(desc(events.createdAt),desc(events.id)).limit(50);
   const [reserved]=await tx.select({n:sql<string>`coalesce(sum(${payouts.amountPaise}),0)`}).from(payouts).where(and(eq(payouts.creatorId,creatorId),eq(payouts.scope,scope),sql`${payouts.state} not in ('failed','cancelled')`));
   const issues=await tx.select({orderId:checks.orderId,issue:checks.issue,lastCheckedAt:checks.lastCheckedAt}).from(checks).innerJoin(orders,eq(orders.id,checks.orderId)).where(and(eq(orders.creatorId,creatorId),sql`(${checks.issue} is not null or ${checks.lastCheckedAt} is null or ${checks.lastCheckedAt}<now()-interval '24 hours')`)).limit(50);
   const balance=await ledgerBalance(tx,creatorId,scope),matured=await ledgerBalance(tx,creatorId,scope,dueBefore());
   return {creatorId,scope,netPaise:balance,reservedPaise:Number(reserved.n),availablePaise:Math.max(0,Math.min(balance,matured)-Number(reserved.n)),payees:ownPayees,payouts:history,entries,audit,issues,page};
  });
 }
 async function execute(actor:string,command:FinanceCommand) {
  if(!UUID.test(command.requestKey)||!UUID.test(command.creatorId)||command.entityId&&!UUID.test(command.entityId))throw new CommerceError(400,'Invalid financial request.');
  const hash=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(command).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
  return database.transaction(async tx=>{
   // All ledger and settlement writes take this same Creator lock first.
   await tx.select().from(users).where(eq(users.id,command.creatorId)).for('update');
   const isOwner=actor===command.creatorId;await identity(tx,actor,!isOwner);await creator(tx,command.creatorId);
   const previous=await tx.query.creatorFinanceEvents.findFirst({where:and(eq(events.actorId,actor),eq(events.requestKey,command.requestKey))});
   if(previous){if(previous.commandHash!==hash)throw new CommerceError(409,'Request key was used for a different operation.');return {id:previous.entityId,replayed:true};}
   let id=command.entityId??randomUUID();
   let evidence=requiredText(command.evidence??'Creator bank details and settlement policy accepted');
   if(command.action==='save_payee') {
    if(!isOwner||command.acknowledged!==true)throw new CommerceError(403,'Accept the settlement policy as the payee.');
    if(command.confirmAccount!==command.account)throw new CommerceError(400,'The account numbers do not match. Re-enter both account numbers.');
    const holder=requiredText(command.holder,3,100),account=command.account??'',ifsc=(command.ifsc??'').toUpperCase();
    if(!/^\d{9,18}$/.test(account)||!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))throw new CommerceError(400,'Enter a valid account number and IFSC.');
    const latest=await tx.query.creatorPayees.findFirst({where:eq(payees.creatorId,actor),orderBy:[desc(payees.createdAt),desc(payees.id)]});
    const same=latest&&latest.policyVersion===SETTLEMENT_POLICY&&JSON.stringify(decryptPayee(latest.encrypted,actor))===JSON.stringify({holder,account,ifsc});
    if(same)id=latest.id;else {id=randomUUID();await tx.insert(payees).values({id,creatorId:actor,encrypted:encryptPayee({holder,account,ifsc},actor),masked:`Account ••••${account.slice(-4)} · ${ifsc}`,policyVersion:SETTLEMENT_POLICY});}
   }else {
    if(isOwner)throw new CommerceError(403,'An independent Admin must manage settlement.');
    if(command.action==='propose_adjustment') {
     const order=await tx.query.orders.findFirst({where:and(eq(orders.id,id),eq(orders.creatorId,command.creatorId))});
     if(!order||!command.evidence||!Number.isSafeInteger(command.adjustmentPaise)||Math.abs(command.adjustmentPaise!)>100000000)throw new CommerceError(400,'Provide the exact signed bank-statement correction and evidence.');
     const check=await tx.query.coursePaymentChecks.findFirst({where:eq(checks.orderId,id)});
     if(check?.scope!==scope)throw new CommerceError(409,'Payment account mismatch.');
     const relevant=await tx.select().from(ledger).where(eq(ledger.orderId,id));
     const fingerprint=createHash('sha256').update(JSON.stringify(relevant.map(r=>r.id).sort())).digest('hex');
     evidence=JSON.stringify({bankEvidence:evidence,netPaise:command.adjustmentPaise,reviewFingerprint:fingerprint,refundPaise:-relevant.filter(r=>r.kind==='refund').reduce((s,r)=>s+r.grossPaise,0),disputePaise:-relevant.filter(r=>r.kind==='dispute').reduce((s,r)=>s+r.netPaise,0)});
    }else if(command.action==='approve_adjustment') {
     const proposal=await tx.query.creatorFinanceEvents.findFirst({where:and(eq(events.id,id),eq(events.creatorId,command.creatorId),eq(events.action,'propose_adjustment'))});
     if(!proposal||proposal.actorId===actor||!command.evidence)throw new CommerceError(403,'A second Admin must independently confirm the statement evidence.');
     const correction=JSON.parse(proposal.evidence) as {bankEvidence:string;netPaise:number;reviewFingerprint:string;refundPaise:number;disputePaise:number};
     const relevant=await tx.select().from(ledger).where(eq(ledger.orderId,proposal.entityId));
     if(createHash('sha256').update(JSON.stringify(relevant.map(r=>r.id).sort())).digest('hex')!==correction.reviewFingerprint)throw new CommerceError(409,'Payment evidence changed. Review and propose again.');
     const order=await tx.query.orders.findFirst({where:eq(orders.id,proposal.entityId)});
     if(!order?.razorpayPaymentId)throw new CommerceError(409,'Captured payment required.');
     await tx.insert(ledger).values({creatorId:command.creatorId,orderId:order.id,scope,sourceKey:`adjustment:${proposal.id}`,kind:'adjustment',grossPaise:correction.netPaise,netPaise:correction.netPaise,evidence:{paymentId:order.razorpayPaymentId,proposalId:proposal.id,approvedBy:actor,bankEvidence:evidence,proposalEvidence:correction.bankEvidence,reviewFingerprint:correction.reviewFingerprint,refundPaise:correction.refundPaise,disputePaise:correction.disputePaise}});
     id=order.id;evidence=JSON.stringify({proposalId:proposal.id,bankEvidence:evidence});
     // A statement correction resolves overlap review only. Missing gateway fee
     // evidence and provider failures remain blocked until actually reconciled.
     await tx.update(checks).set({issue:null}).where(and(eq(checks.orderId,id),eq(checks.issue,'refund_dispute_overlap_review')));
    }else if(command.action==='reconcile_bank_validation') {
     const c=bankValidationConfiguration();if(!c.enabled)throw new CommerceError(503,'Bank verification is not enabled.');
     const [v]=await tx.select().from(creatorBankValidations).innerJoin(payees,eq(payees.id,creatorBankValidations.payeeId)).where(and(eq(payees.id,id),eq(payees.creatorId,command.creatorId),eq(creatorBankValidations.scope,c.payout.scope))).for('update');
     const check=v?.creator_bank_validations;if(!check||check.state==='invalid'||check.recoveryRound>=3||!command.evidence||command.evidence.trim().length<20)throw new CommerceError(409,'Review the original validation intent. Invalid accounts cannot be retried; at most three bounded reconciliation rounds are available.');
     evidence=JSON.stringify({reference:command.evidence,round:check.recoveryRound+1});id=check.id;
     await tx.insert(events).values({creatorId:command.creatorId,actorId:actor,requestKey:command.requestKey,commandHash:hash,action:command.action,entityId:id,evidence});
     await tx.update(creatorBankValidations).set({recoveryRound:check.recoveryRound+1,attempts:0,state:check.submitCount?'pending':'prepared',lastError:null,nextAt:new Date()}).where(eq(creatorBankValidations.id,id));return {id,replayed:false};
    }else if(command.action==='accept_bank_name') {
     if(!command.evidence||command.evidence.trim().length<20)throw new CommerceError(400,'Provide a secure evidence reference and the ownership review reason. Do not enter bank documents or account numbers.');
     const validation=await reviewUncertainBankName(tx,actor,id);id=validation.id;
    }else if(command.action==='request_bank_validation') {
     const [bank]=await tx.select().from(payees).where(and(eq(payees.id,id),eq(payees.creatorId,command.creatorId)));if(!bank||!command.evidence)throw new CommerceError(400,'Select a bank version and supply the review reference.');
     await requestBankValidation(tx,actor,id,command.requestKey);
    }else if(['verify_payee','reject_payee','reveal_payee'].includes(command.action)) {
     const payee=await tx.query.creatorPayees.findFirst({where:and(eq(payees.id,id),eq(payees.creatorId,command.creatorId))});if(!payee)throw new CommerceError(404,'Payee not found.');
     if(!command.evidence)throw new CommerceError(400,'Bank verification or access purpose reference required.');
     if(command.action==='verify_payee'&&execution==='razorpayx'){const validation=await requireVerifiedBank(tx,id,bankValidationConfiguration());const [review]=await tx.select({actor:events.actorId}).from(events).where(and(eq(events.entityId,validation.id),eq(events.action,'accept_bank_name'))).limit(1);if(review?.actor===actor)throw new CommerceError(403,'A different Admin must approve the reviewed beneficiary.');}
     if(command.action==='reveal_payee') {
      const details=decryptPayee(payee.encrypted,command.creatorId);
      await tx.insert(events).values({creatorId:command.creatorId,actorId:actor,requestKey:command.requestKey,commandHash:hash,action:command.action,entityId:id,evidence});return {id,details};
     }
    }else if(command.action==='approve_payout') {
     if(process.env.CREATOR_BANK_SETTLEMENT_ENABLED!=='true')throw new CommerceError(503,'Bank settlement awaits launch approval and configuration.');
     const providerConfig=execution==='razorpayx'?requirePayoutExecution():null;
     if(providerConfig)await verifyPayoutTestDatabase(tx,providerConfig);
     if(providerConfig&&Number(command.amountPaise)<100)throw new CommerceError(400,'RazorpayX requires a minimum payout of ₹1.');
     paise(command.amountPaise);if(!command.amountPaise)throw new CommerceError(400,'Enter a positive payout amount.');
     const payee=await tx.query.creatorPayees.findFirst({where:and(eq(payees.id,id),eq(payees.creatorId,command.creatorId))});
     const verification=await tx.query.creatorFinanceEvents.findFirst({where:and(eq(events.entityId,id),sql`${events.action} in ('verify_payee','reject_payee')`),orderBy:[desc(events.createdAt),desc(events.id)]});
     if(providerConfig)await requireVerifiedBank(tx,id,payoutBankScope(providerConfig));
     if(!payee||payee.policyVersion!==SETTLEMENT_POLICY||verification?.action!=='verify_payee')throw new CommerceError(409,'An independently verified payee is required.');
     const run=await tx.query.courseFinanceRuns.findFirst({where:eq(runs.scope,scope)});
     if(!run?.disputesCheckedAt||run.disputesCheckedAt.getTime()<Date.now()-86400000)throw new CommerceError(409,'Run payment and dispute reconciliation before settlement.');
     const [blocked]=await tx.select({n:sql<number>`count(*)::int`}).from(checks).innerJoin(orders,eq(orders.id,checks.orderId)).where(and(eq(orders.creatorId,command.creatorId),sql`${orders.status} in ('paid','refunded','chargeback')`,sql`(${checks.scope}<>${scope} or ${checks.issue} is not null or ${checks.lastCheckedAt} is null or ${checks.lastCheckedAt}<now()-interval '24 hours')`));
     if(blocked.n)throw new CommerceError(409,'Resolve the displayed payment evidence issues before settlement.');
     const [reserved]=await tx.select({n:sql<string>`coalesce(sum(${payouts.amountPaise}),0)`}).from(payouts).where(and(eq(payouts.creatorId,command.creatorId),eq(payouts.scope,scope),sql`${payouts.state} not in ('failed','cancelled')`));
     const balance=await ledgerBalance(tx,command.creatorId,scope),matured=await ledgerBalance(tx,command.creatorId,scope,dueBefore());
     if(command.amountPaise>Math.min(balance,matured)-Number(reserved.n))throw new CommerceError(409,'Amount exceeds reconciled previous-month proceeds.');
     id=randomUUID();await tx.insert(payouts).values({id,creatorId:command.creatorId,payeeId:payee.id,scope,amountPaise:command.amountPaise,periodEnd:dueBefore(),approvedBy:actor});
     if(providerConfig)await preparePayoutJob(tx,id,scope,providerConfig);
    }else {
     const payout=await tx.query.creatorPayouts.findFirst({where:and(eq(payouts.id,id),eq(payouts.creatorId,command.creatorId),eq(payouts.scope,scope))});if(!payout)throw new CommerceError(404,'Payout not found.');
     const [providerJob]=await tx.select().from(creatorPayoutJobs).where(eq(creatorPayoutJobs.payoutId,id));
     if(providerJob&&(command.action!=='cancel_payout'||providerJob.submitAttempts>0||payout.state!=='approved'))throw new CommerceError(409,'Provider-managed payouts require RazorpayX reconciliation; bank receipt cannot be recorded manually.');
     if(!command.evidence)throw new CommerceError(400,'Bank evidence reference or reason is required.');
     let state:string;
     const updates:Partial<typeof payouts.$inferInsert>={updatedAt:new Date()};
     if(command.action==='initiate_payout'&&payout.state==='approved') {
      if(process.env.CREATOR_BANK_SETTLEMENT_ENABLED!=='true')throw new CommerceError(503,'Bank settlement is disabled.');
      if(actor===payout.approvedBy)throw new CommerceError(403,'A second Admin must record bank initiation.');
      state='initiated';updates.bankReference=requiredText(command.bankReference,6,100).toUpperCase();updates.initiatedBy=actor;
     }else if(command.action==='uncertain_payout'&&['approved','initiated'].includes(payout.state)) {
      if(payout.state==='approved'){if(actor===payout.approvedBy)throw new CommerceError(403,'A second Admin must record uncertain bank execution.');updates.initiatedBy=actor;}
      state='uncertain';
     }
     else if(command.action==='confirm_payout'&&['initiated','uncertain'].includes(payout.state)&&(payout.bankReference||command.bankReference)&&actor!==payout.initiatedBy) {state='confirmed';if(!payout.bankReference)updates.bankReference=requiredText(command.bankReference,6,100).toUpperCase();}
     else if(command.action==='fail_payout'&&['initiated','uncertain'].includes(payout.state)&&actor!==payout.initiatedBy)state='failed';
     else if(command.action==='cancel_payout'&&payout.state==='approved')state='cancelled';
     else throw new CommerceError(409,'Payout transition needs independent bank evidence.');
     await tx.update(payouts).set({...updates,state}).where(eq(payouts.id,id));
     if(providerJob&&state==='cancelled')await tx.update(creatorPayoutJobs).set({stage:'done',updatedAt:new Date()}).where(eq(creatorPayoutJobs.id,providerJob.id));
    }
   }
   await tx.insert(events).values({creatorId:command.creatorId,actorId:actor,requestKey:command.requestKey,commandHash:hash,action:command.action,entityId:id,evidence});
   return {id,replayed:false};
  });
 }
 async function creators(actor:string,page=1) {return database.transaction(async tx=>{await identity(tx,actor,true);return tx.select({id:users.id,name:users.fullName}).from(users).innerJoin(workspaceCreatorProfiles,eq(workspaceCreatorProfiles.userId,users.id)).orderBy(users.id).limit(25).offset((page-1)*25);});}
 return {read,execute,creators};
}
