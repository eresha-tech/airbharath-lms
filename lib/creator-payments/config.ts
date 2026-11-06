import 'server-only';
import { CommerceError } from '@/lib/commerce/model';
// Merchant identity survives credential rotation; test/live balances stay separate.
// The configured merchant ID must match account_id in signed course webhooks.
export function courseScope(env:Record<string,string|undefined>=process.env) {
 const key=env.RAZORPAY_KEY_ID||env.NEXT_PUBLIC_RAZORPAY_KEY_ID,account=env.COURSE_RAZORPAY_ACCOUNT_ID;
 if(!key||!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(key)||!env.RAZORPAY_KEY_SECRET||env.RAZORPAY_KEY_SECRET==='dummy_secret_key'||!account||!/^acc_[A-Za-z0-9_]{6,100}$/.test(account))return null;
 if(env.RAZORPAY_KEY_ID&&env.NEXT_PUBLIC_RAZORPAY_KEY_ID&&env.RAZORPAY_KEY_ID!==env.NEXT_PUBLIC_RAZORPAY_KEY_ID)return null;
 if(key.startsWith('rzp_live_')&&env.DATABASE_ENV!=='production')return null;
 return `${key.startsWith('rzp_live_')?'live':'test'}:${account}`;
}
export function requireCourseScope() {const scope=courseScope();if(!scope)throw new CommerceError(503,'Course payment credentials and merchant identity are unavailable.');return scope;}
