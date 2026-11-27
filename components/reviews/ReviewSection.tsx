import { readReviews } from '@/lib/reviews/repository';
import { ReviewPanel } from './ReviewPanel';
export async function ReviewSection({courseId,actor}:{courseId:string;actor:string|null}) {
 try { const initial=await readReviews(courseId,actor); return <ReviewPanel courseId={courseId} initial={initial}/>; }
 catch { return <section id="course-reviews" className="rounded-2xl border p-6"><h2 className="text-xl font-bold">Learner reviews</h2><p className="mt-2 text-sm text-muted-foreground">Reviews are temporarily unavailable. Refresh this page to try again.</p></section>; }
}
