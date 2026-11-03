import { notFound,redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { workspacePublishing } from '@/lib/workspace/publishing/repository';
import { Publishing } from '@/components/workspace/publishing/Publishing';
import { UUID } from '@/lib/workspace/eligibility/model';
export const dynamic='force-dynamic';
export const metadata={title:'Creator Course Review',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const admin=await getAuthorizedAdminSession();if(!admin)redirect('/login');const {id}=await params;if(!UUID.test(id))notFound();return <Publishing initial={await workspacePublishing().read(admin.id,id)} studioHref={`/admin/workspace/course-builds/${id}`}/>;}
