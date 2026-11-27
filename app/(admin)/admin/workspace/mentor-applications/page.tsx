import {MentorAdminPage} from '@/components/mentorship/AdminPages';
export const dynamic='force-dynamic';
export const metadata={title:'Mentor Applications — AirBharath',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <MentorAdminPage query={await searchParams}/>;}
