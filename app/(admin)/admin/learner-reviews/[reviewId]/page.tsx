import Link from 'next/link';
import { redirect,notFound } from 'next/navigation';
import { eq,desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courseReviews,courseReviewReports } from '@/lib/db/schema';
import { UUID } from '@/lib/reviews/model';
import { reviewHistory } from '@/lib/reviews/repository';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { ModerateReview } from '@/components/reviews/ModerateReview';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{reviewId:string}>}) {
 const admin=await getAuthorizedAdminSession();if(!admin)redirect('/login');const {reviewId}=await params;if(!UUID.test(reviewId))notFound();
 const review=await db.query.courseReviews.findFirst({where:eq(courseReviews.id,reviewId)});if(!review)notFound();
 const [history,reports]=await Promise.all([reviewHistory(admin.id,reviewId),db.select({reason:courseReviewReports.reason,createdAt:courseReviewReports.createdAt}).from(courseReviewReports).where(eq(courseReviewReports.reviewId,reviewId)).orderBy(desc(courseReviewReports.createdAt)).limit(100)]);
 return <div className="ph-no-capture mx-auto max-w-3xl space-y-6"><Link href="/admin/learner-reviews" className="text-primary underline">All learner reviews</Link><h1 className="text-3xl font-bold">Review decision</h1><article className="space-y-4 rounded-2xl border bg-card p-6"><p>{review.rating} / 5 ★ · {review.status} · Version {review.version}</p><p className="whitespace-pre-wrap break-words">{review.content}</p>{review.status!=='deleted'&&<ModerateReview id={reviewId} version={review.version}/>}</article><section><h2 className="mb-3 text-xl font-bold">Reports</h2>{reports.map((r,i)=><p key={i} className="mb-3 break-words rounded-xl border p-4">{r.reason}</p>)}{!reports.length&&<p>No reports.</p>}</section><section><h2 className="mb-3 text-xl font-bold">Audit history</h2><ol className="space-y-3">{history.map(e=><li key={e.id} className="rounded-xl border p-4 text-sm"><p>Version {e.version} · {e.action} · {e.createdAt.toISOString()}</p><p className="mt-1 break-words">{e.reason}</p><details className="mt-2"><summary>Saved review at this decision</summary><p>{e.snapshot.rating} / 5 · {e.snapshot.status}</p><p className="whitespace-pre-wrap break-words">{e.snapshot.content}</p></details></li>)}</ol></section></div>;
}
