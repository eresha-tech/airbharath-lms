import 'server-only';
import {sha256} from './model';
export type LiveSponsorshipContract={releaseId:string;scope:string;version:string;body:string;hash:string;accountingHash:string;sourceHash:string;founderApprovalHash:string;payoutExecution:false};
// Deliberately empty. Only a separately reviewed canonical commercial schedule
// and matching additive SQL registration may populate this catalogue.
const APPROVED_LIVE_RELEASES:Readonly<Record<string,Readonly<LiveSponsorshipContract>>>=Object.freeze({});
export function liveSponsorshipContract(env:Record<string,string|undefined>=process.env):Readonly<LiveSponsorshipContract>|null{
 const id=env.CREATOR_SPONSORSHIP_LIVE_RELEASE;
 if(!id||!Object.hasOwn(APPROVED_LIVE_RELEASES,id))return null;
 const c=APPROVED_LIVE_RELEASES[id];
 if(process.env.CREATOR_SPONSORSHIP_SYNTHETIC==='true'||env.CREATOR_SPONSORSHIP_SYNTHETIC==='true'||env.NODE_ENV!=='production'||env.DATABASE_ENV!=='production'||env.RAZORPAYX_TEST_AUTHORIZED==='true'||env.RAZORPAYX_TEST_SCOPE_FILE||!/^rzp_live_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID??'')||c.scope!=='live:'+env.COURSE_RAZORPAY_ACCOUNT_ID||c.releaseId!==id||sha256(c.body)!==c.hash||c.payoutExecution!==false||![c.hash,c.accountingHash,c.sourceHash,c.founderApprovalHash].every(v=>/^[a-f0-9]{64}$/.test(v)))return null;
 return c;
}
