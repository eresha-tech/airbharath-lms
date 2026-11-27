import 'server-only';
import {sql} from 'drizzle-orm';
import type {db} from '@/lib/db';
import {payoutConfiguration} from '@/lib/creator-payments/razorpayx/config';
import {verifyPayoutTestDatabase} from '@/lib/creator-payments/razorpayx/test-isolation';
import {SponsorshipError,SYNTHETIC_AGREEMENT_BODY,SYNTHETIC_AGREEMENT_HASH,SYNTHETIC_AGREEMENT_VERSION} from './model';
import {liveSponsorshipContract} from './activation';
import {requireCourseScope} from '@/lib/creator-payments/config';
export function assertSyntheticSponsorshipRuntime(env:Record<string,string|undefined>=process.env) {
 const production=(e:Record<string,string|undefined>)=>e.NODE_ENV==='production'||['production','staging'].includes(e.DATABASE_ENV??'')||e.VERCEL==='1'||e.VERCEL_ENV==='production'||e.VERCEL_TARGET_ENV==='production';
 if(production(process.env)||production(env)||env.CREATOR_SPONSORSHIP_SYNTHETIC!=='true'||!['test','development'].includes(env.NODE_ENV??'')||env.DATABASE_ENV!=='test')throw new SponsorshipError(503,'Sponsored offers await final legal/accounting approval. Only an independently isolated synthetic run is supported.');
}
export function sponsorshipSyntheticEnabled(){try{assertSyntheticSponsorshipRuntime();return true;}catch{return false;}}
export function sponsorshipConfigured(){return sponsorshipSyntheticEnabled()||liveSponsorshipContract()!==null;}
export type SponsorshipExecutor=Pick<typeof db,'execute'>;
export async function requireSponsorshipContext(database:SponsorshipExecutor){
 const live=liveSponsorshipContract();
 if(live){
  if(requireCourseScope()!==live.scope)throw new SponsorshipError(503,'Commercial merchant identity changed.');
  await database.execute(sql`select creator_commercial_scope_guard(${live.scope})`);
  const rows=await database.execute(sql`select id,legal_hash,accounting_hash,source_hash,founder_approval_hash from creator_commercial_live_releases where scope=${live.scope}`),r=rows[0];
  if(!r||r.id!==live.releaseId||r.legal_hash!==live.hash||r.accounting_hash!==live.accountingHash||r.source_hash!==live.sourceHash||r.founder_approval_hash!==live.founderApprovalHash)throw new SponsorshipError(503,'Separately reviewed commercial release required.');
  return {scope:live.scope,version:live.version,body:live.body,hash:live.hash,synthetic:false};
 }
 assertSyntheticSponsorshipRuntime();const scope=await verifyCommercialTestDatabase(database);await database.execute(sql`select creator_commercial_scope_guard(${scope})`);
 return {scope,version:SYNTHETIC_AGREEMENT_VERSION,body:SYNTHETIC_AGREEMENT_BODY,hash:SYNTHETIC_AGREEMENT_HASH,synthetic:true};
}
export async function verifyCommercialTestDatabase(database:SponsorshipExecutor){
 const config=payoutConfiguration();if(config.mode!=='test')throw new SponsorshipError(503,'Synthetic scope required.');await verifyPayoutTestDatabase(database,config);return 'test:'+config.merchantId;
}
export async function requireSyntheticSponsorship(database:SponsorshipExecutor){return (await requireSponsorshipContext(database)).scope;}
