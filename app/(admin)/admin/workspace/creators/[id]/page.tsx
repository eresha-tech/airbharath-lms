import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {creatorDetail} from '@/lib/workspace/admin/details';
export default async function Page({params}:{params:Promise<{id:string}>}){const a=await getAuthorizedAdminSession();if(!a)redirect('/login');const {id}=await params,r=await creatorDetail(a.id,id);if(!r)notFound();return <div className="space-y-5"><h1 className="text-3xl">{r.details?.displayName||r.name||'Creator'}</h1><p>Status: {r.profile.status}</p><p>{r.details?.professionalHeadline||'Profile not completed'}</p><p className="whitespace-pre-wrap">{r.details?.shortBio||''}</p><nav className="flex flex-wrap gap-5 text-sm">{[['Access Grants','access-grants'],['Owned proposals','course-drafts'],['Financial orders','orders']].map(([label,route])=><Link className="text-primary underline" key={route} href={'/admin/workspace/'+route+'?q='+id}>{label}</Link>)}</nav></div>;}
