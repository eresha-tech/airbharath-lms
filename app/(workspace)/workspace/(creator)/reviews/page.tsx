import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { reviewManagement } from '@/lib/reviews/repository';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}) {
 const user=await getSession();if(!user)redirect('/login');const page=Math.max(1,Number.parseInt((await searchParams).page??'1')||1);const rows=await reviewManagement(user.id,false,page);
 return <div className="ph-no-capture mx-auto max-w-4xl space-y-6"><h1 className="text-3xl font-bold">Learner feedback</h1><p className="text-muted-foreground">Published feedback for your courses. Ratings and moderation are managed independently. Use Report review on the course page if feedback breaks the rules.</p>{rows.map(r=><article key={r.id} className="space-y-3 rounded-2xl border bg-card p-6"><Link className="font-bold text-primary" href={`/courses/${r.courseId}#course-reviews`}>{r.title}</Link><p className="text-sm">{r.rating} / 5 ★ · {r.updatedAt.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</p><p className="whitespace-pre-wrap break-words text-sm">{r.content}</p></article>)}{!rows.length&&<p className="rounded-2xl border p-8">No published feedback on this page yet.</p>}<nav aria-label="Feedback pagination" className="flex gap-5">{page>1&&<Link href={`?page=${page-1}`}>Previous</Link>}{rows.length===25&&<Link href={`?page=${page+1}`}>Next</Link>}</nav></div>;
}
