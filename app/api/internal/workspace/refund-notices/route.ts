import { financialWorkerAuthorized } from '@/lib/workspace/payments/worker-auth';
import { runRefundNoticeWorker, refundNoticeDiagnostics } from '@/lib/workspace/refund-notifications/worker';
import { privateJson } from '@/lib/workspace/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request) {
  if(!financialWorkerAuthorized(request))return privateJson({error:'Unauthorized'},401);
  try {return privateJson(new URL(request.url).searchParams.get('view')==='status'?{outbox:await refundNoticeDiagnostics()}:{result:await runRefundNoticeWorker()});}
  catch{return privateJson({error:'Workspace notice operations unavailable.'},503);}
}
