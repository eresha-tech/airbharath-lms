import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { financeFilters } from '@/lib/creator-payments/presentation';
import { FinanceHeading, FinanceTabs, FilterForm, PayoutList, Pagination } from '@/components/workspace/finance/Shared';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) { const { user } = await requireCreatorWorkspace(), f = financeFilters(await searchParams), v = await financeReporting().payoutHistory(user.id, user.id, f); return <div className="ph-no-capture mx-auto max-w-6xl space-y-6"><FinanceHeading title="Payouts" description="Follow monthly bank payouts from approval to independently confirmed receipt."/><FinanceTabs active="payouts"/><FilterForm f={f} payouts/><PayoutList rows={v.rows}/><Pagination f={f} total={v.total}/></div>; }
