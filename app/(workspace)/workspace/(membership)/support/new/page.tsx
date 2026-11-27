import {NewSupportPage} from '@/components/workspace/operations/Pages';
export const dynamic='force-dynamic';
export const metadata={title:'Workspace NewSupport',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <NewSupportPage query={await searchParams}/>;}
