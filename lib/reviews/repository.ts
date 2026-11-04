import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, courseReviews as reviews, courseReviewEvents as events, courseReviewReports as reports, users } from '@/lib/db/schema';
import { ReviewError, reviewInput, type ReviewPage } from './model';

export async function readReviews(courseId: string, actor: string | null, page = 1): Promise<ReviewPage> {
  const [course] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.id,courseId),eq(courses.isPublished,true),sql`(${courses.workspaceProjectId} IS NULL OR ${courses.workspaceState}='live')`,sql`${courses.workspaceState} IS DISTINCT FROM 'suspended'`));
  if (!course) throw new ReviewError(404,'Course is unavailable.');
  const safePage = Math.min(1000,Math.max(1,page));
  const [stats, rows, own, eligible] = await Promise.all([
    db.query.courseDiscoveryStats.findFirst({ where: (s,{eq}) => eq(s.courseId,courseId) }),
    db.select({ id: reviews.id, rating: reviews.rating, content: reviews.content, updatedAt: reviews.updatedAt,
      displayName: sql<string>`CASE WHEN ${reviews.showName} THEN coalesce(nullif(split_part(btrim(${users.fullName}),' ',1),''),'Verified learner') ELSE 'Private learner' END` })
      .from(reviews).innerJoin(users,eq(users.id,reviews.userId)).where(and(eq(reviews.courseId,courseId),eq(reviews.status,'published')))
      .orderBy(desc(reviews.updatedAt),desc(reviews.id)).limit(10).offset((safePage-1)*10),
    actor ? db.query.courseReviews.findFirst({ where: and(eq(reviews.courseId,courseId),eq(reviews.userId,actor)), columns: { id:true,rating:true,content:true,showName:true,status:true,version:true } }) : null,
    actor ? db.execute<{ eligible: boolean }>(sql`select course_review_eligible(${actor}::uuid,${courseId}::uuid) eligible`) : [],
  ]);
  return { average: stats?.reviewCount ? stats.ratingSum/stats.reviewCount : null,count: stats?.reviewCount ?? 0,
    distribution: stats?.distribution ?? [0,0,0,0,0],reviews: rows.map(r=>({...r,updatedAt:r.updatedAt.toISOString()})),
    page:safePage,pages:Math.max(1,Math.ceil((stats?.reviewCount ?? 0)/10)),own:own ?? null,eligible:eligible[0]?.eligible ?? false,signedIn:!!actor };
}

export async function mutateReview(actor: string, courseId: string, raw: unknown, deleting = false) {
  const input = deleting ? null : reviewInput(raw);
  const version = deleting && raw && typeof raw==='object' ? (raw as Record<string,unknown>).version : input?.version;
  if (!Number.isInteger(version) || Number(version)<0) throw new ReviewError(400,'Review version is required.');
  return db.transaction(async tx=>{
    await tx.select({ id:users.id }).from(users).where(eq(users.id,actor)).for('update');
    await tx.execute(sql`select set_config('app.review_actor',${actor},true)`);
    const [current] = await tx.select().from(reviews).where(and(eq(reviews.courseId,courseId),eq(reviews.userId,actor))).for('update');
    if ((current?.version ?? 0)!==version) throw new ReviewError(409,'Your review changed. Refresh before trying again.');
    if (deleting) {
      if (!current || current.status==='deleted') return { success:true };
      await tx.update(reviews).set({ status:'deleted',version:current.version+1 }).where(eq(reviews.id,current.id));
    } else {
      // The database rechecks persisted enrollment, progress, role and ownership.
      if (current?.status==='hidden') throw new ReviewError(403,'A moderated review requires Admin review before resubmission.');
      const [eligibility] = await tx.execute<{ eligible:boolean }>(sql`select course_review_eligible(${actor}::uuid,${courseId}::uuid) eligible`);
      if (!eligibility?.eligible) throw new ReviewError(403,'Active enrollment for 24 hours and 20% lesson completion (at least two lessons where available) are required.');
      if (current) await tx.update(reviews).set({ ...input!,status:'pending',version:current.version+1 }).where(eq(reviews.id,current.id));
      else await tx.insert(reviews).values({ courseId,userId:actor,...input!,version:1 });
    }
    return { success:true };
  });
}
export async function reportReview(actor:string, reviewId:string, reason:unknown) {
  if (typeof reason!=='string' || reason.trim().length<10 || reason.length>1000) throw new ReviewError(400,'Explain the report in 10–1000 characters.');
  return db.transaction(async tx=>{
    await tx.select({id:users.id}).from(users).where(eq(users.id,actor)).for('update');
    const review = await tx.query.courseReviews.findFirst({where:eq(reviews.id,reviewId)});
    const course = review && await tx.query.courses.findFirst({where:eq(courses.id,review.courseId)});
    if (!review || review.status!=='published' || !course?.isPublished || (course.workspaceProjectId && course.workspaceState!=='live')) throw new ReviewError(404,'Review is unavailable.');
    if (review.userId===actor) throw new ReviewError(403,'You cannot report your own review.');
    const [count] = await tx.execute<{ n:number }>(sql`select count(*)::int n from course_review_reports where user_id=${actor} and created_at>now()-interval '1 day'`);
    if (count.n>=10) throw new ReviewError(429,'Report limit reached. Try again tomorrow.');
    await tx.insert(reports).values({ reviewId,userId:actor,reason:reason.trim() }).onConflictDoNothing();
    return { success:true };
  });
}
export async function moderateReview(actor:string,reviewId:string,raw:unknown) {
  const b = raw as Record<string,unknown>;
  if (!b || !['published','hidden'].includes(String(b.status)) || typeof b.reason!=='string' || b.reason.trim().length<10 || b.reason.length>1000 || !Number.isInteger(b.version)) throw new ReviewError(400,'A decision, current version and 10–1000 character reason are required.');
  const reason=b.reason.trim();
  return db.transaction(async tx=>{
    const [admin] = await tx.select().from(users).where(eq(users.id,actor)).for('update');
    if (admin?.role!=='admin') throw new ReviewError(403,'Admin access required.');
    const [review] = await tx.select().from(reviews).where(eq(reviews.id,reviewId)).for('update');
    if (!review) throw new ReviewError(404,'Review not found.');
    if (review.version!==b.version || review.status==='deleted') throw new ReviewError(409,'Review changed. Refresh before moderating.');
    const course = await tx.query.courses.findFirst({where:eq(courses.id,review.courseId)});
    if (review.userId===actor || course?.instructorId===actor) throw new ReviewError(403,'An independent Admin must moderate this review.');
    await tx.execute(sql`select set_config('app.review_actor',${actor},true),set_config('app.review_reason',${reason},true)`);
    await tx.update(reviews).set({status:b.status as 'published'|'hidden',version:review.version+1}).where(eq(reviews.id,reviewId));
    return {success:true};
  });
}
export async function reviewManagement(actor:string,admin:boolean,page=1) {
  // Both page guards and this persisted-role/ownership query protect private feedback.
  const [user]=await db.select({role:users.role}).from(users).where(eq(users.id,actor));
  if (admin && user?.role!=='admin') throw new ReviewError(403,'Admin access required.');
  return db.select({id:reviews.id,courseId:reviews.courseId,title:courses.title,rating:reviews.rating,content:reviews.content,status:reviews.status,version:reviews.version,updatedAt:reviews.updatedAt,
    reports:sql<number>`(select count(*)::int from course_review_reports r where r.review_id=${reviews.id})`})
    .from(reviews).innerJoin(courses,eq(courses.id,reviews.courseId))
    .where(admin ? undefined : and(eq(courses.instructorId,actor),eq(reviews.status,'published')))
    .orderBy(desc(reviews.updatedAt),desc(reviews.id)).limit(25).offset((Math.max(1,page)-1)*25);
}
export async function reviewHistory(actor:string,reviewId:string) {
  const [user]=await db.select({role:users.role}).from(users).where(eq(users.id,actor));
  if(user?.role!=='admin') throw new ReviewError(403,'Admin access required.');
  return db.select().from(events).where(eq(events.reviewId,reviewId)).orderBy(desc(events.version));
}
