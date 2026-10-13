import {WorkspaceList,type AdminSearch} from '@/components/admin/WorkspaceList';
export default async function Page({searchParams}:{searchParams:AdminSearch}){return WorkspaceList({kind:'externalRefunds',searchParams});}
