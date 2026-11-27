import { verifyPayoutTestDatabase } from './test-isolation';
import 'server-only';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorPayoutInbox, creatorBankInbox } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { payoutConfiguration, requirePayoutIdentity, type PayoutConfig } from './config';
import { providerId } from './model';
export async function receivePayoutWebhook(request: Request, database = db, config: PayoutConfig = payoutConfiguration()) {
    requirePayoutIdentity(config);
    await verifyPayoutTestDatabase(database, config);
    const signature = request.headers.get('x-razorpay-signature') ?? '';
    if (!/^[a-f0-9]{64}$/i.test(signature))
        throw new CommerceError(400, 'Invalid payout webhook signature.');
    const reader = request.body?.getReader();
    if (!reader)
        throw new CommerceError(400, 'Webhook body required.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > 65536) {
            await reader.cancel();
            throw new CommerceError(413, 'Webhook body too large.');
        }
        chunks.push(value);
    }
    const raw = Buffer.concat(chunks), expected = createHmac('sha256', config.webhookSecret).update(raw).digest();
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), expected))
        throw new CommerceError(400, 'Invalid payout webhook signature.');
    let body;
    try {
        body = JSON.parse(raw.toString('utf8'));
    }
    catch {
        throw new CommerceError(400, 'Invalid payout webhook body.');
    }
    if (body?.account_id !== config.merchantId)
        throw new CommerceError(409, 'Payout webhook merchant mismatch.');
    if(['fund_account.validation.completed','fund_account.validation.failed'].includes(body.event)) {
        const entity=body.payload?.['fund_account.validation']?.entity;
        const eventId=request.headers.get('x-razorpay-event-id')??'';
        if(entity?.entity!=='fund_account.validation'||!/^fav_[A-Za-z0-9]{6,100}$/.test(entity?.id)||!/^[A-Za-z0-9_-]{1,128}$/.test(eventId))throw new CommerceError(400,'Invalid bank validation notification.');
        const key=config.scope+':'+eventId,hash=createHash('sha256').update(raw).digest('hex');
        const hint=entity.notes?.airbharath_validation;
        const requestId=typeof hint==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hint)?hint:null;
        await database.insert(creatorBankInbox).values({id:key,scope:config.scope,hash,providerId:entity.id,requestId}).onConflictDoNothing();
        const [saved]=await database.select({hash:creatorBankInbox.hash}).from(creatorBankInbox).where(eq(creatorBankInbox.id,key));
        if(saved?.hash!==hash)throw new CommerceError(409,'Conflicting bank notification replay.');
        return {received:true,bankValidation:true};
    }
    if (!['payout.pending', 'payout.rejected', 'payout.queued', 'payout.initiated', 'payout.processed', 'payout.updated', 'payout.reversed', 'payout.failed'].includes(body.event))
        return { ignored: true };
    const entity = body.payload?.payout?.entity;
    if (entity?.entity !== 'payout' || entity.currency !== 'INR')
        throw new CommerceError(400, 'Payout entity required.');
    const id = providerId(entity.id, 'pout'), eventId = request.headers.get('x-razorpay-event-id') ?? '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(eventId))
        throw new CommerceError(400, 'Payout event identity required.');
    const key = config.scope + ':' + eventId, hash = createHash('sha256').update(raw).digest('hex');
    await database.insert(creatorPayoutInbox).values({ id: key, scope: config.scope, hash, providerId: id }).onConflictDoNothing();
    const [saved] = await database.select({ hash: creatorPayoutInbox.hash }).from(creatorPayoutInbox).where(eq(creatorPayoutInbox.id, key));
    if (saved?.hash !== hash)
        throw new CommerceError(409, 'Conflicting payout webhook replay.');
    return { received: true };
}
