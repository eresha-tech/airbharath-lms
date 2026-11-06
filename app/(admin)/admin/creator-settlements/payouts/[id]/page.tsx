import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { financeReporting } from '@/lib/creator-payments/reporting';
import {payoutReadiness} from '@/lib/creator-payments/razorpayx/config';
import { UUID } from '@/lib/creator-payments/model';
import { FinanceHeading, PayoutDetail, panel, secondary } from '@/components/workspace/finance/Shared';
import { AdminAction } from '@/components/workspace/finance/AdminAction';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const admin = await getAuthorizedAdminSession(); if (!admin)
    redirect('/login'); const { id } = await params; if (!UUID.test(id))
    notFound(); const p = await financeReporting().payout(admin.id, id), independent = admin.id !== p.creatorId, enabled = process.env.CREATOR_BANK_SETTLEMENT_ENABLED === 'true'; const manualActions = independent ? p.state === 'approved' ? [...(admin.id !== p.approvedBy ? [...(enabled && p.payeeDecision === 'verify_payee' ? [{ value: 'initiate_payout', label: 'Record bank transfer' }] : []), { value: 'uncertain_payout', label: 'Mark transfer uncertain' }] : []), { value: 'cancel_payout', label: 'Reject payout before initiation' }] : ['initiated', 'uncertain'].includes(p.state) ? [...(admin.id !== p.initiatedBy ? [{ value: 'confirm_payout', label: 'Confirm bank receipt' }, { value: 'fail_payout', label: 'Confirm verified failure' }] : []), ...(p.state === 'initiated' ? [{ value: 'uncertain_payout', label: 'Mark transfer uncertain' }] : [])] : [] : []; const actions=p.provider?independent?[...(p.state==='approved'&&!p.authorizedBy&&admin.id!==p.approvedBy&&p.payeeDecision==='verify_payee'&&payoutReadiness().executionEnabled?[{value:'authorize_razorpayx',label:'Authorize automated payout'}]:[]),...(p.state==='approved'&&!p.submitAttempts?[{value:'cancel_payout',label:'Cancel before submission'}]:[]),...(p.authorizedBy?[{value:'reconcile_razorpayx',label:'Reconcile provider status'}]:[]),...(p.submitAttempts&&!p.providerId&&admin.id!==p.authorizedBy?[{value:'trace_razorpayx',label:'Trace missing provider payout'}]:[])]:[]:manualActions; return <div className="ph-no-capture mx-auto max-w-4xl space-y-6 p-4 sm:p-8"><FinanceHeading title="Bank payout review" description={`${p.name} · ${p.provider?'RazorpayX automated payout. Provider reconciliation determines bank status.':'Historical manual transfer; retain its independent bank evidence.'}`}/><Link className={secondary} href="/admin/creator-settlements?view=transfers">← Bank transfers</Link><PayoutDetail p={p} admin/><section className={`${panel} space-y-5 p-6`}><h2 className="font-outfit text-xl font-semibold">Next authorized action</h2><AdminAction creatorId={p.creatorId} entityId={id} masked={p.masked} amount={Number(p.amount)} automated={!!p.provider} actions={actions}/></section></div>; }
