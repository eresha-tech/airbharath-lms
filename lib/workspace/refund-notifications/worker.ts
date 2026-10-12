import 'server-only';
import { noticeConfiguration } from './configuration';
import { classifyWorkspaceRuntime } from '../payments/classification';
import { createFinancialWorkerDatabase } from '../payments/worker-database';
import { createPostgresNoticeStore } from './repository';
import { createNoticeMailercloudAdapter } from './provider';
import { createRefundNoticeDeliveryService } from './service';
export async function runRefundNoticeWorker() {
  const configuration=noticeConfiguration();
  if(!configuration)throw new Error('notice_delivery_unavailable');
  const signal=AbortSignal.timeout(30_000),provider=createNoticeMailercloudAdapter(process.env,fetch,signal);
  const database=createFinancialWorkerDatabase(process.env,'workspace_refund_notice_worker');
  try {const store=createPostgresNoticeStore(database.db);const delivery=await createRefundNoticeDeliveryService(store,provider,configuration).run(signal,3);return {delivery,outbox:await store.summary()};}
  finally {await database.close();}
}
export async function refundNoticeDiagnostics() {
  if(!['production','development','test'].includes(classifyWorkspaceRuntime()))throw new Error('notice_runtime_unclassified');
  const database=createFinancialWorkerDatabase(process.env,'workspace_refund_notice_worker');
  try{return await createPostgresNoticeStore(database.db).summary();}finally{await database.close();}
}
