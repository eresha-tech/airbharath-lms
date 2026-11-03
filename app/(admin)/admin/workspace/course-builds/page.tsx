import Link from 'next/link';
import {WorkspaceList,type AdminSearch} from '@/components/admin/WorkspaceList';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({searchParams=Promise.resolve({})}:{searchParams?:AdminSearch}){return <><Link href="/admin/workspace/publishing" className="mb-5 inline-flex text-primary underline">Final review & publishing queue</Link>{await WorkspaceList({kind:'builds',searchParams})}</>;}
