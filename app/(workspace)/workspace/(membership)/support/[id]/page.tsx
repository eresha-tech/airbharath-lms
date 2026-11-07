import {SupportDetailPage} from '@/components/workspace/operations/Pages';
export const dynamic='force-dynamic';
export const metadata={title:'Workspace SupportDetail',robots:{index:false,follow:false}};
export default async function Page({searchParams,params}:{searchParams:Promise<Record<string,string|string[]|undefined>>;params:Promise<{id:string}>}){return <SupportDetailPage query={await searchParams} id={(await params).id}/>;}
