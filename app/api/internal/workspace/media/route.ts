import { mediaWorkerAuthorized, runMediaWorker } from '@/lib/workspace/media/worker';
import { privateJson } from '@/lib/workspace/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!mediaWorkerAuthorized(request)) return privateJson({ error: 'Unauthorized' }, 401);
  try { return privateJson(await runMediaWorker()); } catch { return privateJson({ error: 'Media reconciliation unavailable.' }, 503); }
}
