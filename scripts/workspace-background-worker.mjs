// Same authorized handlers, health identities and durable stores as the web API.
// Executed in its own Node process; no web server or Vercel invocation required.
import {GET as membership} from '../app/api/internal/workspace/reconcile/route.ts';
import {GET as coursePayments} from '../app/api/internal/course-payments/reconcile/route.ts';
import {GET as payouts} from '../app/api/internal/creator-payouts/reconcile/route.ts';
import {GET as bankValidations} from '../app/api/internal/creator-bank-validations/reconcile/route.ts';
import {GET as media} from '../app/api/internal/workspace/media/route.ts';
import {GET as refundNotices} from '../app/api/internal/workspace/refund-notices/route.ts';
import {createWorker,workerConfiguration,workerSchedule} from './workspace-worker.mjs';
import schedule from '../vercel.json';
const handlers=new Map([
 ['/api/internal/workspace/reconcile',membership],['/api/internal/course-payments/reconcile',coursePayments],
 ['/api/internal/creator-payouts/reconcile',payouts],['/api/internal/creator-bank-validations/reconcile',bankValidations],
 ['/api/internal/workspace/media',media],['/api/internal/workspace/refund-notices',refundNotices],
]);
try {
 const config=workerConfiguration();
 const worker=createWorker(config,workerSchedule(schedule.crons),async(url,init)=>{
  const handler=handlers.get(new URL(url).pathname);if(!handler)throw Error('Unknown worker');
  return handler(new Request(url,init));
 });
 worker.poll();const timer=setInterval(()=>worker.poll(),1000);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{clearInterval(timer);void worker.stop();});
} catch {console.error('Background worker startup refused. Explicit authorization is required.');process.exitCode=1;}
