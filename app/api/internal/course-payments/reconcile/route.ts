import {observedWorker} from '@/lib/workspace/operations/worker';
import { financialWorkerAuthorized } from '@/lib/workspace/payments/worker-auth';
import { runCourseFinanceWorker } from '@/lib/creator-payments/worker';
import { privateJson } from '@/lib/workspace/http';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
 if(!financialWorkerAuthorized(request))return privateJson({error:'Unauthorized'},401);
 const signal=AbortSignal.timeout(35000);
 try{const result=await observedWorker('course_payments',()=>runCourseFinanceWorker(undefined,undefined,undefined,{signal}),r=>r.failed>0||r.deferred>0||r.blocked>0);return privateJson(result,result.failed?503:200);}catch{return privateJson({error:'Course reconciliation unavailable'},503);}
}
