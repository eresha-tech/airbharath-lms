import {financialWorkerAuthorized} from '@/lib/workspace/payments/worker-auth';
import {privateJson} from '@/lib/workspace/http';
import {runBankValidationWorker} from '@/lib/creator-payments/bank-validation/worker';
import {observedWorker} from '@/lib/workspace/operations/worker';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
 if(!financialWorkerAuthorized(request))return privateJson({error:'Unauthorized'},401);
 try {const result=await observedWorker('bank_validations',()=>runBankValidationWorker(),r=>r.review>0||r.uncertain>0||r.blocked>0||r.stale>0);return privateJson(result,result.review?503:200);}
 catch{return privateJson({error:'Bank verification awaits configuration or reconciliation.'},503);}
}
