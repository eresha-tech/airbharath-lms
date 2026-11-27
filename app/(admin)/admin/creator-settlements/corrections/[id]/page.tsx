import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { UUID } from '@/lib/creator-payments/model';
import { money, financeDate } from '@/lib/creator-payments/presentation';
import { FinanceHeading, Badge, panel, secondary, Notice } from '@/components/workspace/finance/Shared';
import { AdminAction } from '@/components/workspace/finance/AdminAction';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const admin = await getAuthorizedAdminSession(); if (!admin)
    redirect('/login'); const { id } = await params; if (!UUID.test(id))
    notFound(); const p = await financeReporting().proposal(admin.id, id), actionable = !p.completed && !p.stale && p.actorId !== admin.id && p.creatorId !== admin.id; return <div className="ph-no-capture mx-auto max-w-3xl space-y-6 p-4 sm:p-8"><FinanceHeading title="Statement correction" description="An exact evidence-backed adjustment, reviewed by two independent Admins."/><Link className={secondary} href="/admin/creator-settlements?view=exceptions">← Exceptions & corrections</Link><section className={`${panel} space-y-6 p-6`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-outfit text-xl font-semibold">{p.name}</h2><Badge tone={p.completed ? 'good' : 'review'}>{p.completed ? 'Correction recorded' : p.stale ? 'Evidence changed — propose again' : 'Independent review required'}</Badge></div><dl className="grid gap-5 text-sm sm:grid-cols-2">{[['Order', p.reference], ['Proposed', financeDate(p.createdAt)], ['Signed net correction', money(p.correction.netPaise)], ['Refund evidence', money(p.correction.refundPaise)], ['Dispute evidence', money(p.correction.disputePaise)], ['Statement / case reference', p.correction.bankEvidence]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words font-medium">{value}</dd></div>)}</dl>{actionable ? <AdminAction creatorId={p.creatorId} entityId={id} amount={p.correction.netPaise} actions={[{ value: 'approve_adjustment', label: 'Approve correction' }]}/> : <Notice title={p.completed ? 'This proposal is complete' : p.stale ? 'A new review is required' : 'Independent Admin required'}>{p.completed ? 'The complete ledger confirms this correction was already appended. It cannot be approved again.' : p.stale ? 'Payment evidence changed after this proposal. Review the new evidence and create a new proposal.' : 'The proposing Admin cannot approve their own correction.'}</Notice>}</section></div>; }
