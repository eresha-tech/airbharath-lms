import {runBankValidationWorker} from '@/lib/creator-payments/bank-validation/worker';
export const maxDuration = 60;
import { after } from 'next/server';
import { receivePayoutWebhook } from '@/lib/creator-payments/razorpayx/webhook';
import { runPayoutWorker } from '@/lib/creator-payments/razorpayx/worker';
import { commerceFailure } from '@/lib/commerce/http';
import { privateJson } from '@/lib/workspace/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
    try {
        const result = await receivePayoutWebhook(request);
        if (!('ignored' in result))
            try {
                after(async () => { try {
                    if('bankValidation' in result)await runBankValidationWorker();else await runPayoutWorker();
                }
                catch { /* Durable inbox and polling recover independently. */ } });
            }
            catch { /* Authenticated worker remains authoritative. */ }
        return privateJson(result);
    }
    catch (error) {
        return commerceFailure(error);
    }
}
