import 'server-only';
import {sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {courseScope} from '@/lib/creator-payments/config';
import {OperationsError} from './model';
export type Notification={key:string;title:string;message:string;href:string;at:Date;read_at:Date|null};
// Source facts stay in their existing authoritative histories. No second outbox,
// synthesized payout success, provider payload, bank details or message bodies.
export function notificationQuery(owner:string,scope:string|null){return sql`with feed as (
 (select 'publication:'||n.id key,case ev.action when 'publish' then 'Course published' when 'restore' then 'Course restored' when 'suspend' then 'Course suspended' when 'request_corrections' then 'Course corrections requested' when 'resolve' then 'Course restriction resolved' else 'Course update' end title,'Open your course to review the saved publication or moderation update.' message,case when p.draft_id is not null then '/workspace/courses/'||p.draft_id||'/publishing?stage=publish' else '/workspace/courses' end href,n.created_at as "at" from workspace_publication_notices n join workspace_course_projects p on p.id=n.project_id join workspace_publication_events ev on ev.id=n.event_id where n.user_id=${owner} order by n.created_at desc,n.id desc limit 100)
 union all
 (select 'support:'||e.id,'Support request updated','Open your request to read the response or next step.','/workspace/support/'||r.id,e.created_at from workspace_operation_events e join workspace_support_requests r on r.id=e.entity_id where r.owner_id=${owner} and e.actor_id<>${owner} and e.action in ('reply','update') order by e.created_at desc,e.id desc limit 100)
 union all
 (select 'sale:'||l.id,'Course sale recorded','Your recorded earnings are available in Earnings & Payouts. Amounts awaiting payment checks remain provisional.','/workspace/earnings/transactions',l.created_at from creator_ledger l where l.creator_id=${owner} and l.scope=${scope} and l.kind='sale' order by l.created_at desc,l.id desc limit 100)
 union all
 (select 'bank:'||e.id,case when e.action='verify_payee' then 'Payout account verified' else 'Payout account needs attention' end,'Review Payout Account Settings for the current verification decision.','/workspace/settings/payout-account',e.created_at from creator_finance_events e where e.creator_id=${owner} and e.action in ('verify_payee','reject_payee') order by e.created_at desc,e.id desc limit 100)
 union all
 (select 'payout:'||p.id,'Monthly payout prepared','Your payout is awaiting independent approval and provider processing. It has not been paid.','/workspace/earnings/payouts/'||p.id,p.created_at from creator_payouts p where p.creator_id=${owner} and p.scope=${scope} order by p.created_at desc,p.id desc limit 100)
 union all
 (select 'transfer:'||o.id,case when o.status='processed' then 'Bank payout processed' when o.status='reversed' then 'Bank payout returned' when o.status in ('failed','rejected','cancelled','request_rejected') then 'Bank payout could not complete' else 'Bank payout is in progress' end,case when o.status='processed' then 'RazorpayX independently confirmed the processed status. Open your payout for the recorded details.' when o.status='reversed' then 'The provider reported a return. Support will review the settlement obligation.' else 'Open your payout to check its current verified status and next steps.' end,'/workspace/earnings/payouts/'||p.id,o.created_at from creator_payout_observations o join creator_payout_jobs j on j.id=o.job_id join creator_payouts p on p.id=j.payout_id where p.creator_id=${owner} and p.scope=${scope} and (o.source='reconcile' or o.source='create' and o.status='request_rejected') and o.id=(select first.id from creator_payout_observations first where first.job_id=o.job_id and first.status=o.status and first.source=o.source order by first.created_at,first.id limit 1) order by o.created_at desc,o.id desc limit 100)
 union all
 (select 'media:'||j.id||':'||j.state,case when j.state='complete' then 'Lesson video ready' else 'Lesson video needs attention' end,case when j.state='complete' then 'Return to Course Studio to select the processed video for your lesson.' else 'Your existing lesson video is retained. Review the failed upload or ask support for help.' end,case when p.draft_id is not null then '/workspace/courses/'||p.draft_id||'/build' else '/workspace/courses' end,j.updated_at from workspace_media_jobs j join workspace_course_assets a on a.id=j.asset_id join workspace_course_projects p on p.id=a.project_id where a.user_id=${owner} and a.status<>'detached' and j.state in ('complete','failed') order by j.updated_at desc,j.id desc limit 100)
 ) select f.*,r.read_at from feed f left join workspace_notification_receipts r on r.user_id=${owner} and r.source_key=f.key`;}
export function notificationRepository(database=db,scope=courseScope()??null){
 async function list(owner:string,page=1){const rows=await database.execute(notificationQuery(owner,scope).append(sql` order by "at" desc,key desc limit 21 offset ${(page-1)*20}`));return {rows:rows.slice(0,20) as unknown as Notification[],more:rows.length>20,page};}
 async function mark(owner:string,key:string){if(!/^[a-z_]+:[a-f0-9-]{36}(:[a-z_]+)?$/.test(key))throw new OperationsError(400,'Choose a notification.');return database.transaction(async tx=>{
  if(!(await tx.execute(notificationQuery(owner,scope).append(sql` where f.key=${key} limit 1`))).length)throw new OperationsError(404,'Notification not found in your recent history.');
  await tx.execute(sql`select set_config('airbharath.workspace_operations',${owner},true)`);
  await tx.execute(sql`insert into workspace_notification_receipts(user_id,source_key) values(${owner},${key}) on conflict do nothing`);return {read:true};
 });}
 return {list,mark};
}
