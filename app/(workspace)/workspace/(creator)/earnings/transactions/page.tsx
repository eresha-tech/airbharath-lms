import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { financeReporting } from '@/lib/creator-payments/reporting';
import { financeFilters } from '@/lib/creator-payments/presentation';
import { FinanceHeading, FinanceTabs, FilterForm, PurchaseList, Pagination } from '@/components/workspace/finance/Shared';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) { const { user } = await requireCreatorWorkspace(), f = financeFilters(await searchParams), v = await financeReporting().transactions(user.id, user.id, f); return <div className="ph-no-capture mx-auto max-w-6xl space-y-6"><FinanceHeading title="Transactions" description="Each purchase, its actual fees and every adjustment. All dates use India Standard Time."/><FinanceTabs active="transactions"/><FilterForm f={f}/><PurchaseList rows={v.rows}/><Pagination f={f} total={v.total}/></div>; }
