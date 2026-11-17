import { verifyPayoutTestDatabase } from './test-isolation';
import {requireVerifiedBank,payoutBankScope} from '../bank-validation/service';
import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorPayouts as payouts, creatorPayoutJobs as jobs, creatorFinanceEvents as events, users } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { UUID } from '../model';
import { type PayoutConfig, payoutConfiguration, requirePayoutExecution } from './config';
import { providerId } from './model';
export type PayoutTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function preparePayoutJob(tx: PayoutTx, payoutId: string, collectionScope: string, config = requirePayoutExecution()) {
    if (`${config.mode}:${config.merchantId}` !== collectionScope)
        throw new CommerceError(409, 'Payout and collection merchant accounts do not match.');
    await verifyPayoutTestDatabase(tx, config);
    await tx.insert(jobs).values({ payoutId, scope: config.scope, fundingFingerprint: config.fingerprint, transferMode: config.transferMode });
}
export function assertLiveOperation(config: PayoutConfig, payoutId: string, amount: number, env: Record<string, string | undefined> = process.env) {
    requirePayoutExecution(config);
    if (config.mode !== 'live')
        return;
    if (env.RAZORPAYX_LIVE_ROLLOUT_AUTHORIZED === 'true')
        return;
    const max = Number(env.RAZORPAYX_LIVE_PILOT_MAX_PAISE);
    if (env.RAZORPAYX_LIVE_PILOT_PAYOUT_ID !== payoutId || !Number.isSafeInteger(max) || max < 100 || max > 10000 || amount > max)
        throw new CommerceError(503, 'Live execution is restricted to the separately authorized pilot payout and amount.');
}
export async function payoutControl(actor: string, command: {
    action: string;
    requestKey: string;
    creatorId: string;
    entityId?: string;
    evidence?: string;
    providerPayoutId?: string;
}, database = db, config = payoutConfiguration()) {
    await verifyPayoutTestDatabase(database, config);
    if (!UUID.test(command.requestKey) || !UUID.test(command.creatorId) || !command.entityId || !UUID.test(command.entityId) || !command.evidence || command.evidence.trim().length < 6 || command.evidence.length > 2000)
        throw new CommerceError(400, 'Provide the payout and an independent review reference.');
    const evidence = command.evidence;
    return database.transaction(async (tx) => {
        await tx.select({ id: users.id }).from(users).where(eq(users.id, command.creatorId)).for('update');
        const [admin] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actor)).for('share');
        if (admin?.role !== 'admin' || actor === command.creatorId)
            throw new CommerceError(403, 'Independent persisted Admin required.');
        const [p] = await tx.select().from(payouts).where(and(eq(payouts.id, command.entityId!), eq(payouts.creatorId, command.creatorId))).for('update');
        const [j] = p ? await tx.select().from(jobs).where(eq(jobs.payoutId, p.id)).for('update') : [];
        if (!p || !j || j.scope !== config.scope)
            throw new CommerceError(404, 'RazorpayX payout not found in this funding scope.');
        const { hash } = await import('./model'), commandHash = hash(command);
        const [previous] = await tx.select().from(events).where(and(eq(events.actorId, actor), eq(events.requestKey, command.requestKey)));
        if (previous) {
            if (previous.commandHash !== commandHash)
                throw new CommerceError(409, 'Request key was used for a different action.');
            return { id: p.id, replayed: true };
        }
        if (command.action === 'authorize_razorpayx') {
            assertLiveOperation(config, p.id, p.amountPaise);
            await requireVerifiedBank(tx,p.payeeId,payoutBankScope(config),j.fundAccountId??undefined);
            if (actor === p.approvedBy || j.authorizedBy || p.state !== 'approved')
                throw new CommerceError(409, 'A second Admin must authorize the current reserved payout.');
            const [decision] = await tx.execute(sql `select action from creator_finance_events where entity_id=${p.payeeId} and creator_id=${p.creatorId} and action in ('verify_payee','reject_payee') order by created_at desc,id desc limit 1`);
            if (decision?.action !== 'verify_payee')
                throw new CommerceError(409, 'Payee verification was revoked.');
            await tx.update(jobs).set({ authorizedBy: actor, stage: 'ready', nextAt: new Date(), updatedAt: new Date() }).where(eq(jobs.id, j.id));
        }
        else if (command.action === 'reconcile_razorpayx') {
            if (!j.authorizedBy || ['awaiting_authorization'].includes(j.stage))
                throw new CommerceError(409, 'Independent payout authorization is required.');
            await tx.update(jobs).set({ nextAt: new Date(), updatedAt: new Date() }).where(eq(jobs.id, j.id));
        }
        else if (command.action === 'trace_razorpayx') {
            if (j.providerId || !j.submitAttempts || actor === j.authorizedBy)
                throw new CommerceError(409, 'An independent Admin may supply a missing provider ID for reconciliation only.');
            const id = providerId(command.providerPayoutId, 'pout');
            // A trace is only a hint. The worker must independently fetch and validate it.
            await tx.insert(events).values({ creatorId: p.creatorId, actorId: actor, requestKey: command.requestKey, commandHash, action: 'trace_razorpayx', entityId: p.id, evidence: JSON.stringify({ review: command.evidence, providerPayoutId: id }) });
            await tx.update(jobs).set({ nextAt: new Date(), updatedAt: new Date() }).where(eq(jobs.id, j.id));
            return { id: p.id, replayed: false };
        }
        else
            throw new CommerceError(400, 'Unsupported payout action.');
        await tx.insert(events).values({ creatorId: p.creatorId, actorId: actor, requestKey: command.requestKey, commandHash, action: command.action, entityId: p.id, evidence });
        return { id: p.id, replayed: false };
    });
}
