import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, WalletCards } from 'lucide-react';
import { PageHeading } from '@/components/workspace/creator/Content';
import { inputClass } from '@/components/workspace/creator/Fields';
import { money, financeDate, payoutLabels, payoutLabel, payoutExplanation, creatorPayoutPresentation, creatorPayoutFilters, payeeGuidance, settlementMonth, type FinanceFilters } from '@/lib/creator-payments/presentation';
import type { Summary, Purchase, Payout, Payee } from '@/lib/creator-payments/reporting';
export const panel = 'rounded-2xl border border-border bg-card';
export const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
export function FinanceHeading({ title = 'Earnings & payouts', description = 'Your course earnings, clearly accounted for. AirBharath takes 0% commission.', children }: {
    title?: string;
    description?: string;
    children?: React.ReactNode;
}) { return <PageHeading eyebrow="Creator finances" title={title} description={description}>{children}</PageHeading>; }
export function FinanceTabs({ active, admin = false }: {
    active: string;
    admin?: boolean;
}) {
    const tabs = admin ? [['overview', 'Overview'], ['approvals', 'Payout approvals'], ['transfers', 'Bank transfers'], ['payees', 'Payee verification'], ['exceptions', 'Exceptions & reconciliation'], ['history', 'Completed & audit']] : [['overview', 'Overview'], ['transactions', 'Transactions'], ['payouts', 'Payouts']];
    return <nav aria-label={admin ? 'Settlement views' : 'Finance views'} className="flex gap-2 overflow-x-auto border-b pb-2">{tabs.map(([key, label]) => <Link key={key} aria-current={key === active ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring ${active === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} href={admin ? `/admin/creator-settlements?view=${key}` : key === 'overview' ? '/workspace/earnings' : `/workspace/earnings/${key}`}>{label}</Link>)}</nav>;
}
export function Badge({ children, tone = 'neutral' }: {
    children: React.ReactNode;
    tone?: 'neutral' | 'good' | 'review';
}) { return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone === 'good' ? 'border-emerald-700/20 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : tone === 'review' ? 'border-amber-700/20 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : 'border-border bg-muted text-foreground'}`}>{children}</span>; }
export function Notice({ title, children }: {
    title: string;
    children: React.ReactNode;
}) { return <aside className="rounded-xl border border-primary/20 bg-primary/5 p-5"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div></aside>; }
export function Empty({ title, children }: {
    title: string;
    children: React.ReactNode;
}) { return <div className="rounded-2xl border border-dashed p-10 text-center"><WalletCards className="mx-auto size-7 text-primary" aria-hidden/><h2 className="mt-4 font-outfit text-xl font-semibold">{title}</h2><div className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">{children}</div></div>; }
export function BalanceCards({ s, admin = false }: { s: Summary; admin?: boolean }) {
    const cards = admin ? [
        ['Available for payout', s.available, 'Reconciled, previous-month proceeds'],
        ['Pending / under review', s.pending, 'Recorded balance awaiting cycle or checks'],
        ['In progress / reserved', s.reserved, 'Approved or unconfirmed bank transfers'],
        ['Total confirmed paid', s.paid, 'Confirmed payouts, excluding returned transfers'],
    ] : [
        ['Available for payment', s.available, 'Previous-month earnings ready for monthly payment review'],
        ['Pending earnings', s.pending, s.blocked || !s.fresh ? 'Payment checks must finish before these earnings become available' : 'Recent earnings waiting for the next monthly review'],
        ['Payments in progress', s.reserved, 'Amounts set aside after approval, including transfers still being checked. Not paid yet.'],
        ['Paid to date', s.paid, 'Completed payments; returned payments are no longer included'],
    ];
    return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, hint], i) => <div key={String(label)} className={`${panel} p-5 ${i === 0 ? 'border-primary/25 bg-primary/5' : ''}`}><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-3 font-outfit text-2xl font-semibold tabular-nums tracking-tight">{money(Number(value))}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{hint}</p></div>)}</div><p className="text-xs leading-6 text-muted-foreground">{admin ? 'Lifetime recorded net' : 'Earnings after recorded deductions'}: <strong className="font-medium text-foreground">{money(s.net)}</strong>. {admin ? 'Reserved and paid amounts are separate, with no double-counting.' : 'Available, pending and in-progress amounts exclude payments already counted as paid. Amounts still being checked can change after fees, refunds or disputes.'}{s.net - s.reserved - s.paid < 0 && <> {admin ? 'Balance shortfall' : 'Adjustments exceed your unpaid earnings by'}: {money(Math.abs(s.net - s.reserved - s.paid))}. {admin ? '' : 'Future earnings may offset this amount.'}</>}</p></>;
}
export function PayeeStatus({ payee }: {
    payee?: Payee;
}) { return <Badge tone={payee?.decision === 'verify_payee' ? 'good' : 'review'}>{!payee ? 'Setup required' : payee.decision === 'verify_payee' ? 'Verified' : payee.verificationState === 'invalid' || payee.decision === 'reject_payee' ? 'Needs correction' : payee.verificationState === 'review' ? 'Review needed' : 'Pending verification'}</Badge>; }
export function AccountPreview({ payee }: { payee?: Payee }) {
    return <section className={`${panel} p-6`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-outfit text-lg font-semibold">Payout account</h2><PayeeStatus payee={payee}/></div><p className="mt-4 text-sm">{payee?.masked ?? 'Add your receiving bank account'}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{payeeGuidance(payee)}</p><Link className={`${secondary} mt-5`} href="/workspace/settings/payout-account">{payee ? 'Manage payout account' : 'Set up payout account'}<ArrowUpRight className="size-4" aria-hidden/></Link></section>;
}
export function PurchaseList({rows,compact=false,admin=false}:{rows:Purchase[];compact?:boolean;admin?:boolean}) {
 if(!rows.length)return <Empty title="No transactions to show">{compact ? 'Your earnings will appear after your first paid course purchase. You can set up your payout account now; it is separate from publishing a course.' : 'Course purchases will appear here after payment. Try clearing your filters if you expected results.'}</Empty>;
 const columns='xl:grid-cols-[minmax(12rem,2fr)_repeat(5,minmax(4.5rem,1fr))_7.5rem]';
 return <div className={`${panel} overflow-hidden divide-y`}>
  {!compact&&<div aria-hidden className={`hidden gap-3 bg-muted/40 px-5 py-4 text-xs font-semibold text-muted-foreground xl:grid ${columns}`}><span>Purchase · India Standard Time</span><span>Gross</span><span>Course tax¹</span><span>Gateway fee²</span><span>Adjustments</span><span>{admin?'Recorded net':'Your earnings'}</span><span>{admin?'Reconciliation':'Payment checks'}</span></div>}
  {rows.map(p=><article key={p.id} className="min-w-0 px-5 py-4 sm:px-6">
   <div className={compact?'flex flex-col justify-between gap-3 sm:flex-row':`grid items-start gap-3 ${columns}`}>
    <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{p.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{financeDate(p.createdAt)}</p>{admin&&<p className="mt-1 break-all text-[11px] leading-5 text-muted-foreground">{p.reference}</p>}</div>
    {compact?<div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><strong className="font-outfit text-lg tabular-nums">{p.fee===null?'Earnings being checked':money(p.net)}</strong><Badge tone={p.status==='reconciled'?'good':'review'}>{p.status==='reconciled'?(admin?'Reconciled':'Checked'):(admin?'Under review':'Being checked')}</Badge></div>:<>
     <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-5 xl:contents">{[['Gross collected',money(p.gross)],['Course tax¹',money(p.tax)],['Processing fee²',p.fee===null?'Fee being checked':money(p.fee)],['Refund / dispute / correction',money(p.adjustments)],[admin?'Recorded net':'Your earnings',p.fee===null&&!admin?'Being checked':money(p.net)]].map(([k,v])=><div key={k} className="min-w-0"><dt className="text-xs leading-5 text-muted-foreground xl:sr-only">{k}</dt><dd className="mt-1 break-words font-medium tabular-nums xl:mt-0">{v}</dd></div>)}</dl>
     <div className="flex flex-wrap items-center gap-2 xl:block"><Badge tone={p.status==='reconciled'?'good':'review'}>{p.status==='reconciled'?(admin?'Reconciled':'Checked'):(admin?'Under review':'Being checked')}</Badge>{p.fee===null&&<p className="mt-2 text-xs text-muted-foreground">Earnings being checked</p>}</div>
    </>}
   </div>
   {!compact&&<details className="mt-2 text-sm"><summary className="inline-flex min-h-11 cursor-pointer items-center py-2 text-xs font-medium text-primary focus-visible:ring-2 focus-visible:ring-ring">{admin?'View original ledger records':'See earnings breakdown'} ({p.records.length})</summary>
    {p.status==='review'&&<p className="my-3 text-xs leading-6 text-muted-foreground">{p.fee===null?'We’re checking the actual processing fee. Your earnings amount can change until this is confirmed.':'We’re checking this payment or a related refund or dispute. No action is needed unless support asks for more information.'}</p>}
    <p className="my-3 break-all text-xs text-muted-foreground">Payment reference: {p.reference}</p><ol className="mt-2 space-y-3">{p.records.map((r,i)=><li key={i} className="rounded-lg border px-4 py-3 text-xs leading-6"><span className="font-semibold capitalize">{r.kind.replaceAll('_',' ')}</span> · {financeDate(r.createdAt)}<br/>Gross {money(r.gross)} · Course tax {money(r.tax)}{(admin||r.kind==='fee'||r.fee!==0)&&<> · Fee {money(r.fee)}</>} · Net {money(r.net)}</li>)}</ol>
    <p className="mt-3 text-xs leading-6 text-muted-foreground">Immutable monetary records; 0% platform commission. ¹ Tax reflects the frozen checkout quote and recorded refund allocations. ² Fee includes its tax component {p.feeTax===null?'(unknown)':`(${money(p.feeTax)})`} once. Private bank and Admin evidence is restricted.</p>
   </details>}
  </article>)}
 </div>;
}
export function FilterForm({ f, payouts = false, admin = false }: {
    f: FinanceFilters;
    payouts?: boolean;
    admin?: boolean;
}) { return <form method="get" className={`${panel} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5`}>{!payouts && <label className="text-xs font-medium">Search course or order<input name="search" defaultValue={f.search} className={inputClass} placeholder="Course or order reference" maxLength={100}/></label>}<label className="text-xs font-medium">From (IST)<input type="date" name="from" defaultValue={f.from} className={inputClass}/></label><label className="text-xs font-medium">To (IST)<input type="date" name="to" defaultValue={f.to} className={inputClass}/></label><label className="text-xs font-medium">Status<select aria-label="Status" name="status" defaultValue={f.status} className={inputClass}><option value="">All statuses</option>{(payouts ? (admin?Object.entries(payoutLabels):creatorPayoutFilters) : [['reconciled', 'Reconciled'], ['review', 'Under review']]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>{!payouts && <label className="text-xs font-medium">Activity type<select name="type" defaultValue={f.type} className={inputClass}><option value="">All activity</option>{['sale', 'refund', 'dispute', 'adjustment'].map(k => <option key={k}>{k}</option>)}</select></label>}<div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-5"><button className={secondary}>Apply filters</button><Link className="inline-flex min-h-11 items-center text-sm text-primary underline" href={payouts ? '/workspace/earnings/payouts' : admin ? '?' : '/workspace/earnings/transactions'}>Clear filters</Link>{!payouts && !admin && <a className={`${secondary} sm:ml-auto`} href={'/api/workspace/earnings/statement?' + filterQuery(f)}>Export filtered CSV</a>}</div></form>; }
export function filterQuery(f: FinanceFilters) { return new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)])).toString(); }
export function Pagination({ f, total }: {
    f: FinanceFilters;
    total: number;
}) { return <nav aria-label="History pagination" className="flex flex-wrap items-center justify-between gap-4 text-sm"><p className="text-muted-foreground">{total} results · Page {f.page} of {Math.max(1, Math.ceil(total / 15))}</p><div className="flex gap-3">{f.page > 1 && <Link className={secondary} href={'?' + filterQuery({ ...f, page: f.page - 1 })}>Previous</Link>}{f.page * 15 < total && <Link className={secondary} href={'?' + filterQuery({ ...f, page: f.page + 1 })}>Next</Link>}</div></nav>; }
export function PayoutList({ rows, admin = false }: { rows: Payout[]; admin?: boolean }) {
    if (!rows.length) return <Empty title={admin ? 'Nothing in this queue' : 'No payments to show'}>{admin ? 'There are no matching payouts in this view. Check another queue or clear your search.' : 'Monthly payments appear here after approval. Your bank details and earnings must be checked first. Clear filters if you expected an earlier payment.'}</Empty>;
    return <div className={`${panel} divide-y`}>{rows.map(p => {
        const view = creatorPayoutPresentation(p);
        return <Link className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring" key={p.id} href={`${admin ? '/admin/creator-settlements' : '/workspace/earnings'}/payouts/${p.id}`}><div className="min-w-0"><p className="font-semibold">{admin ? p.name : settlementMonth(p.periodEnd)}</p><p className="mt-2 break-words text-xs text-muted-foreground">{admin ? settlementMonth(p.periodEnd) + ' · ' : ''}{p.masked}</p><p className="mt-1 text-xs text-muted-foreground">Updated {financeDate(p.updatedAt)}</p></div><div className="flex flex-wrap items-center gap-4"><span className="font-semibold tabular-nums">{money(p.amount)}</span><Badge tone={admin ? p.state === 'confirmed' ? 'good' : p.state === 'uncertain' || p.state === 'failed' ? 'review' : 'neutral' : view.tone}>{admin ? payoutLabel(p) : view.label}</Badge><ArrowUpRight className="size-4" aria-hidden/></div></Link>;
    })}</div>;
}
export function PayoutDetail({ p, admin = false }: { p: Payout; admin?: boolean }) {
    const start = new Date(new Date(p.periodEnd).getTime() - 1), month = start.toISOString().slice(0, 7), last = new Date(month + '-01T00:00:00Z');
    last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
    const view = creatorPayoutPresentation(p);
    const fields = admin ? [
        ['Destination', p.masked], ['Method', p.provider ? 'RazorpayX automated bank payout' : 'Historical manual bank payout'],
        ['Amount approved', financeDate(p.createdAt)], [p.provider ? 'Submission attempt recorded' : 'Transfer initiated', financeDate(p.initiatedAt)],
        [p.provider ? 'Provider processed recorded' : 'Bank receipt confirmed', financeDate(p.confirmedAt)], ['UTR / bank reference', p.bankReference ?? 'Not yet recorded'],
    ] : [
        ['Bank account', p.masked], ['Payment approved', financeDate(p.createdAt)],
        ...(p.confirmedAt ? [[p.reversedAt ? 'Earlier paid confirmation' : 'Paid confirmation', financeDate(p.confirmedAt)]] : []),
        ...(p.reversedAt ? [['Payment returned', financeDate(p.reversedAt)]] : []),
        ...(p.bankReference ? [['Transfer reference (UTR)', p.bankReference]] : []),
    ];
    return <><section className={`${panel} p-6 sm:p-8`}><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-muted-foreground">{settlementMonth(p.periodEnd)} {admin ? 'settlement' : 'payment'}</p><h2 className="mt-3 font-outfit text-4xl font-semibold tabular-nums">{money(p.amount)}</h2></div><Badge tone={admin ? p.state === 'confirmed' ? 'good' : p.state === 'failed' || p.state === 'uncertain' ? 'review' : 'neutral' : view.tone}>{admin ? payoutLabel(p) : view.label}</Badge></div><dl className="mt-8 grid gap-6 border-t pt-6 text-sm sm:grid-cols-2">{fields.map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="mt-2 break-words font-medium">{v}</dd></div>)}</dl></section>
        <Notice title={admin ? p.provider ? payoutLabel(p) : 'Historical bank settlement' : 'What happens next'}>{admin ? p.provider ? payoutExplanation(p) : 'Retain the original independent bank evidence and recovery rules for this historical manual payout.' : <><p>{view.description}</p><p className="mt-3">{view.action}</p></>} <Link className="inline-flex min-h-11 items-center text-primary underline" href="/contact">Contact support</Link>{!admin && ['failed', 'cancelled'].includes(p.state) && <Link className={`${secondary} ml-3`} href="/workspace/settings/payout-account">Check payout account</Link>}</Notice>
        {admin && p.provider && <details className={`${panel} p-6`}><summary className="min-h-11 cursor-pointer py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring">RazorpayX details & recovery evidence</summary><p className="mt-3 text-sm leading-7 text-muted-foreground">Last independently checked: {financeDate(p.reconciledAt)}. {p.reversedAt && `Reversal recorded: ${financeDate(p.reversedAt)}.`} Payment Gateway collection and RazorpayX payout funding are separate operations.</p><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[
            ['Provider payout reference', p.providerId ?? 'Not yet returned'], ['Provider status', p.providerStatus ?? 'Not yet available'],
            ['Last provider / worker error', p.lastError ?? 'None recorded'], ['Provider reason', p.reason ?? 'None recorded'],
            ['Payout fee evidence', p.providerFees == null ? 'Not yet known' : money(p.providerFees)], ['Payout tax evidence', p.providerTax == null ? 'Not yet known' : money(p.providerTax)],
        ].map(([k,v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="mt-1 break-all font-medium">{v}</dd></div>)}</dl><p className="mt-3 text-xs leading-6 text-muted-foreground">The approved Creator amount is unchanged. RazorpayX payout costs are business funding costs; gateway fees remain in the earnings ledger. Never create a replacement while the existing transfer is uncertain.</p></details>}
        <section className={`${panel} p-6`}><h2 className="font-semibold">{admin ? 'Settlement breakdown & statement' : 'Your monthly earnings statement'}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{admin ? `Approved transfer: ${money(p.amount)}. Platform commission: 0%. This payout reserves a balance; individual purchases are not allocated to this transfer.` : 'AirBharath takes 0% sales commission. Course tax, actual payment processing fees and adjustments are shown in your earnings.'} The statement covers {settlementMonth(p.periodEnd)} sales and adjustments. It is separate from this payment and may have a different total.</p><a className={`${secondary} mt-4`} href={`${admin ? `/api/admin/creator-settlements?format=csv&creatorId=${p.creatorId}&` : '/api/workspace/earnings/statement?'}from=${month}-01&to=${last.toISOString().slice(0, 10)}`}>Download monthly earnings statement</a></section>
        <p className="flex items-center gap-2 text-xs leading-6 text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden/>Bank details stay masked. Changing your account does not redirect payments already approved.</p></>;
}
