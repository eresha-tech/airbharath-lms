import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { listWorkspaceCreators } from '@/lib/workspace/activation/repository';
import { membershipState } from '@/lib/workspace/activation/model';
import { formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
export const dynamic = 'force-dynamic';
export default async function WorkspaceCreatorsPage() {
  if (!await getAuthorizedAdminSession()) redirect('/login');
  try { const rows = await listWorkspaceCreators(); const now = new Date();
    return <main className="ph-no-capture space-y-6"><header><p className="text-xs uppercase tracking-widest text-primary">Workspace membership history</p><h1 className="mt-3 font-outfit text-3xl font-semibold">Creators and memberships</h1><p className="mt-3 text-sm text-muted-foreground">Read-only fulfillment records. Membership access also requires an enabled creator profile and a fulfilled order.</p></header>
      {!rows.length ? <p className="rounded-xl border border-border p-6">No fulfilled memberships yet.</p> : <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">Latest 100 Workspace membership records</caption><thead className="bg-muted"><tr>{['User / profile', 'Originating order / plan', 'Term', 'Derived state / fulfillment'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{rows.map(({ profile, membership, order, userName }) => <tr key={membership.id} className="border-t border-border align-top"><td className="p-4">{userName || 'Account'}<p>{profile.status}</p><p className="mt-2 break-all text-xs">{profile.userId}</p></td><td className="p-4">{order.planSnapshot.displayName}<p className="mt-2 break-all text-xs">{order.id}</p></td><td className="p-4">{formatWorkspaceDate(membership.startsAt)}<p className="mt-2">Until {formatWorkspaceDate(membership.endsAt)} (exclusive)</p></td><td className="p-4">{membershipState(membership.startsAt, membership.endsAt, now)}<p>{order.activationState}</p><p className="mt-2">Fulfilled {formatWorkspaceDate(membership.fulfilledAt)}</p></td></tr>)}</tbody></table></div>}
    </main>;
  } catch { return <main className="ph-no-capture"><h1 className="text-3xl">Creators and memberships</h1><p role="status" className="mt-4">Membership reporting is unavailable. Apply reviewed migrations only after database authorization, then reload.</p></main>; }
}
