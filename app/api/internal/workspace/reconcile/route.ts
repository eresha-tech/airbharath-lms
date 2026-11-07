import {observedWorker} from '@/lib/workspace/operations/worker';
import { financialWorkerAuthorized } from '@/lib/workspace/payments/worker-auth';
import { runWorkspaceFinancialWorker } from '@/lib/workspace/payments/worker';
import { privateJson } from '@/lib/workspace/http';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!financialWorkerAuthorized(request)) return privateJson({ error: 'Unauthorized' }, 401);
  try { return privateJson({ result: await observedWorker('membership',()=>runWorkspaceFinancialWorker(),r=>r.payments!=='visited'||r.activation!=='visited'||r.refunds==='retry_required') }); }
  catch { return privateJson({ error: 'Workspace reconciliation unavailable.' }, 503); }
}
