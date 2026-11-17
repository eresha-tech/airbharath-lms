import 'server-only';
import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import type {db} from '@/lib/db';
import type {PurchaseEvidence} from '@/lib/commerce/model';
import {requireSyntheticSponsorship} from './config';
import {commercialRows} from './service';
import {quoteDeadline,SYNTHETIC_AGREEMENT_HASH,SYNTHETIC_AGREEMENT_VERSION,type CommercialSnapshot} from './model';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function freezeCommercialQuote(tx:Tx,learnerId:string,courseId:string,evidence:PurchaseEvidence,scope:string){
 const approvedScope=await requireSyntheticSponsorship(tx);if(approvedScope!==scope||!evidence.creatorId)throw new Error('commercial_scope_mismatch');
 await tx.execute(sql`select id from users where id=${evidence.creatorId}::uuid for update`);
 const [time]=await commercialRows<{at:string}>(tx,sql`select clock_timestamp() at`),at=new Date(time.at);
 const [active]=await commercialRows<{id:string;agreement_id:string;legal_hash:string;legal_version:string;arrangement:CommercialSnapshot['arrangement']}>(tx,sql`select e.id,e.agreement_id,a.legal_hash,a.legal_version,case when e.action in ('replaced_paid','released_0') then 'standard_0' else a.arrangement end arrangement from creator_commercial_events e join creator_commercial_agreements a on a.id=e.agreement_id where e.creator_id=${evidence.creatorId}::uuid and e.action in ('accepted','replaced_paid','released_0') and a.scope=${scope} and e.effective_at<=${at.toISOString()}::timestamptz order by e.sequence desc limit 1`);
 const id=randomUUID(),commercial:CommercialSnapshot={version:1,synthetic:true,quoteId:id,arrangement:active?.arrangement??'standard_0',agreementId:active?.agreement_id??null,effectiveEventId:active?.id??null,scope,legalVersion:active?.legal_version??SYNTHETIC_AGREEMENT_VERSION,legalHash:active?.legal_hash??SYNTHETIC_AGREEMENT_HASH,calculationVersion:'fixed-share-paise-v1'};
 const frozen={...evidence,commercial};
 await tx.execute(sql`insert into creator_course_commercial_quotes(id,learner_id,creator_id,course_id,agreement_id,effective_event_id,scope,arrangement,evidence,created_at,expires_at) values(${id}::uuid,${learnerId}::uuid,${evidence.creatorId}::uuid,${courseId}::uuid,${commercial.agreementId}::uuid,${commercial.effectiveEventId}::uuid,${scope},${commercial.arrangement},${JSON.stringify(frozen)}::jsonb,${at.toISOString()}::timestamptz,${quoteDeadline(at).toISOString()}::timestamptz)`);
 return frozen;
}
