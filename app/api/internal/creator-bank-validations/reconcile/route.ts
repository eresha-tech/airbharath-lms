import {financialWorkerAuthorized} from '@/lib/workspace/payments/worker-auth';
import {privateJson} from '@/lib/workspace/http';
import {runBankValidationWorker} from '@/lib/creator-payments/bank-validation/worker';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
 if(!financialWorkerAuthorized(request))return privateJson({error:'Unauthorized'},401);
 try {const result=await runBankValidationWorker();return privateJson(result,result.review?503:200);}
 catch{return privateJson({error:'Bank verification awaits configuration or reconciliation.'},503);}
}
