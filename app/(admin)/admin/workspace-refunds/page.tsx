import Link from 'next/link';
import {WorkspaceList,type AdminSearch} from '@/components/admin/WorkspaceList';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({searchParams=Promise.resolve({})}:{searchParams?:AdminSearch}){return <div className="space-y-6"><Link href="/admin/workspace/refund-exceptions" className="inline-flex min-h-11 items-center text-primary underline">External refund exceptions</Link>{await WorkspaceList({kind:'refunds',searchParams})}</div>;}
