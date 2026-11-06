import { getSession } from '@/lib/auth';
import { commerceFailure } from '@/lib/commerce/http';
import { CommerceError } from '@/lib/commerce/model';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { financeFilters, csv, financeDate } from '@/lib/creator-payments/presentation';
export async function GET(request: Request) {
    try {
        const actor = await getSession();
        if (!actor)
            throw new CommerceError(401, 'Unauthorized');
        const f = financeFilters(Object.fromEntries(new URL(request.url).searchParams));
        const { rows } = await financeReporting().transactions(actor.id, actor.id, f, true);
        const amount = (n: number | null) => n === null ? 'Unknown' : (Number(n) / 100).toFixed(2);
        return new Response(csv([['Purchase date (IST)', 'Course', 'Order reference', 'Gross INR', 'Course tax net of refund allocation INR', 'Processing fee incl fee tax INR', 'Fee tax included INR', 'Refund/dispute/correction gross INR', 'Recorded creator net INR', 'Reconciliation'], ...rows.map(p => [financeDate(p.createdAt), p.title, p.reference, amount(p.gross), amount(p.tax), amount(p.fee), amount(p.feeTax), amount(p.adjustments), amount(p.net), p.status])]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="airbharath-transactions.csv"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    catch (e) {
        return commerceFailure(e);
    }
}
