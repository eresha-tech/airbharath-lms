import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { UUID } from '@/lib/creator-payments/model';
import { money, financeDate } from '@/lib/creator-payments/presentation';
import { FinanceHeading, PayeeStatus, panel, secondary, Notice } from '@/components/workspace/finance/Shared';
import { AdminAction } from '@/components/workspace/finance/AdminAction';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const admin = await getAuthorizedAdminSession(); if (!admin)
    redirect('/login'); const { id } = await params; if (!UUID.test(id))
    notFound(); const s = financeReporting(), p = await s.payee(admin.id, id), v = await s.overview(admin.id, p.creatorId), independent = admin.id !== p.creatorId; const actions = independent ? [...(p.decision !== 'verify_payee' ? [{ value: 'verify_payee', label: 'Verify bank account' }] : []), ...(p.decision !== 'reject_payee' ? [{ value: 'reject_payee', label: 'Reject verification' }] : []), { value: 'reveal_payee', label: 'View bank details for audited verification' }] : []; return <div className="ph-no-capture mx-auto max-w-3xl space-y-6 p-4 sm:p-8"><FinanceHeading title="Payee verification" description="Verify legal name and account ownership against external bank evidence."/><Link className={secondary} href="/admin/creator-settlements?view=payees">← Payee queue</Link><section className={`${panel} space-y-5 p-6`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-outfit text-xl font-semibold">{p.name}</h2><PayeeStatus payee={p}/></div><p className="font-medium">{p.masked}</p><p className="text-xs text-muted-foreground">Added {financeDate(p.createdAt)} · Monthly settlement policy accepted</p><AdminAction creatorId={p.creatorId} entityId={id} masked={p.masked} actions={actions}/></section>{independent && p.decision === 'verify_payee' && v.summary.available > 0 && process.env.CREATOR_BANK_SETTLEMENT_ENABLED === 'true' ? <section className={`${panel} space-y-5 p-6`}><h2 className="font-outfit text-xl font-semibold">Approve monthly bank payout</h2><p className="text-sm leading-7 text-muted-foreground">Available for approval: <strong>{money(v.summary.available)}</strong>. Approval reserves this amount for the displayed beneficiary. A second Admin must record the external bank initiation.</p><AdminAction creatorId={p.creatorId} entityId={id} masked={p.masked} approval actions={[{ value: 'approve_payout', label: 'Approve payout' }]}/></section> : <Notice title="Payout approval unavailable">A verified payee, fresh reconciliation and available previous-month proceeds are required. The bank-settlement launch flag must also be enabled.</Notice>}<Link className="text-sm text-primary underline" href={`/admin/creator-settlements/creators/${p.creatorId}`}>Review Creator balances and transactions</Link></div>; }
