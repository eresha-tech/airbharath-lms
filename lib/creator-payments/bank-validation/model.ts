export type NameDecision = 'match' | 'review' | 'mismatch' | 'missing';
export type BankDetails = { holder: string; account: string; ifsc: string };
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Deliberately conservative. Initials, reordered names and transliterations require independent evidence.
export function compareBeneficiaryNames(claimed: string, registered: unknown): NameDecision {
  const normalize = (s: string) => s.normalize('NFKC').toLocaleUpperCase('en-IN').replace(/^(MR|MRS|MS|DR|SHRI|SMT)\.?\s+/u, '').replace(/[.\-'’]/gu, '').replace(/\s+/gu, ' ').trim();
  if (typeof registered !== 'string' || !registered.trim()) return 'missing';
  const a = normalize(claimed), b = normalize(registered);
  if (!a || !b) return 'missing';
  if (a === b) return 'match';
  const left = a.split(' '), right = b.split(' ');
  const remainingLeft=[...left],remainingRight=[...right];
  // Remove identical tokens first. Sharing a surname must never hide a conflicting full given name.
  for(let i=remainingLeft.length-1;i>=0;i--){const j=remainingRight.indexOf(remainingLeft[i]);if(j>=0){remainingLeft.splice(i,1);remainingRight.splice(j,1);}}
  if(!remainingLeft.length||!remainingRight.length)return 'review';
  for(let i=remainingLeft.length-1;i>=0;i--){const x=remainingLeft[i],j=remainingRight.findIndex(y=>x.length===1&&y.startsWith(x)||y.length===1&&x.startsWith(y));if(j>=0){remainingLeft.splice(i,1);remainingRight.splice(j,1);}}
  return !remainingLeft.length||!remainingRight.length||left.join('')===right.join('') ? 'review' : 'mismatch';
}
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function validationFact(raw: unknown, bound: {id: string; contactId: string; fundAccountId: string; amount: number; bank: BankDetails}) {
  const r = object(raw), f = object(r.fund_account), bank = object(f.bank_account), notes = object(r.notes);
  if (!/^fav_[A-Za-z0-9]{6,100}$/.test(String(r.id)) || r.entity !== 'fund_account.validation' || !['created','completed','failed'].includes(String(r.status)) || r.currency !== 'INR' || r.amount !== bound.amount || f.id !== bound.fundAccountId || f.contact_id !== bound.contactId || f.account_type !== 'bank_account' || bank.account_number !== bound.bank.account || bank.ifsc !== bound.bank.ifsc || bank.name !== bound.bank.holder || notes.airbharath_validation !== bound.id) throw Error('validation_binding_mismatch');
  const results = object(r.results), alternate = object(r.validation_results);
  if (Object.keys(results).length && Object.keys(alternate).length && (results.account_status !== alternate.account_status || results.registered_name !== alternate.registered_name)) throw Error('validation_results_conflict');
  const result = Object.keys(results).length ? results : alternate;
  const accountStatus = result.account_status === 'invalid' ? 'invalid' : result.account_status === 'active' ? 'active' : 'unknown';
  const nameDecision = compareBeneficiaryNames(bound.bank.holder, result.registered_name);
  // An inactive fund account or failed validation transaction never establishes eligibility.
  const state = accountStatus === 'invalid' ? 'invalid' : r.status === 'created' ? 'pending' : r.status === 'completed' && accountStatus === 'active' && f.active === true && nameDecision === 'match' ? 'valid' : 'review';
  return { providerId: String(r.id), transactionStatus: String(r.status), accountStatus, nameDecision, state };
}
export function bankVerificationCopy(state?: string | null, reviewed = false) {
  if (state === 'invalid') return 'These bank details could not be accepted. Check the account number and IFSC, then save corrected details for a fresh check.';
  if (state === 'review' && reviewed) return 'Bank details verified with independently reviewed ownership evidence. Monthly payments still require financial approval.';
  if (state === 'valid') return reviewed ? 'Bank details verified and independently approved for payment review.' : 'The bank check is complete. Independent approval is still required before payment.';
  if (state === 'review') return 'Your bank details need an independent review. Contact finance support with proof of account ownership; do not submit someone else’s account.';
  if (state === 'pending' || state === 'prepared') return 'Your bank check is in progress. You do not need to submit the same details again.';
  return 'Bank verification is awaiting availability. Your details are saved securely and your earnings remain recorded. Contact finance support for an update.';
}
