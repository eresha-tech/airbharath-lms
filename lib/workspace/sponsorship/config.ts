import 'server-only';
import {sql} from 'drizzle-orm';
import type {db} from '@/lib/db';
import {payoutConfiguration} from '@/lib/creator-payments/razorpayx/config';
import {verifyPayoutTestDatabase} from '@/lib/creator-payments/razorpayx/test-isolation';
import {SponsorshipError} from './model';
export function assertSyntheticSponsorshipRuntime(env:Record<string,string|undefined>=process.env) {
 const production=(e:Record<string,string|undefined>)=>e.NODE_ENV==='production'||['production','staging'].includes(e.DATABASE_ENV??'')||e.VERCEL==='1'||e.VERCEL_ENV==='production'||e.VERCEL_TARGET_ENV==='production';
 if(production(process.env)||production(env)||env.CREATOR_SPONSORSHIP_SYNTHETIC!=='true'||!['test','development'].includes(env.NODE_ENV??'')||env.DATABASE_ENV!=='test')throw new SponsorshipError(503,'Sponsored offers await final legal/accounting approval. Only an independently isolated synthetic run is supported.');
}
export function sponsorshipSyntheticEnabled(){try{assertSyntheticSponsorshipRuntime();return true;}catch{return false;}}
export type SponsorshipExecutor=Pick<typeof db,'execute'>;
export async function requireSyntheticSponsorship(database:SponsorshipExecutor){
 assertSyntheticSponsorshipRuntime();const config=payoutConfiguration();if(config.mode!=='test')throw new SponsorshipError(503,'Synthetic scope required.');
 await verifyPayoutTestDatabase(database,config);
 const scope='test:'+config.merchantId;await database.execute(sql`select creator_commercial_scope_guard(${scope})`);return scope;
}
