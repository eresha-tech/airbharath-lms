import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { reviewManagement } from '@/lib/reviews/repository';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}) {
 const admin=await getAuthorizedAdminSession();if(!admin)redirect('/login');const page=Math.max(1,Number.parseInt((await searchParams).page??'1')||1);
 const rows=await reviewManagement(admin.id,true,page);
 return <div className="ph-no-capture mx-auto max-w-5xl space-y-6"><h1 className="text-3xl font-bold">Learner review moderation</h1><p className="text-muted-foreground">Review new submissions, edits and reports. Decisions require a reason and an independent Admin. Creators cannot change ratings.</p><div className="divide-y rounded-2xl border bg-card">{rows.map(r=><Link href={`/admin/learner-reviews/${r.id}`} key={r.id} className="block space-y-2 p-5 hover:bg-muted/40"><p className="font-semibold">{r.title}</p><p className="text-sm">{r.rating} / 5 · {r.status} · {r.reports} reports</p><p className="line-clamp-2 break-words text-sm text-muted-foreground">{r.content}</p></Link>)}{!rows.length&&<p className="p-6">No reviews on this page.</p>}</div><nav className="flex gap-5" aria-label="Moderation pagination">{page>1&&<Link href={`?page=${page-1}`}>Previous</Link>}{rows.length===25&&<Link href={`?page=${page+1}`}>Next</Link>}</nav></div>;
}
