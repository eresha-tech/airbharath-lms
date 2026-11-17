import { verifyPayoutTestDatabase } from './test-isolation';
import {requireVerifiedBank,payoutBankScope} from '../bank-validation/service';
import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorPayoutJobs as jobs, creatorPayouts as payouts, creatorPayees as payees, creatorPayoutObservations as observations, creatorPayoutInbox as inbox, users } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { decryptPayee, decryptFinanceData, encryptPayee } from '../crypto';
import { payoutConfiguration, type PayoutConfig } from './config';
import { razorpayXPayoutAdapter, type PayoutAdapter, PayoutProviderError } from './adapter';
import { hash, payoutFact, matchesIntent, payoutState, mayObserve, type PayoutRequest, type PayoutFact } from './model';
import { assertLiveOperation, type PayoutTx } from './service';
type Job = typeof jobs.$inferSelect;
async function locked(tx: PayoutTx, j: Job) { const [p] = await tx.select().from(payouts).where(eq(payouts.id, j.payoutId)); if (!p)
    throw new CommerceError(409, 'Payout missing.'); await tx.select({ id: users.id }).from(users).where(eq(users.id, p.creatorId)).for('update'); const [current] = await tx.select().from(jobs).where(eq(jobs.id, j.id)).for('update'); if (current?.leaseToken !== j.leaseToken)
    throw new CommerceError(409, 'Payout worker claim expired.'); return { j: current, p }; }
function intent(j: Job, p: typeof payouts.$inferSelect, c: PayoutConfig): PayoutRequest { if (!j.requestEncrypted || !j.requestHash)
    throw new CommerceError(409, 'Payout request is not prepared.'); const r = decryptFinanceData(j.requestEncrypted, 'razorpayx:' + p.id) as PayoutRequest; if (hash(r) !== j.requestHash || r.amount !== p.amountPaise || r.reference_id !== p.id || r.account_number !== c.fundingAccount || r.fund_account_id !== j.fundAccountId || r.currency !== 'INR' || r.mode !== j.transferMode || r.purpose !== 'payout' || r.queue_if_low_balance !== true || r.narration !== 'AirBharath Creator')
    throw new CommerceError(409, 'Immutable payout request mismatch.'); return r; }
export async function runPayoutWorker(database = db, config = payoutConfiguration(), provider: PayoutAdapter = razorpayXPayoutAdapter(config), limit = 10) {
    await verifyPayoutTestDatabase(database, config);
    const result = { processed: 0, failed: 0, inbox: 0 }, deadline = Date.now() + 45000;
    // verifyFund makes two HTTP calls; reserve enough time for both 6-second timeouts.
    async function call<T>(operation: () => Promise<T>) {
        if (Date.now() >= deadline - 13000) throw new PayoutProviderError('worker_deadline_retry');
        return operation();
    }
    async function persist(j: Job, values: Partial<typeof jobs.$inferInsert>) { return database.transaction(async (tx) => { await locked(tx, j); await tx.update(jobs).set({ ...values, updatedAt: new Date() }).where(eq(jobs.id, j.id)); }); }
    async function observe(j: Job, f: PayoutFact, source: 'create' | 'reconcile') {
        await database.transaction(async (tx) => {
            const { j: current, p } = await locked(tx, j), request = intent(current, p, config);
            matchesIntent(f, request);
            if (current.providerId && current.providerId !== f.id)
                throw new CommerceError(409, 'Provider returned a different payout identity.');
            if (source === 'reconcile' && !mayObserve(current.providerStatus, f.status))
                throw new CommerceError(409, 'Provider status would regress confirmed history.');
            await tx.insert(observations).values({ jobId: j.id, providerId: f.id, source, status: f.status, fact: { ...f }, hash: hash(f) }).onConflictDoNothing();
            if (source === 'create') {
                await tx.update(jobs).set({ providerId: f.id, stage: 'tracking', nextAt: new Date(), updatedAt: new Date() }).where(eq(jobs.id, j.id));
                return;
            }
            const terminal = ['processed', 'failed', 'reversed', 'rejected', 'cancelled'].includes(f.status), state = payoutState(f.status), now = new Date();
            await tx.update(jobs).set({ providerId: f.id, providerStatus: f.status, providerFeesPaise: f.fees, providerTaxPaise: f.tax, utr: f.utr, reason: f.reason, lastReconciledAt: now, processedAt: f.status === 'processed' ? (current.processedAt ?? now) : current.processedAt, reversedAt: f.status === 'reversed' ? (current.reversedAt ?? now) : current.reversedAt, stage: terminal ? 'done' : 'tracking', nextAt: new Date(Date.now() + (f.status === 'processed' ? 86400000 : terminal ? 3650 * 86400000 : 60000)), lastError: null, updatedAt: now }).where(eq(jobs.id, j.id));
            if (p.state !== state || f.utr && p.bankReference !== f.utr)
                await tx.update(payouts).set({ state, bankReference: f.utr ?? p.bankReference, initiatedBy: current.authorizedBy, updatedAt: now }).where(eq(payouts.id, p.id));
        });
    }
    // Inbox notifications only expedite a separately authenticated provider fetch.
    const hints = await database.select().from(inbox).where(and(eq(inbox.scope, config.scope), eq(inbox.state, 'pending'), sql `${inbox.nextAt}<=now()`)).limit(100);
    for (const hint of hints) {
        await database.transaction(async tx => {
            const [job] = await tx.select({id: jobs.id, creatorId: payouts.creatorId})
                .from(jobs).innerJoin(payouts, eq(payouts.id, jobs.payoutId))
                .where(and(eq(jobs.scope, config.scope), eq(jobs.providerId, hint.providerId))).limit(1);
            if (job) {
                await tx.select({id: users.id}).from(users).where(eq(users.id, job.creatorId)).for('update');
                await tx.update(jobs).set({nextAt: new Date()}).where(eq(jobs.id, job.id));
            }
            await tx.update(inbox).set({state: 'done'}).where(eq(inbox.id, hint.id));
        });
        result.inbox++;
    }
    for (let n = 0; n < limit && Date.now() < deadline - 7000; n++) {
        const [candidate] = await database.select().from(jobs).where(and(eq(jobs.scope, config.scope), sql `${jobs.stage}<>'awaiting_authorization' and (${jobs.stage}<>'done' or ${jobs.providerStatus}='processed') and ${jobs.nextAt}<=now() and (${jobs.leaseUntil} is null or ${jobs.leaseUntil}<now())`)).orderBy(jobs.nextAt, jobs.id).limit(1);
        if (!candidate)
            break;
        const claim = await database.transaction(async (tx) => {
            const [p] = await tx.select().from(payouts).where(eq(payouts.id, candidate.payoutId));
            if (!p)
                return null;
            await tx.select({ id: users.id }).from(users).where(eq(users.id, p.creatorId)).for('update');
            const [j] = await tx.select().from(jobs).where(eq(jobs.id, candidate.id)).for('update');
            if (!j || j.leaseUntil && j.leaseUntil > new Date() || j.nextAt > new Date())
                return null;
            const token = randomUUID(), [updated] = await tx.update(jobs).set({ leaseToken: token, leaseUntil: new Date(Date.now() + 120000), attempts: j.attempts + 1, updatedAt: new Date() }).where(eq(jobs.id, j.id)).returning();
            return { j: updated, p };
        });
        if (!claim)
            continue;
        let j = claim.j;
        const p = claim.p;
        let moneyPost = false;
        try {
            if (j.fundingFingerprint !== config.fingerprint || j.scope !== config.scope || !j.authorizedBy)
                throw new CommerceError(409, 'Payout funding identity or authorization changed.');
            if (j.providerId) {
                const request = intent(j, p, config), fact = payoutFact(await call(() => provider.fetch(j.providerId!)));
                matchesIntent(fact, request);
                await observe(j, fact, 'reconcile');
                result.processed++;
                continue;
            }
            if (p.state === 'cancelled' || p.state === 'failed') {
                await persist(j, { stage: 'done', nextAt: new Date(Date.now() + 3650 * 86400000) });
                continue;
            }
            assertLiveOperation(config, p.id, p.amountPaise);
            const [bank] = await database.select().from(payees).where(eq(payees.id, p.payeeId));
            if (!bank)
                throw new CommerceError(409, 'Bound payee missing.');
            const details = decryptPayee(bank.encrypted, p.creatorId);
            if (!j.submitAttempts) {
                const [decision] = await database.execute(sql `select action from creator_finance_events where entity_id=${p.payeeId} and creator_id=${p.creatorId} and action in ('verify_payee','reject_payee') order by created_at desc,id desc limit 1`);
                if (decision?.action !== 'verify_payee')
                    throw new CommerceError(409, 'Payee verification was revoked.');
            }
            const validation=await requireVerifiedBank(database,p.payeeId,payoutBankScope(config),j.fundAccountId??undefined);
            if(!j.contactId&&!j.fundAccountId) {await persist(j,{contactId:validation.contactId,fundAccountId:validation.fundAccountId});j={...j,contactId:validation.contactId,fundAccountId:validation.fundAccountId};}
            if (!j.contactId) {
                const id = await call(() => provider.contact(p.payeeId));
                await persist(j, { contactId: id });
                j = { ...j, contactId: id };
            }
            if (!j.fundAccountId) {
                const id = await call(() => provider.fund(j.contactId!, details));
                await persist(j, { fundAccountId: id });
                j = { ...j, fundAccountId: id };
            }
            if (!j.requestEncrypted) {
                const request: PayoutRequest = { account_number: config.fundingAccount, fund_account_id: j.fundAccountId!, amount: p.amountPaise, currency: 'INR', mode: j.transferMode as 'NEFT' | 'IMPS', purpose: 'payout', queue_if_low_balance: true, reference_id: p.id, narration: 'AirBharath Creator' };
                const encrypted = encryptPayee(request, 'razorpayx:' + p.id), requestHash = hash(request);
                await persist(j, { requestEncrypted: encrypted, requestHash });
                j = { ...j, requestEncrypted: encrypted, requestHash };
            }
            const request = intent(j, p, config);
            // An Admin trace is only a lookup hint, never evidence of success.
            const trace = await database.execute(sql `select evidence::jsonb->>'providerPayoutId' id from creator_finance_events where entity_id=${p.id} and action='trace_razorpayx' order by created_at desc,id desc limit 1`);
            if (trace[0]?.id) {
                const f = payoutFact(await call(() => provider.fetch(String(trace[0].id))));
                matchesIntent(f, request);
                await observe(j, f, 'reconcile');
                result.processed++;
                continue;
            }
            // Recover lost responses by the immutable reference before considering a resend.
            if (j.submitAttempts) {
                const page = await call(() => provider.list(j.scanSkip));
                if (!Array.isArray(page.items) || page.items.length > 100)
                    throw new CommerceError(409, 'Provider payout search is incomplete.');
                const matches = page.items.filter((r: Record<string, unknown>) => r.reference_id === p.id);
                if (matches.length > 1)
                    throw new CommerceError(409, 'Multiple provider payouts need independent investigation.');
                if (matches.length) {
                    const f = payoutFact(await call(() => provider.fetch(String((matches[0] as Record<string, unknown>).id))));
                    matchesIntent(f, request);
                    await observe(j, f, 'reconcile');
                    result.processed++;
                    continue;
                }
                if (page.items.length === 100) {
                    await persist(j, { scanSkip: j.scanSkip + 100, stage: 'tracking', nextAt: new Date() });
                    continue;
                }
                await persist(j, { scanSkip: 0 });
            }
            await call(() => provider.verifyFund(j.fundAccountId!, j.contactId!, details));
            // Recheck and commit the attempt before any money request. Database guards
            // independently recheck payee, ledger reservations, refunds and disputes.
            await database.transaction(async (tx) => { const current = await locked(tx, j); await requireVerifiedBank(tx,p.payeeId,payoutBankScope(config),j.fundAccountId!); if (current.p.state === 'cancelled' || current.j.stage === 'done')
                throw new CommerceError(409, 'Payout was cancelled.'); if (current.j.providerId)
                throw new CommerceError(409, 'Provider payout is already bound.'); const now = new Date(); await tx.update(jobs).set({ submitAttempts: current.j.submitAttempts + 1, firstSubmittedAt: current.j.firstSubmittedAt ?? now, stage: 'tracking', updatedAt: now }).where(eq(jobs.id, j.id)); if (current.p.state === 'approved')
                await tx.update(payouts).set({ state: 'uncertain', initiatedBy: current.j.authorizedBy, updatedAt: now }).where(eq(payouts.id, p.id)); });
            moneyPost = true;
            const response = await call(() => provider.create(request, j.idempotencyKey));
            moneyPost = false;
            const created = payoutFact(response);
            matchesIntent(created, request);
            await observe(j, created, 'create');
            // A successful POST is not a confirmed receipt. Fetch independently.
            const fresh = payoutFact(await call(() => provider.fetch(created.id)));
            matchesIntent(fresh, request);
            await observe(j, fresh, 'reconcile');
            result.processed++;
        }
        catch (error) {
            result.failed++;
            const code = error instanceof PayoutProviderError ? error.code : error instanceof CommerceError ? 'payout_evidence_or_authorization_review' : 'payout_worker_unknown';
            await database.transaction(async (tx) => {
                const { j: current, p: bound } = await locked(tx, j);
                const rejected = moneyPost && error instanceof PayoutProviderError && [400, 401, 403].includes(error.httpStatus ?? 0) && current.submitAttempts === 1 && !current.providerId;
                if (bound.state === 'cancelled' || current.stage === 'done' && current.providerStatus !== 'processed')
                    return;
                if (rejected) {
                    const fact = { httpStatus: error.httpStatus, reason: code, attempt: 1 };
                    await tx.insert(observations).values({ jobId: j.id, providerId: 'request:' + j.idempotencyKey, source: 'create', status: 'request_rejected', fact, hash: hash(fact) }).onConflictDoNothing();
                    await tx.update(jobs).set({ providerStatus: 'request_rejected', stage: 'done', lastError: code, updatedAt: new Date() }).where(eq(jobs.id, j.id));
                    await tx.update(payouts).set({ state: 'failed', updatedAt: new Date() }).where(eq(payouts.id, bound.id));
                }
                else
                    await tx.update(jobs).set({ stage: current.stage === 'done' ? 'done' : current.submitAttempts ? 'tracking' : 'blocked', lastError: code, nextAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(current.attempts, 7))), updatedAt: new Date() }).where(eq(jobs.id, j.id));
            });
        }
        finally {
            await database.transaction(async tx => {
                await tx.select({id: users.id}).from(users).where(eq(users.id, p.creatorId)).for('update');
                await tx.update(jobs).set({leaseUntil: null, leaseToken: null}).where(and(eq(jobs.id, j.id), eq(jobs.leaseToken, j.leaseToken!)));
            });
        }
    }
    return result;
}
