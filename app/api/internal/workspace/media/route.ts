import {financialWorkerAuthorized} from '@/lib/workspace/payments/worker-auth';
import {observedWorker} from '@/lib/workspace/operations/worker';
import { mediaWorkerAuthorized, runMediaWorker } from '@/lib/workspace/media/worker';
import { privateJson } from '@/lib/workspace/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!mediaWorkerAuthorized(request)) return privateJson({ error: 'Unauthorized' }, 401);
  try { return privateJson(await observedWorker('media',()=>runMediaWorker(),r=>r.deferred>0)); } catch { return privateJson({ error: 'Media reconciliation unavailable.' }, 503); }
}

export async function GET(request:Request){if(!financialWorkerAuthorized(request))return privateJson({error:'Unauthorized'},401);try{return privateJson(await observedWorker('media',()=>runMediaWorker(),r=>r.deferred>0));}catch{return privateJson({error:'Media reconciliation unavailable.'},503);}}
