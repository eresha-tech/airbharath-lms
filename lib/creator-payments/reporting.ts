import 'server-only';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { CommerceError } from '@/lib/commerce/model';
import { requireCourseScope } from './config';
import { dueBefore, UUID } from './model';
import type { FinanceFilters } from './presentation';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Purchase = {
    commercialArrangement?: 'standard_0'|'sponsored_20';
    commission?: number;
    sourcePaid?: number;
    sourceReserved?: number;
    sourceCorrection?: number;
    sourceProvenance?: 'purchase'|'legacy_aggregate';
    id: string;
    reference: string;
    title: string;
    createdAt: string;
    gross: number;
    tax: number;
    fee: number | null;
    feeTax: number | null;
    adjustments: number;
    net: number;
    status: string;
    kind: string;
    issue: string | null;
    records: {
        kind: string;
        gross: number;
        tax: number;
        fee: number;
        net: number;
        createdAt: string;
    }[];
};
export type Payee = {
    id: string;
    creatorId: string;
    name: string;
    masked: string;
    policyVersion: string;
    createdAt: string;
    decision: string | null;
    verificationState?: string | null;
};
export type Payout = {
    id: string;
    creatorId: string;
    name: string;
    masked: string;
    amount: number;
    state: string;
    allocations?: {sourceKey:string;orderId:string|null;amount:number;provenance:string}[];
    provider: string|null;
    providerId: string|null;
    providerStatus: string|null;
    executionStage: string|null;
    authorizedBy: string|null;
    submitAttempts: number|null;
    providerFees: number|null;
    providerTax: number|null;
    lastError: string|null;
    reason: string|null;
    reconciledAt: string|null;
    reversedAt: string|null;
    periodEnd: string;
    createdAt: string;
    updatedAt: string;
    bankReference: string | null;
    approvedBy: string;
    initiatedBy: string | null;
    payeeDecision: string | null;
    initiatedAt: string | null;
    confirmedAt: string | null;
};
export type Summary = {
    net: number;
    available: number;
    pending: number;
    reserved: number;
    paid: number;
    blocked: number;
    fresh: boolean;
    current: number;
    deferred?: number;
    potentialCorrection?: number;
};
const purchaseCTE = (scope: string) => sql `with purchases as (
 select o.id,o.creator_id,o.razorpay_order_id as reference,coalesce(o.purchase_evidence->>'courseTitle','Course purchase') as title,o.created_at as "createdAt",
 coalesce(sum(l.gross_paise) filter(where l.kind='sale'),0)::bigint as gross,coalesce(sum(l.tax_paise),0)::bigint as tax,
 case when bool_or(l.kind='fee') and c.issue is distinct from 'fee_evidence_missing' then sum(l.fee_paise)::bigint end as fee,
 case when bool_or(l.kind='fee') and c.issue is distinct from 'fee_evidence_missing' then sum(l.fee_tax_paise)::bigint end as "feeTax",
 coalesce(sum(l.gross_paise) filter(where l.kind in ('refund','dispute','adjustment')),0)::bigint as adjustments,
 coalesce(sum(l.net_paise),0)::bigint as net,
 coalesce(o.purchase_evidence->'commercial'->>'arrangement','standard_0') as "commercialArrangement",coalesce(sum(l.commission_paise),0)::bigint as commission,
 coalesce((select sum(a.amount_paise) from creator_payout_allocations a join creator_payouts p on p.id=a.payout_id where a.order_id=o.id and p.state='confirmed'),0)::bigint as "sourcePaid",
 coalesce((select sum(a.amount_paise) from creator_payout_allocations a join creator_payouts p on p.id=a.payout_id where a.order_id=o.id and p.state in ('approved','initiated','uncertain')),0)::bigint as "sourceReserved",
 greatest(0,coalesce((select sum(a.amount_paise) from creator_payout_allocations a join creator_payouts p on p.id=a.payout_id where a.order_id=o.id and p.state='confirmed'),0)-coalesce(sum(l.net_paise),0))::bigint as "sourceCorrection",
 case when min(l.created_at) filter(where l.kind='sale')<(select installed_at from creator_settlement_epoch) then 'legacy_aggregate' else 'purchase' end as "sourceProvenance",
 case when o.purchase_evidence->'commercial'->>'arrangement'='sponsored_20' or c.issue is not null or c.last_checked_at is null or c.last_checked_at<now()-interval '24 hours' or c.scope<>${scope} or not coalesce(bool_or(l.kind='fee'),false) then 'review' else 'reconciled' end as status,
 case when bool_or(l.kind='dispute') then 'dispute' when bool_or(l.kind='refund') then 'refund' when bool_or(l.kind='adjustment') then 'adjustment' else 'sale' end as kind,coalesce(c.issue,case when o.purchase_evidence->'commercial'->>'arrangement'='sponsored_20' then 'sponsored_accounting_approval_pending' end) as issue,
 coalesce(jsonb_agg(jsonb_build_object('kind',l.kind,'gross',l.gross_paise,'tax',l.tax_paise,'fee',l.fee_paise,'net',l.net_paise,'createdAt',l.created_at) order by l.created_at,l.id) filter(where l.id is not null),'[]'::jsonb) as records
 from orders o left join creator_ledger l on l.order_id=o.id and l.scope=${scope}
 left join course_payment_checks c on c.order_id=o.id
 where o.creator_id is not null and o.status in ('paid','refunded','chargeback')
 group by o.id,c.issue,c.last_checked_at,c.scope
)`;
function wherePurchase(creatorId: string, f: FinanceFilters) { return sql `creator_id=${creatorId} and (${f.from}='' or "createdAt">=nullif(${f.from},'')::date::timestamp at time zone 'Asia/Kolkata') and (${f.to}='' or "createdAt"<(nullif(${f.to},'')::date+1)::timestamp at time zone 'Asia/Kolkata') and (${f.status}='' or status=${f.status}) and (${f.type}='' or kind=${f.type}) and (${f.search}='' or position(lower(${f.search}) in lower(title||' '||coalesce(reference,'')))>0)`; }
const payeeSelect = () => sql `select p.id,p.creator_id as "creatorId",u.full_name as name,p.masked,p.policy_version as "policyVersion",p.created_at as "createdAt",(case when bv.state='valid' or bv.state='review' and exists(select 1 from creator_finance_events r where r.entity_id=bv.id and r.action='accept_bank_name') then d.action when d.action='reject_payee' then d.action else null end) as decision,bv.state as "verificationState" from creator_payees p join users u on u.id=p.creator_id left join lateral(select id,state from creator_bank_validations where payee_id=p.id order by created_at desc,id desc limit 1)bv on true left join lateral(select action from creator_finance_events e where e.creator_id=p.creator_id and e.entity_id=p.id and action in ('verify_payee','reject_payee') order by created_at desc,id desc limit 1)d on true`;
const payoutSelect = () => sql `select coalesce((select jsonb_agg(jsonb_build_object('sourceKey',a.source_key,'orderId',a.order_id,'amount',a.amount_paise,'provenance',a.evidence->>'provenance') order by a.source_key) from creator_payout_allocations a where a.payout_id=p.id),'[]'::jsonb) as allocations,p.id,p.creator_id as "creatorId",u.full_name as name,b.masked,p.amount_paise as amount,p.state,case when j.id is not null then 'razorpayx' end provider,j.provider_id as "providerId",j.provider_status as "providerStatus",j.stage as "executionStage",j.authorized_by as "authorizedBy",j.submit_attempts as "submitAttempts",j.provider_fees_paise as "providerFees",j.provider_tax_paise as "providerTax",j.last_error as "lastError",j.reason,j.last_reconciled_at as "reconciledAt",j.reversed_at as "reversedAt",p.period_end as "periodEnd",p.created_at as "createdAt",p.updated_at as "updatedAt",p.bank_reference as "bankReference",p.approved_by as "approvedBy",p.initiated_by as "initiatedBy",(select action from creator_finance_events where entity_id=b.id and creator_id=p.creator_id and action in ('verify_payee','reject_payee') order by created_at desc,id desc limit 1) as "payeeDecision",coalesce(j.first_submitted_at,(select min(created_at) from creator_finance_events where entity_id=p.id and action='initiate_payout')) as "initiatedAt",coalesce(j.processed_at,(select min(created_at) from creator_finance_events where entity_id=p.id and action='confirm_payout')) as "confirmedAt" from creator_payouts p join users u on u.id=p.creator_id join creator_payees b on b.id=p.payee_id left join creator_payout_jobs j on j.payout_id=p.id`;
export function financeReporting(database = db, scope = requireCourseScope()) {
    async function authorized<T>(actor: string, creatorId: string | null, fn: (tx: Tx) => Promise<T>) {
        if (creatorId !== null && !UUID.test(creatorId))
            throw new CommerceError(404, 'Creator not found.');
        return database.transaction(async (tx) => {
            await tx.execute(sql `set transaction isolation level repeatable read read only`);
            const users = await tx.execute(sql `select role from users where id=${actor}`);
            if (!users.length || ((creatorId === null || actor !== creatorId) && users[0].role !== 'admin'))
                throw new CommerceError(403, 'Finance access denied.');
            if (creatorId && !(await tx.execute(sql `select 1 from workspace_creator_profiles where user_id=${creatorId}`)).length)
                throw new CommerceError(403, 'Creator account required.');
            return fn(tx);
        });
    }
    async function summary(tx: Tx, id: string): Promise<Summary> {
        const [b] = await tx.execute(purchaseCTE(scope).append(sql ` select coalesce(sum(net),0) net,coalesce(sum(case when "createdAt"<${dueBefore().toISOString()}::timestamptz then net else least(net,0) end),0) mature,coalesce(sum(net) filter(where "createdAt">=${dueBefore().toISOString()}::timestamptz and net>0),0) current,count(*) filter(where status='review') blocked,count(*) filter(where status='review' and "commercialArrangement"='standard_0') zero_blocked,coalesce(sum(greatest(net,0)) filter(where "commercialArrangement"='sponsored_20'),0) deferred,coalesce(sum("sourceCorrection"),0) correction from purchases where creator_id=${id}`));
        const [p] = await tx.execute(sql `select coalesce(sum(amount_paise) filter(where state in ('approved','initiated','uncertain')),0) reserved,coalesce(sum(amount_paise) filter(where state='confirmed'),0) paid from creator_payouts where creator_id=${id} and scope=${scope}`);
        const [run] = await tx.execute(sql `select disputes_checked_at>now()-interval '24 hours' fresh from course_finance_runs where scope=${scope}`);
        const net = Number(b.net), reserved = Number(p.reserved), paid = Number(p.paid), blocked = Number(b.blocked), fresh = run?.fresh === true;
        const [sources]=await tx.execute(sql`select coalesce(sum(available),0)::bigint available from creator_zero_sources(${id}::uuid,${scope})`);
        const available = Number(b.zero_blocked)||!fresh ? 0 : Number(sources.available);
        return { net, available, deferred:Number(b.deferred),potentialCorrection:Number(b.correction), pending: Math.max(0, net - reserved - paid - available), reserved, paid, blocked, fresh, current: Number(b.current) };
    }
    async function overview(actor: string, id = actor) { return authorized(actor, id, async (tx) => ({ creatorName: String((await tx.execute(sql`select full_name from users where id=${id}`))[0]?.full_name ?? 'Creator'), summary: await summary(tx, id), payee: (await tx.execute(payeeSelect().append(sql ` where p.creator_id=${id} order by p.created_at desc,p.id desc limit 1`)))[0] as unknown as Payee | undefined, recent: await tx.execute(purchaseCTE(scope).append(sql `select * from purchases where creator_id=${id} order by "createdAt" desc,id desc limit 5`)) as unknown as Purchase[] })); }
    async function transactions(actor: string, id: string, f: FinanceFilters, exportAll = false) {
        return authorized(actor, id, async (tx) => {
            const [count] = await tx.execute(purchaseCTE(scope).append(sql `select count(*)::int total from purchases where ${wherePurchase(id, f)}`));
            if (exportAll && Number(count.total) > 10000)
                throw new CommerceError(400, 'Narrow the date range to export at most 10,000 purchases.');
            const rows = await tx.execute(purchaseCTE(scope).append(sql `select * from purchases where ${wherePurchase(id, f)} order by "createdAt" desc,id desc limit ${exportAll ? 10000 : 15} offset ${exportAll ? 0 : (f.page - 1) * 15}`));
            return { rows: rows as unknown as Purchase[], total: Number(count.total) };
        });
    }
    async function payoutHistory(actor: string, id: string, f: FinanceFilters) {
        return authorized(actor, id, async (tx) => {
            const where = sql `p.creator_id=${id} and p.scope=${scope} and (${f.status}='' or ${f.status}='pending' and p.state in ('approved','initiated','uncertain') or p.state=${f.status}) and (${f.from}='' or p.created_at>=nullif(${f.from},'')::date::timestamp at time zone 'Asia/Kolkata') and (${f.to}='' or p.created_at<(nullif(${f.to},'')::date+1)::timestamp at time zone 'Asia/Kolkata')`;
            const [count] = await tx.execute(sql `select count(*)::int total from creator_payouts p where ${where}`);
            return { rows: await tx.execute(payoutSelect().append(sql ` where ${where} order by p.created_at desc,p.id desc limit 15 offset ${(f.page - 1) * 15}`)) as unknown as Payout[], total: Number(count.total) };
        });
    }
    async function payout(actor: string, id: string) { return authorized(actor, null, async (tx) => { const [p] = await tx.execute(payoutSelect().append(sql ` where p.id=${id} and p.scope=${scope}`)); if (!p)
        throw new CommerceError(404, 'Payout not found.'); return p as unknown as Payout; }); }
    async function creatorPayout(actor: string, id: string) { return authorized(actor, actor, async (tx) => { if (!UUID.test(id))
        throw new CommerceError(404, 'Payout not found.'); const [p] = await tx.execute(payoutSelect().append(sql ` where p.id=${id} and p.creator_id=${actor} and p.scope=${scope}`)); if (!p)
        throw new CommerceError(404, 'Payout not found.'); return p as unknown as Payout; }); }
    async function payee(actor: string, id: string) { return authorized(actor, null, async (tx) => { const [p] = await tx.execute(payeeSelect().append(sql ` where p.id=${id}`)); if (!p)
        throw new CommerceError(404, 'Payee not found.'); return p as unknown as Payee; }); }
    async function admin(actor: string, queue: string, f: FinanceFilters) {
        return authorized(actor, null, async (tx) => {
            const [counts] = await tx.execute(sql `select (select count(*)::int from creator_payouts where scope=${scope} and state='approved') approvals,(select count(*)::int from creator_payouts where scope=${scope} and state in ('initiated','uncertain')) transfers,(select count(*)::int from course_payment_checks where scope=${scope} and (issue is not null or last_checked_at is null or last_checked_at<now()-interval '24 hours'))+(select count(*)::int from creator_payout_jobs j join creator_payouts p on p.id=j.payout_id where p.scope=${scope} and p.state in ('approved','initiated','uncertain') and (j.last_error is not null or j.reason='low_balance' or j.provider_status='pending' or j.first_submitted_at<now()-interval '24 hours' and p.state in ('initiated','uncertain'))) exceptions`);
            const offset = (f.page - 1) * 15;
            const creators = queue === 'approvals' ? await tx.execute(sql `select u.id,u.full_name name from users u join workspace_creator_profiles c on c.user_id=u.id where (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by u.full_name,u.id limit 16 offset ${offset}`) : [];
            const candidates = [];
            for (const c of creators.slice(0, 15)) {
                candidates.push({ id: String(c.id), name: String(c.name ?? 'Creator'), ...await summary(tx, String(c.id)) });
            }
            const state = queue === 'transfers' ? sql `p.state in ('approved','initiated','uncertain')` : sql `p.state in ('confirmed','failed','cancelled')`;
            const transfers = queue === 'transfers' || queue === 'history' ? await tx.execute(payoutSelect().append(sql ` where p.scope=${scope} and ${state} and (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by p.updated_at desc,p.id desc limit 16 offset ${offset}`)) : [];
            const banks = queue === 'payees' ? await tx.execute(payeeSelect().append(sql ` where p.id=(select id from creator_payees x where x.creator_id=p.creator_id order by created_at desc,id desc limit 1) and (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by (d.action is null) desc,p.created_at desc,p.id desc limit 16 offset ${offset}`)) : [];
            const issues = queue === 'exceptions' ? await tx.execute(sql `select o.id,o.creator_id as "creatorId",u.full_name name,o.razorpay_order_id reference,round(o.amount*100)::int amount,c.issue,c.last_checked_at as "updatedAt" from course_payment_checks c join orders o on o.id=c.order_id join users u on u.id=o.creator_id where c.scope=${scope} and (c.issue is not null or c.last_checked_at is null or c.last_checked_at<now()-interval '24 hours') and (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by c.last_checked_at nulls first,o.id limit 16 offset ${offset}`) : [];
            // Completion is resolved against the complete ledger, never the current transaction page.
            const proposals = queue === 'exceptions' ? await tx.execute(sql `select e.id,e.creator_id as "creatorId",u.full_name name,e.actor_id as "actorId",e.evidence::jsonb as correction,e.created_at as "createdAt",exists(select 1 from creator_ledger l where l.scope=${scope} and l.evidence->>'proposalId'=e.id::text) completed from creator_finance_events e join users u on u.id=e.creator_id join course_payment_checks c on c.order_id=e.entity_id and c.scope=${scope} where e.action='propose_adjustment' and (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by e.created_at desc,e.id desc limit 16 offset ${offset}`) : [];
            const audit = queue === 'history' ? await tx.execute(sql `select e.id,e.entity_id as "entityId",e.creator_id as "creatorId",e.action,e.created_at as "createdAt",u.full_name name,a.full_name as "actorName",case when e.action in ('propose_adjustment','approve_adjustment') then e.evidence::jsonb->>'bankEvidence' else e.evidence end as evidence from creator_finance_events e join users u on u.id=e.creator_id join users a on a.id=e.actor_id where (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by e.created_at desc,e.id desc limit 16 offset ${offset}`) : [];
            const payoutExceptions=queue==='exceptions'?await tx.execute(payoutSelect().append(sql` where p.scope=${scope} and p.state in ('approved','initiated','uncertain') and (j.last_error is not null or j.reason='low_balance' or j.provider_status='pending' or j.first_submitted_at<now()-interval '24 hours' and p.state in ('initiated','uncertain')) and (${f.search}='' or position(lower(${f.search}) in lower(coalesce(u.full_name,'')))>0) order by j.updated_at,p.id limit 16 offset ${offset}`)) as unknown as Payout[]:[];
            return {payoutExceptions, counts, candidates, moreCreators: creators.length > 15, transfers: transfers as unknown as Payout[], banks: banks as unknown as Payee[], issues, proposals, audit };
        });
    }
    async function proposal(actor: string, id: string) {
        return authorized(actor, null, async (tx) => {
            if (!UUID.test(id))
                throw new CommerceError(404, 'Correction not found.');
            const [p] = await tx.execute(sql `select e.id,e.creator_id as "creatorId",e.actor_id as "actorId",e.entity_id as "orderId",e.evidence::jsonb as correction,e.created_at as "createdAt",u.full_name name,o.razorpay_order_id reference from creator_finance_events e join users u on u.id=e.creator_id join orders o on o.id=e.entity_id join course_payment_checks c on c.order_id=o.id and c.scope=${scope} where e.id=${id} and e.action='propose_adjustment'`);
            if (!p)
                throw new CommerceError(404, 'Correction not found.');
            const records = await tx.execute(sql `select id,evidence from creator_ledger where order_id=${p.orderId}`);
            const correction = p.correction as {
                bankEvidence: string;
                netPaise: number;
                refundPaise: number;
                disputePaise: number;
                reviewFingerprint: string;
            };
            const completed = records.some(r => (r.evidence as Record<string, unknown>).proposalId === id);
            const stale = createHash('sha256').update(JSON.stringify(records.map(r => String(r.id)).sort())).digest('hex') !== correction.reviewFingerprint;
            return { id, creatorId: String(p.creatorId), actorId: String(p.actorId), name: String(p.name), reference: String(p.reference), createdAt: p.createdAt as string, correction, completed, stale };
        });
    }
    return { overview, transactions, payoutHistory, payout, creatorPayout, payee, admin, proposal };
}
