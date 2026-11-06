import { financialWorkerAuthorized } from '@/lib/workspace/payments/worker-auth';
import { runCourseFinanceWorker } from '@/lib/creator-payments/worker';
import { privateJson } from '@/lib/workspace/http';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
 if(!financialWorkerAuthorized(request))return privateJson({error:'Unauthorized'},401);
 try{const result=await runCourseFinanceWorker();return privateJson(result,result.failed?503:200);}catch{return privateJson({error:'Course reconciliation unavailable'},503);}
}
