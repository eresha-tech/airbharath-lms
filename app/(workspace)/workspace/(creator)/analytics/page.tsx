import Link from 'next/link';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { readAnalyticsPage } from '@/lib/workspace/creator-analytics/pages';
import { AnalyticsScreen } from '@/components/workspace/analytics/Analytics';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const {user}=await requireCreatorWorkspace(),v=await readAnalyticsPage(user.id,user.id,await searchParams);
 if(!v.data)return <div className="space-y-5"><h1 className="font-outfit text-3xl font-semibold">Choose analytics filters</h1><p role="alert">{v.error}</p><Link className="inline-flex min-h-11 items-center text-primary underline" href="/workspace/analytics">Reset analytics filters</Link></div>;
 return <AnalyticsScreen data={v.data}/>;
}
