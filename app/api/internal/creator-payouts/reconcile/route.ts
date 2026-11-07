import {observedWorker} from '@/lib/workspace/operations/worker';
import { financialWorkerAuthorized } from '@/lib/workspace/payments/worker-auth';
import { runPayoutWorker } from '@/lib/creator-payments/razorpayx/worker';
import { privateJson } from '@/lib/workspace/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) { if (!financialWorkerAuthorized(request))
    return privateJson({ error: 'Unauthorized' }, 401); try {
    const result = await observedWorker('payouts',()=>runPayoutWorker(),r=>r.failed>0);
    return privateJson(result, result.failed ? 503 : 200);
}
catch {
    return privateJson({ error: 'RazorpayX reconciliation is unavailable' }, 503);
} }
