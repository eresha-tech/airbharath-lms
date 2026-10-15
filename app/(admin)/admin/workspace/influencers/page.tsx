import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {listInfluencers} from '@/lib/workspace/membership/influencers';
import {listParams} from '@/lib/workspace/admin/pagination';
import type {AdminSearch} from '@/components/admin/WorkspaceList';
import {InfluencerDirectory} from '@/components/admin/InfluencerDirectory';
export default async function Page({searchParams}:{searchParams:AdminSearch}){const a=await getAuthorizedAdminSession();if(!a)redirect('/login');try{const p=listParams(await searchParams);if(!['all','active','inactive'].includes(p.status))throw Error();const rows=await listInfluencers(a.id,p.q,p.page,p.size,p.status,p.sort);return <div className="space-y-6"><h1 className="font-outfit text-3xl font-semibold">Influencers</h1><InfluencerDirectory key={JSON.stringify(p)} initial={rows.slice(0,p.size)} filters={p} hasNext={rows.length>p.size}/></div>;}catch{return <div className="space-y-4"><h1 className="text-3xl">Influencers unavailable</h1><p role="alert">Check the filters or try again.</p><Link href="?" className="text-primary underline">Reset and retry</Link></div>;}}
