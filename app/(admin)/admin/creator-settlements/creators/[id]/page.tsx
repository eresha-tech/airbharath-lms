import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { financeFilters } from '@/lib/creator-payments/presentation';
import { UUID } from '@/lib/creator-payments/model';
import { FinanceHeading, BalanceCards, PurchaseList, Pagination, secondary, panel, Notice, filterQuery, FilterForm } from '@/components/workspace/finance/Shared';
import { AdminAction } from '@/components/workspace/finance/AdminAction';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) { const admin = await getAuthorizedAdminSession(); if (!admin)
    redirect('/login'); const { id } = await params; if (!UUID.test(id))
    notFound(); const q = await searchParams, f = financeFilters(q), service = financeReporting(), v = await service.overview(admin.id, id), t = await service.transactions(admin.id, id, f), order = typeof q.order === 'string' && UUID.test(q.order) ? q.order : null; return <div className="ph-no-capture mx-auto max-w-6xl space-y-6 p-4 sm:p-8"><FinanceHeading title="Creator finance review" description={`${v.creatorName} · Review complete balances, verified payee and purchase-level evidence before approving settlement.`}/><Link href="/admin/creator-settlements?view=approvals" className={secondary}>← Payout approvals</Link><BalanceCards s={v.summary} admin/>{v.payee ? <section className={`${panel} flex flex-wrap items-center justify-between gap-4 p-6`}><div><h2 className="font-semibold">{v.payee.name}</h2><p className="mt-2 text-sm">{v.payee.masked}</p></div><Link className={secondary} href={`/admin/creator-settlements/payees/${v.payee.id}`}>Review payee & approve payout</Link></section> : <Notice title="Payout account required">The Creator must add a receiving account and accept the settlement policy before approval.</Notice>}{order && <section className={`${panel} space-y-5 p-6`}><h2 className="font-outfit text-xl font-semibold">Propose a statement correction</h2><p className="text-sm leading-7 text-muted-foreground">Use an exact signed amount supported by bank/provider evidence. Another Admin must independently review this proposal; original ledger history is retained.</p><AdminAction creatorId={id} entityId={order} adjustment actions={[{ value: 'propose_adjustment', label: 'Propose correction' }]}/></section>}<h2 className="font-outfit text-xl font-semibold">Purchase evidence</h2><FilterForm f={f} admin/><a className={secondary} href={`/api/admin/creator-settlements?format=csv&creatorId=${id}&${filterQuery(f)}`}>Export filtered Creator statement</a><PurchaseList rows={t.rows} admin/><Pagination f={f} total={t.total}/><Link className="text-sm text-primary underline" href="/admin/creator-settlements?view=exceptions">Open exceptions & correction queue</Link></div>; }
