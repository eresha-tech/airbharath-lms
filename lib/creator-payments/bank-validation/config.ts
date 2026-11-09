import 'server-only';
import { payoutConfiguration, type PayoutConfig } from '../razorpayx/config';
import { CommerceError } from '@/lib/commerce/model';
export type BankValidationConfig = { payout: PayoutConfig; mode: 'synthetic' | 'live'; method: 'pennydrop'; amount: number; minIntervalSeconds:number; enabled: boolean; policy: 'mandatory-fav-v1' };
export function bankValidationConfiguration(env: Record<string,string|undefined> = process.env): BankValidationConfig {
  const payout = payoutConfiguration(env), synthetic = env.CREATOR_BANK_VALIDATION_TRANSPORT === 'synthetic';
  const amount = Number(env.RAZORPAYX_FAV_AMOUNT_PAISE);
  const minIntervalSeconds=synthetic?0:Number(env.RAZORPAYX_FAV_MIN_INTERVAL_SECONDS);
  const mode = synthetic ? 'synthetic' as const : 'live' as const;
  const safeSynthetic = synthetic && payout.mode === 'test' && ['test','development'].includes(env.DATABASE_ENV ?? '') && env.NODE_ENV !== 'production';
  // Traditional FAV has no test-mode API. Account-specific type, method, amount, fees and frequency require explicit review.
  const enabled = Number.isSafeInteger(amount) && amount > 0 && amount <= 10000 && env.RAZORPAYX_FAV_METHOD === 'pennydrop' && (safeSynthetic || !synthetic && Number.isSafeInteger(minIntervalSeconds) && minIntervalSeconds>=1 && minIntervalSeconds<=2592000 && payout.mode === 'live' && env.CREATOR_BANK_VALIDATION_ENABLED === 'true' && env.RAZORPAYX_FAV_ACTIVATION_CONFIRMED === 'true' && env.RAZORPAYX_FAV_PERMISSION_REVIEWED === 'true' && env.RAZORPAYX_FAV_FUNDING_TYPE === 'razorpayx_lite' && env.RAZORPAYX_FAV_APPROVED_FUNDING_FINGERPRINT === payout.fingerprint && env.RAZORPAYX_FAV_CHARGES_REVIEWED === 'true' && env.RAZORPAYX_FAV_FREQUENCY_REVIEWED === 'true' && env.RAZORPAYX_FAV_LIVE_AUTHORIZED === 'true');
  return {payout, mode, method:'pennydrop', amount,minIntervalSeconds, enabled, policy:'mandatory-fav-v1'};
}
export function requireBankValidation(c: BankValidationConfig) { if (!c.enabled) throw new CommerceError(503,'Bank verification awaits provider activation, account permissions and separate founder authorization.'); return c; }
export function bankValidationReadiness() { try {const c=bankValidationConfiguration();return {enabled:c.enabled,mode:c.mode,method:c.method};} catch {return {enabled:false,mode:null,method:null};} }
