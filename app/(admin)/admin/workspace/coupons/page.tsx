import {classifyWorkspaceRuntime} from '@/lib/workspace/payments/classification';
import {listParams,type ListParams} from '@/lib/workspace/admin/pagination';
import type {AdminSearch} from '@/components/admin/WorkspaceList';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { listInfluencers } from '@/lib/workspace/membership/influencers';
import { listWorkspaceCoupons } from '@/lib/workspace/membership/service';
import { WorkspaceCoupons } from '@/components/workspace/WorkspaceCoupons';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace coupon campaigns — AirBharath', robots: { index: false, follow: false } };
export default async function CouponsPage({searchParams=Promise.resolve({})}:{searchParams?:AdminSearch}) {
  const actor = await getAuthorizedAdminSession();
  if (!actor) redirect('/login');
  let filters:ListParams;try{filters=listParams(await searchParams);filters.q=filters.q.toUpperCase();if(filters.q&&!/^[A-Z0-9_-]{1,32}$/.test(filters.q))throw Error();}catch{return <p role="alert">Invalid coupon filters. <Link href="?">Reset filters</Link></p>;}
  return <div className="ph-no-capture space-y-7"><header><p className="text-xs font-bold uppercase tracking-widest text-primary">Workspace membership</p><h1 className="mt-3 font-outfit text-3xl font-semibold">Coupon campaigns</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">Define a targeted offer. Previews do not reserve capacity. Economic terms and attribution stay fixed; pause or archive an old offer and create a new code to change them.</p><Link href="/admin/workspace/settings" className="mt-3 inline-block text-sm underline underline-offset-4">View plan definitions</Link></header><CouponContent actorId={actor.id} filters={filters} /></div>;
}
async function CouponContent({ actorId,filters }: { actorId: string;filters:ListParams }) {
  try {
    const [initial, influencers] = await Promise.all([listWorkspaceCoupons(filters.q,filters.status,filters.page,filters.size,filters.sort,actorId), listInfluencers(actorId)]);
    return <WorkspaceCoupons noncommercialEnvironment={classifyWorkspaceRuntime()!=='production'} key={JSON.stringify(filters)} filters={filters} initialInfluencers={influencers} initial={{ ...initial, coupons: initial.coupons.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), startsAt: row.startsAt?.toISOString() || null, expiresAt: row.expiresAt?.toISOString() || null })) }} />;
  } catch { return <div role="status" className="rounded-xl border border-border p-6">Coupons are temporarily unavailable. Verify migration readiness and reload.</div>; }
}
