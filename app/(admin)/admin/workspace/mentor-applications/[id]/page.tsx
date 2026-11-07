import {MentorAdminPage} from '@/components/mentorship/AdminPages';
export const dynamic='force-dynamic';
export const metadata={title:'Mentor application review — AirBharath',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){return <MentorAdminPage id={(await params).id} query={await searchParams}/>;}
