import {NotificationsPage} from '@/components/workspace/operations/Pages';
export const dynamic='force-dynamic';
export const metadata={title:'Workspace Notifications',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <NotificationsPage query={await searchParams}/>;}
