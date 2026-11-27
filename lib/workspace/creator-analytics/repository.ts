import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courseScope } from '@/lib/creator-payments/config';
import { AnalyticsError, UUID, type AnalyticsFilters, completionRate, salesComparison } from './model';
export type SalesMetrics = {sales:number;revenue:number;discounts:number;tax:number;refunds:number;disputes:number;corrections:number;fees:number;eligible:number;earnings:number;unresolved:number;missing_fees:number};
export type StudentMetrics = {learners:number;enrollments:number;new_enrollments:number;paid_origin:number;unknown_origin:number;accessible:number;started:number;progressing:number;completed_learners:number;completed:number;eligible_completion:number;active:number};
export type CourseMetric = SalesMetrics & {id:string;draft_id:string|null;course_id:string|null;creator_id:string;creator_name:string;title:string;status:string;historical:boolean;learners:number;started:number;completed:number;active:number;lessons:number;rating_sum:number;reviews:number;notice:string|null;new_enrollments:number};
export type Trend = {day:string;sales:number;revenue:number;earnings:number;enrollments:number};
export type LessonMetric = {title:string;module:string;position:number;completed:number;learners:number};
export type AnalyticsData = {
 financialAvailable:boolean; filters:AnalyticsFilters; courses:Pick<CourseMetric,'id'|'title'|'creator_id'|'creator_name'>[]; choicesTruncated:boolean;
 totals:SalesMetrics & StudentMetrics & {courses:number;published:number;drafts:number;reviews:number;rating_sum:number;period_reviews:number};
 rows:CourseMetric[]; totalCourses:number; trend:Trend[]; lessons:LessonMetric[]; lessonCount:number;
 distribution:{label:string;count:number}[]; recent:{title:string;kind:string;at:string;amount:number|null}[];
 creators:{id:string;name:string;sales:number;revenue:number;earnings:number;enrollments:number}[];
 comparison:{difference:number;previous:number}|null; completionRate:number|null; generatedAt:string;
};
// No per-course queries: each source is scoped and reduced before joining monetary,
// enrollment and review aggregates. All returned data is aggregate-only.
export function catalogQuery(creator:string|null) {return sql`
 with owned as (
  select d.id,d.id draft_id,c.id course_id,d.user_id creator_id,u.full_name creator_name,
   coalesce(c.title,d.title) title,coalesce(s.status,case when p.id is null then 'draft' else 'building' end) status,
   false historical,case when s.moderation->>'restriction' in ('flagged','corrections','unpublished','suspended') then s.moderation->>'reason' end notice,
   (c.instructor_id=d.user_id) can_read_students
  from workspace_course_drafts d join users u on u.id=d.user_id
  left join workspace_course_projects p on p.draft_id=d.id and p.user_id=d.user_id
  left join workspace_publication_states s on s.project_id=p.id and s.user_id=d.user_id
  left join courses c on c.id=s.course_id
  where (${creator}::uuid is null or d.user_id=${creator}::uuid)
 ), historical as (
  select o.course_id id,null::uuid draft_id,o.course_id,o.creator_id,u.full_name creator_name,
   min(o.purchase_evidence->>'courseTitle') title,'historical'::text status,true historical,null::text notice,false can_read_students
  from creator_ledger historical_sale join orders o on o.id=historical_sale.order_id and o.creator_id=historical_sale.creator_id join users u on u.id=o.creator_id
  where historical_sale.kind='sale' and o.creator_id is not null and (${creator}::uuid is null or o.creator_id=${creator}::uuid)
   and not exists(select 1 from owned c where c.course_id=o.course_id and c.creator_id=o.creator_id)
  group by o.course_id,o.creator_id,u.full_name
 ), catalog as (select * from owned union all select * from historical)
 `;}
export function analyticsQuery(creator:string|null,f:AnalyticsFilters,scope:string|null) {return catalogQuery(creator).append(sql`,
 selected as (select * from catalog where (${f.course}='' or id=nullif(${f.course},'')::uuid)),
 sale_orders as (
  select o.id,o.user_id,o.course_id,o.creator_id,c.id key,c.title,o.purchase_evidence,min(l.created_at) captured_at
  from selected c join orders o on o.course_id=c.course_id and o.creator_id=c.creator_id
  join creator_ledger l on l.order_id=o.id and l.creator_id=o.creator_id and l.scope=${scope} and l.kind='sale'
  where o.status in ('paid','refunded','chargeback') group by o.id,c.id,c.title
 ), events as (
  select l.*,o.key,o.title from sale_orders o join creator_ledger l on l.order_id=o.id and l.creator_id=o.creator_id and l.scope=${scope}
 ), period_events as (select * from events where created_at>=${f.start}::timestamptz and created_at<${f.end}::timestamptz),
 sale_counts as (
  select key,count(*) filter(where captured_at>=${f.start}::timestamptz and captured_at<${f.end}::timestamptz)::int sales,
   coalesce(sum((purchase_evidence->>'discountPaise')::bigint) filter(where captured_at>=${f.start}::timestamptz and captured_at<${f.end}::timestamptz),0) discounts
  from sale_orders group by key
 ), money as (
  select key,coalesce(sum(gross_paise) filter(where kind='sale'),0) revenue,
   sum(tax_paise) tax,-coalesce(sum(gross_paise) filter(where kind='refund'),0) refunds,
   coalesce(sum(gross_paise) filter(where kind='dispute'),0) disputes,
   coalesce(sum(gross_paise) filter(where kind='adjustment'),0) corrections,
   sum(fee_paise) fees,sum(gross_paise-tax_paise) eligible,sum(net_paise) earnings from period_events group by key
 ), unresolved as (
  select o.key,count(*)::int n,count(*) filter(where pc.issue='fee_evidence_missing' or not exists(select 1 from events fee where fee.order_id=o.id and fee.kind='fee'))::int missing_fees from sale_orders o left join course_payment_checks pc on pc.order_id=o.id
  where (o.captured_at>=${f.start}::timestamptz and o.captured_at<${f.end}::timestamptz or exists(select 1 from period_events e where e.order_id=o.id))
   and (pc.scope is distinct from ${scope} or pc.issue is not null or pc.last_checked_at is null or pc.last_checked_at<now()-interval '24 hours'
    or not exists(select 1 from events l where l.order_id=o.id and l.kind='fee')) group by o.key
 ), source_enrollments as (
  select c.id key,c.course_id,c.creator_id,e.user_id,e.course_id source_course,e.enrolled_at,
   e.status='active' and (e.expires_at is null or e.expires_at>now()) and c.status<>'suspended'
    and source.workspace_state is distinct from 'suspended' available
  from selected c join enrollments e on e.course_id=c.course_id
  join courses source on source.id=e.course_id join users u on u.id=e.user_id and u.role='student'
  where c.can_read_students and u.id<>c.creator_id
  union all
  select c.id,c.course_id,c.creator_id,e.user_id,e.course_id,e.enrolled_at,
   e.status='active' and (e.expires_at is null or e.expires_at>now()) and c.status<>'suspended'
    and source.workspace_state is distinct from 'suspended'
  from selected c join course_bundle_items b on b.course_id=c.course_id join enrollments e on e.course_id=b.bundle_course_id
  join courses source on source.id=e.course_id join users u on u.id=e.user_id and u.role='student'
  where c.can_read_students and u.id<>c.creator_id
 ), paid_origins as (
  select distinct e.user_id,e.source_course from source_enrollments e join orders o on o.user_id=e.user_id and o.course_id=e.source_course
  where o.status in ('paid','refunded','chargeback') and o.razorpay_payment_id is not null and o.amount>0
   and (o.creator_id is null or exists(select 1 from creator_ledger l where l.order_id=o.id and l.kind='sale' and l.scope=${scope}))
 ), enrolled as (
  select e.key,e.course_id,e.user_id,min(e.enrolled_at) enrolled_at,bool_or(e.available) available,
   bool_or(p.user_id is not null) paid_origin from source_enrollments e left join paid_origins p on p.user_id=e.user_id and p.source_course=e.source_course
  group by e.key,e.course_id,e.user_id
 ), curriculum as (
  select c.id key,l.id,l.title,m.title module,m.order_index module_position,l.order_index position
  from selected c join modules m on m.course_id=c.course_id join lessons l on l.module_id=m.id
  where c.can_read_students and not m.workspace_retired and not l.workspace_retired and not l.is_free_preview
 ), curriculum_counts as (select key,count(*)::int lessons from curriculum group by key),
 saved as (
  select e.key,e.user_id,count(*)::int saved,count(*) filter(where not l.workspace_retired and not m.workspace_retired and p.is_completed)::int completed,
   bool_or(p.updated_at>=${f.start}::timestamptz and p.updated_at<${f.end}::timestamptz) recent,max(p.updated_at) updated_at
  from enrolled e join progress p on p.user_id=e.user_id join lessons l on l.id=p.lesson_id
  join modules m on m.id=l.module_id and m.course_id=e.course_id where not l.is_free_preview
  group by e.key,e.user_id
 ), learner_facts as (
  select e.*,coalesce(cc.lessons,0) lessons,coalesce(p.saved,0)>0 started,
   coalesce(p.completed,0) completed_lessons,coalesce(cc.lessons,0)>0 and coalesce(p.completed,0)>=cc.lessons completed,
   e.available and coalesce(p.recent,false) active,p.updated_at
  from enrolled e left join curriculum_counts cc on cc.key=e.key left join saved p on p.key=e.key and p.user_id=e.user_id
 ), student_counts as (
  select key,count(*)::int learners,count(*) filter(where started)::int started,count(*) filter(where completed)::int completed,
   count(*) filter(where active)::int active,count(*) filter(where enrolled_at>=${f.start}::timestamptz and enrolled_at<${f.end}::timestamptz)::int new_enrollments
  from learner_facts group by key
 ), ratings as (
  select c.id key,count(*)::int reviews,sum(r.rating)::int rating_sum,
   count(*) filter(where r.created_at>=${f.start}::timestamptz and r.created_at<${f.end}::timestamptz)::int period_reviews
  from selected c join course_reviews r on r.course_id=c.course_id and r.status='published' where c.can_read_students group by c.id
 ), course_facts as (
  select c.*,coalesce(s.sales,0) sales,coalesce(s.discounts,0) discounts,
   coalesce(m.revenue,0) revenue,coalesce(m.tax,0) tax,coalesce(m.refunds,0) refunds,coalesce(m.disputes,0) disputes,coalesce(m.corrections,0) corrections,
   coalesce(m.fees,0) fees,coalesce(m.eligible,0) eligible,coalesce(m.earnings,0) earnings,coalesce(ur.n,0) unresolved,coalesce(ur.missing_fees,0) missing_fees,
   coalesce(st.learners,0) learners,coalesce(st.started,0) started,coalesce(st.completed,0) completed,coalesce(st.active,0) active,
   coalesce(st.new_enrollments,0) new_enrollments,coalesce(cc.lessons,0) lessons,coalesce(r.reviews,0) reviews,coalesce(r.rating_sum,0) rating_sum,coalesce(r.period_reviews,0) period_reviews
  from selected c left join sale_counts s on s.key=c.id left join money m on m.key=c.id left join unresolved ur on ur.key=c.id
  left join student_counts st on st.key=c.id left join curriculum_counts cc on cc.key=c.id left join ratings r on r.key=c.id
 ), days as (select generate_series(${f.from}::date,${f.to}::date,'1 day')::date as day),
 daily_sales as (select (captured_at at time zone 'Asia/Kolkata')::date as day,count(*)::int sales from sale_orders where captured_at>=${f.start}::timestamptz and captured_at<${f.end}::timestamptz group by 1),
 daily_money as (select (created_at at time zone 'Asia/Kolkata')::date as day,sum(net_paise) earnings,coalesce(sum(gross_paise) filter(where kind='sale'),0) revenue from period_events group by 1),
 daily_enrollment as (select (enrolled_at at time zone 'Asia/Kolkata')::date as day,count(*)::int enrollments from enrolled where enrolled_at>=${f.start}::timestamptz and enrolled_at<${f.end}::timestamptz group by 1)
 select jsonb_build_object(
 'totals',(select to_jsonb(t) from (select count(*)::int courses,count(*) filter(where status='live')::int published,count(*) filter(where status in ('draft','building'))::int drafts,
  coalesce(sum(sales),0) sales,coalesce(sum(revenue),0) revenue,coalesce(sum(discounts),0) discounts,coalesce(sum(tax),0) tax,coalesce(sum(refunds),0) refunds,
  coalesce(sum(disputes),0) disputes,coalesce(sum(corrections),0) corrections,coalesce(sum(fees),0) fees,coalesce(sum(eligible),0) eligible,coalesce(sum(earnings),0) earnings,
  coalesce(sum(unresolved),0) unresolved,coalesce(sum(missing_fees),0) missing_fees,coalesce(sum(reviews),0) reviews,coalesce(sum(rating_sum),0) rating_sum,coalesce(sum(period_reviews),0) period_reviews from course_facts)t),
 'students',(select to_jsonb(t) from (select count(distinct user_id)::int learners,count(*)::int enrollments,
  count(*) filter(where enrolled_at>=${f.start}::timestamptz and enrolled_at<${f.end}::timestamptz)::int new_enrollments,
  count(*) filter(where paid_origin)::int paid_origin,count(*) filter(where not paid_origin)::int unknown_origin,
  count(*) filter(where available)::int accessible,count(distinct user_id) filter(where started)::int started,
  count(distinct user_id) filter(where started and not completed)::int progressing,count(distinct user_id) filter(where completed)::int completed_learners,
  count(*) filter(where completed)::int completed,count(*) filter(where lessons>0)::int eligible_completion,count(distinct user_id) filter(where active)::int active from learner_facts)t),
 'rows',coalesce((select jsonb_agg(to_jsonb(t) order by t.revenue desc,t.title,t.id) from (select * from course_facts order by revenue desc,title,id limit 20 offset ${(f.page-1)*20})t),'[]'::jsonb),
 'totalCourses',(select count(*)::int from selected),
 'trend',(select jsonb_agg(jsonb_build_object('day',d.day,'sales',coalesce(s.sales,0),'revenue',coalesce(m.revenue,0),'earnings',coalesce(m.earnings,0),'enrollments',coalesce(e.enrollments,0)) order by d.day) from days d left join daily_sales s using(day) left join daily_money m using(day) left join daily_enrollment e using(day)),
 'lessons',coalesce((select jsonb_agg(to_jsonb(t) order by module_position,position,id) from (select c.*,count(distinct p.user_id)::int completed,(select count(*)::int from enrolled e where e.key=c.key) learners from curriculum c left join enrolled e on e.key=c.key left join progress p on p.user_id=e.user_id and p.lesson_id=c.id and p.is_completed where ${f.course}<>'' group by c.key,c.id,c.title,c.module,c.module_position,c.position order by module_position,position,id limit 50)t),'[]'::jsonb),
 'lessonCount',(select count(*)::int from curriculum where ${f.course}<>''),
 'distribution',coalesce((select jsonb_agg(jsonb_build_object('label',label,'count',n) order by label) from (select case when lessons=0 then 'No current lessons' when completed then '100%' when completed_lessons=0 then '0%' when completed_lessons*100.0/lessons<25 then '1–24%' when completed_lessons*100.0/lessons<50 then '25–49%' when completed_lessons*100.0/lessons<75 then '50–74%' else '75–99%' end label,count(*)::int n from learner_facts l group by 1)t),'[]'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(t) order by at desc) from (
   (select title,'Verified course sale' kind,captured_at at,(purchase_evidence->>'totalPaise')::bigint amount from sale_orders order by captured_at desc limit 4)
   union all (select c.title,'New course enrollment',e.enrolled_at,null::bigint from enrolled e join selected c on c.id=e.key order by e.enrolled_at desc limit 4)
   union all (select c.title,'Saved lesson progress',p.updated_at,null::bigint from saved p join selected c on c.id=p.key order by p.updated_at desc limit 4)
  order by at desc limit 6)t),'[]'::jsonb),
 'creators',coalesce((select jsonb_agg(to_jsonb(t) order by revenue desc,id) from (select creator_id id,creator_name name,sum(sales) sales,sum(revenue) revenue,sum(earnings) earnings,sum(learners) enrollments from course_facts group by creator_id,creator_name order by sum(revenue) desc,creator_id limit 20)t),'[]'::jsonb),
 'previousSales',(select count(*)::int from sale_orders where captured_at>=${f.previous}::timestamptz and captured_at<${f.start}::timestamptz),
 'firstSale',(select min(captured_at) from sale_orders)
 ) data
 `);}
export function creatorAnalytics(database = db, scope: string|null = courseScope()) {
 async function read(actor:string,creator:string|null,f:AnalyticsFilters):Promise<AnalyticsData> {
  if(!UUID.test(actor)||(creator!==null&&!UUID.test(creator)))throw new AnalyticsError(403,'Analytics access denied.');
  return database.transaction(async tx=>{
   await tx.execute(sql`set transaction isolation level repeatable read read only`);
   await tx.execute(sql`set local statement_timeout='8s'`);
   const [user]=await tx.execute(sql`select role from users where id=${actor}::uuid`);
   if(!user||(creator!==actor&&user.role!=='admin'))throw new AnalyticsError(403,'Analytics access denied.');
   if(creator&&!(await tx.execute(sql`select 1 from workspace_creator_profiles where user_id=${creator}::uuid`)).length)throw new AnalyticsError(404,'Creator analytics not found.');
   const choices=await tx.execute(catalogQuery(creator).append(sql`select id,title,creator_id,creator_name from catalog order by title,id limit 501`));
   if(f.course&&!(await tx.execute(catalogQuery(creator).append(sql`select 1 from catalog where id=${f.course}::uuid`))).length)throw new AnalyticsError(404,'Course analytics not found.');
   const [row]=await tx.execute(analyticsQuery(creator,f,scope));
   const v=row.data as Omit<AnalyticsData,'filters'|'courses'|'comparison'|'completionRate'|'financialAvailable'|'generatedAt'|'choicesTruncated'> & {students:StudentMetrics;previousSales:number;firstSale:string|null};
   return {...v,totals:{...v.totals,...v.students},courses:choices.slice(0,500) as AnalyticsData['courses'],choicesTruncated:choices.length>500,filters:f,
    financialAvailable:scope!==null,comparison:salesComparison(v.totals.sales,v.previousSales,v.firstSale,f),completionRate:completionRate(v.students.completed,v.students.eligible_completion),generatedAt:new Date().toISOString()};
  });
 }
 return {read};
}
