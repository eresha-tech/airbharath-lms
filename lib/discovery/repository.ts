import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses as c, courseDiscoveryStats as s } from '@/lib/db/schema';
import { rankingConfig as config, type CatalogParams } from './model';
export const visibleCourse = and(eq(c.isPublished,true),sql`(${c.workspaceProjectId} is null OR ${c.workspaceState}='live')`,sql`${c.workspaceState} IS DISTINCT FROM 'suspended'`);
export async function discoverCourses(p:CatalogParams,actor?:string) {
  const w=config.weights;
  const count=sql<number>`coalesce(${s.reviewCount},0)`;
  const learners=sql<number>`coalesce(${s.learners},0)`;
  const rating=sql<number>`(coalesce(${s.ratingSum},0)+${config.priorMean*config.priorReviews}::float)/(${count}+${config.priorReviews})`;
  const age=sql`greatest(0,extract(epoch from (now()-coalesce(${s.publishedAt},${c.createdAt})))/86400)`;
  const pattern=`%${p.q.replace(/[\\%_]/g,'\\$&')}%`;
  const relevance= p.q ? sql<number>`CASE WHEN lower(${c.title})=lower(${p.q}) THEN 1.0 WHEN ${c.title} ILIKE ${pattern} THEN .8 ELSE .4 END` : sql<number>`0.0`;
  const quality=sql`((CASE WHEN length(coalesce(${c.description},''))>=80 THEN 1.0 ELSE 0 END)+(CASE WHEN ${c.thumbnailUrl} IS NOT NULL THEN 1.0 ELSE 0 END)+(CASE WHEN coalesce(${s.lessons},0)>0 OR ${c.isBundle} THEN 1.0 ELSE 0 END))/3.0`;
  const interests=actor?sql`CASE WHEN EXISTS(SELECT 1 FROM enrollments e JOIN courses ec ON ec.id=e.course_id WHERE e.user_id=${actor}::uuid AND e.status='active' AND (e.expires_at IS NULL OR e.expires_at>now()) AND ec.category=${c.category}) THEN 1.0 ELSE 0.0 END`:sql`0.0`;
  const document=sql`to_tsvector('simple',coalesce(${c.title},'')||' '||coalesce(${c.shortDescription},'')||' '||coalesce(${c.description},'')||' '||${c.category})`;
  const score=sql<number>`${relevance}*${w.relevance}+${interests}*${w.interests}+${rating}/5.0*${w.rating}+least(1,ln(1+${learners})/ln(1001))*${w.popularity}+
    (coalesce(${s.engaged},0)+2.0)/(${learners}+5)*${w.engagement}+(coalesce(${s.completed},0)+1.0)/(${learners}+5)*${w.completion}+
    ${quality}*${w.quality}+exp(-${age}/90)*${w.freshness}+exp(-${age}/45)/sqrt(1+${learners})*${w.exploration}`;
  const where=and(visibleCourse,p.category?eq(c.category,p.category):undefined,p.difficulty?eq(c.difficulty,p.difficulty):undefined,
    p.q?sql`(${document} @@ plainto_tsquery('simple',${p.q}) OR ${c.title} ILIKE ${pattern})`:undefined);
  const order=p.sort==='rating'?desc(rating):p.sort==='popularity'?desc(learners):p.sort==='newest'?desc(sql`coalesce(${s.publishedAt},${c.createdAt})`):desc(score);
  const [rows,total,categories]=await Promise.all([
    db.select({id:c.id,slug:c.slug,title:c.title,description:c.description,shortDescription:c.shortDescription,thumbnailUrl:c.thumbnailUrl,price:c.price,accessDays:c.accessDays,
      category:c.category,difficulty:c.difficulty,isBundle:c.isBundle,reviewCount:count,ratingSum:sql<number>`coalesce(${s.ratingSum},0)`,lessonsCount:s.lessons,modulesCount:s.modules,creatorName:sql<string|null>`CASE WHEN ${c.workspaceProjectId} IS NOT NULL THEN (SELECT a.name FROM course_authors a WHERE a.course_id=${c.id} ORDER BY a.order_index,a.id LIMIT 1) ELSE NULL END`})
      .from(c).leftJoin(s,eq(s.courseId,c.id))
      .where(where).orderBy(order,asc(c.id)).limit(12).offset((p.page-1)*12),
    db.select({n:sql<number>`count(*)::int`}).from(c).where(where),
    db.selectDistinct({name:c.category}).from(c).where(visibleCourse).orderBy(asc(c.category)),
  ]);
  return {courses:rows.map(r=>({...r,category:{name:r.category.replaceAll('_',' ')},badge:r.isBundle?'Combo Pass':r.category.replaceAll('_',' '),
    averageRating:r.reviewCount?Number(r.ratingSum)/r.reviewCount:null,reviewCount:Number(r.reviewCount),lessonsCount:r.lessonsCount??undefined,modulesCount:r.modulesCount??undefined,
    instructor:r.creatorName?{fullName:r.creatorName}:undefined})),total:total[0].n,categories:categories.map(r=>r.name),params:p,rankingVersion:config.version};
}
