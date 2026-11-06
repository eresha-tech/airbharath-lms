import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { UUID } from '@/lib/creator-payments/model';
import { FinanceHeading, FinanceTabs, PayoutDetail } from '@/components/workspace/finance/Shared';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { user } = await requireCreatorWorkspace(), { id } = await params; if (!UUID.test(id))
    notFound(); const p = await financeReporting().creatorPayout(user.id, id); return <div className="ph-no-capture mx-auto max-w-4xl space-y-6"><FinanceHeading title="Payout details" description={p.provider?"The destination and provider-reconciled progress of this automated bank payout.":"The destination and retained bank evidence of this historical payout."}/><FinanceTabs active="payouts"/><Link className="inline-flex min-h-11 items-center text-sm text-primary underline" href="/workspace/earnings/payouts">← Back to payouts</Link><PayoutDetail p={p}/></div>; }
