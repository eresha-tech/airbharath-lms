import {runBankValidationWorker} from './bank-validation/worker';
import {after} from 'next/server';
import {payoutControl} from './razorpayx/service';
import {runPayoutWorker} from './razorpayx/worker';
import { financeReporting } from './reporting';
import { financeFilters, csv, financeDate, appendCommercialStatement } from './presentation';
import { getSession } from '@/lib/auth';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson, readJson } from '@/lib/workspace/http';
import { commerceFailure, commerceOrigin } from '@/lib/commerce/http';
import { CommerceError } from '@/lib/commerce/model';
import { settlementService, type FinanceCommand } from './settlement';
export async function financeHttp(request: Request, admin = false) {
    try {
        commerceOrigin(request);
        const actor = admin ? await getAuthorizedAdminSession() : await getSession();
        if (!actor)
            throw new CommerceError(401, 'Unauthorized');
        const service = settlementService();
        if (request.method === 'GET' && admin && new URL(request.url).searchParams.get('format') === 'csv') {
            const q = Object.fromEntries(new URL(request.url).searchParams);
            const { rows } = await financeReporting().transactions(actor.id, q.creatorId ?? '', financeFilters(q), true);
            const value = (n: number | null) => n === null ? 'Unknown' : (Number(n) / 100).toFixed(2);
            return new Response(csv(appendCommercialStatement(rows,[['Date IST', 'Course', 'Order', 'Gross INR', 'Course tax INR', 'Processing fee incl tax INR', 'Adjustment INR', 'Recorded net INR', 'Reconciliation'], ...rows.map(p => [financeDate(p.createdAt), p.title, p.reference, value(p.gross), value(p.tax), value(p.fee), value(p.adjustments), value(p.net), p.status])])), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="creator-transactions.csv"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
        }
        if (request.method === 'GET' && !admin) {
            const v = await financeReporting().overview(actor.id);
            return privateJson({ summary: v.summary, payee: v.payee ? { masked: v.payee.masked, decision: v.payee.decision, createdAt: v.payee.createdAt } : null });
        }
        if (request.method === 'GET')
            return privateJson(await service.read(actor.id, admin ? new URL(request.url).searchParams.get('creatorId') ?? '' : actor.id));
        let body;
        try {
            body = await readJson(request, 4096);
        }
        catch {
            throw new CommerceError(400, 'Invalid financial request.');
        }
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new CommerceError(400, 'Invalid financial request.');
        const input = body as FinanceCommand;
        if (!admin) {
            if (input.action !== 'save_payee')
                throw new CommerceError(403, 'Forbidden');
            const authenticatedAt = 'authenticatedAt' in actor ? actor.authenticatedAt : undefined;
            if (typeof authenticatedAt !== 'number' || authenticatedAt > Math.floor(Date.now() / 1000) || Date.now() / 1000 - authenticatedAt > 600)
                throw new CommerceError(403, 'Please verify your phone again through login, then return to Payout account within 10 minutes.');
            input.creatorId = actor.id;
        }
        if(admin&&['authorize_razorpayx','reconcile_razorpayx','trace_razorpayx'].includes(input.action)){
          const result=await payoutControl(actor.id,input);
          try{after(async()=>{try{await runPayoutWorker();}catch{/* Durable job is recovered by the authenticated scheduler. */}});}catch{/* Framework after-response scheduling is best-effort. */}
          return privateJson(result);
        }
        const result=await service.execute(actor.id,input);
        if(admin&&['request_bank_validation','reconcile_bank_validation'].includes(input.action))try{after(async()=>{try{await runBankValidationWorker();}catch{/* Durable intent remains available to the authenticated worker. */}});}catch{/* Recovered by polling. */}
        return privateJson(result);
    }
    catch (error) {
        return commerceFailure(error);
    }
}
