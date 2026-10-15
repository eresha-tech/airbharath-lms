import {WorkspaceList,type AdminSearch} from '@/components/admin/WorkspaceList';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({searchParams=Promise.resolve({})}:{searchParams?:AdminSearch}){return WorkspaceList({kind:'memberships',searchParams});}
