import 'server-only';
import {sql} from 'drizzle-orm';
import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {hash} from '../publishing/model';
import {OperationsError, supportCommand, supportTransition, uuid, type SupportStatus} from './model';

export type SupportRequest={id:string;owner_id:string;kind:string;category:string;title:string;status:SupportStatus;priority:string;reference_kind:string;reference_id:string|null;assignee_id:string|null;version:number;created_at:Date;updated_at:Date;resolved_at:Date|null;owner_name?:string;assignee_name?:string};
export type SupportMessage={id:string;body:string;internal:boolean;created_at:Date;author:string};
export type SupportDetail={request:SupportRequest;messages:SupportMessage[];more:boolean;page:number;admin:boolean;staff:{id:string;name:string}[];history:{action:string;created_at:Date;result:Record<string,unknown>}[]};
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
async function actor(tx:Tx,id:string,admin=false){const [u]=await tx.execute(sql`select id,role from users where id=${id}`);if(!u)throw new OperationsError(401,'Please sign in again.');if(admin&&u.role!=='admin')throw new OperationsError(403,'Support staff access is required.');return u;}
export function supportRepository(database=db){
 async function list(user:string,admin=false,queue='new',page=1){return database.transaction(async tx=>{
  await tx.execute(sql`set transaction isolation level repeatable read read only`);await actor(tx,user,admin);
  const where=!admin?sql`r.owner_id=${user}`:queue==='history'?sql`r.status in ('resolved','closed')`:queue==='urgent'?sql`r.priority='urgent' and r.status not in ('resolved','closed')`:queue==='new'?sql`r.status='open'`:queue==='action_needed'?sql`r.status='action_needed'`:sql`r.status in ('open','waiting')`;
  const rows=await tx.execute(sql`select r.*,u.full_name owner_name,a.full_name assignee_name from workspace_support_requests r join users u on u.id=r.owner_id left join users a on a.id=r.assignee_id where ${where} order by r.updated_at desc,r.id desc limit 21 offset ${(page-1)*20}`);
  return {rows:rows.slice(0,20) as unknown as SupportRequest[],more:rows.length>20,page};
 });}
 async function read(user:string,id:string,admin=false,page=1):Promise<SupportDetail>{uuid(id);return database.transaction(async tx=>{
  await tx.execute(sql`set transaction isolation level repeatable read read only`);await actor(tx,user,admin);
  const [request]=await tx.execute(sql`select r.*,u.full_name owner_name,a.full_name assignee_name from workspace_support_requests r join users u on u.id=r.owner_id left join users a on a.id=r.assignee_id where r.id=${id} and (${admin} or r.owner_id=${user})`);if(!request)throw new OperationsError(404,'Support request not found.');
  const messages=await tx.execute(sql`select m.id,m.body,m.internal,m.created_at,case when m.actor_id=r.owner_id then 'Requester' else 'Support team' end author from workspace_support_messages m join workspace_support_requests r on r.id=m.request_id where m.request_id=${id} and (${admin} or not m.internal) order by m.created_at desc,m.id desc limit 26 offset ${(page-1)*25}`);
  const staff=admin?await tx.execute(sql`select id,coalesce(full_name,'Administrator') name from users where role='admin' order by id limit 100`):[];
  const history=admin?await tx.execute(sql`select action,created_at,result from workspace_operation_events where entity_id=${id} order by created_at desc,id desc limit 25`):[];
  const safe=request as unknown as SupportRequest;if(!admin){safe.assignee_id=null;delete safe.assignee_name;}
  return {request:safe,messages:messages.slice(0,25).reverse() as unknown as SupportMessage[],more:messages.length>25,page,admin,staff:staff as unknown as SupportDetail['staff'],history:history as unknown as SupportDetail['history']};
 });}
 async function execute(user:string,id:string|null,raw:unknown,admin=false){
  const c=supportCommand(raw);if(id)uuid(id);const digest=hash({id,command:c});
  return database.transaction(async tx=>{
   await tx.execute(sql`select id from users where id=${user} for update`);await actor(tx,user,admin);
   await tx.execute(sql`select set_config('airbharath.workspace_operations',${user},true)`);
   const [prior]=await tx.execute(sql`select command_hash,result from workspace_operation_events where actor_id=${user} and request_key=${c.requestKey}`);
   if(prior){if(prior.command_hash!==digest)throw new OperationsError(409,'That request key was already used for a different action.');return prior.result as {id:string;version:number};}
   let target=id,version=1,audit:Record<string,unknown>={};
   if(c.action==='create'||c.action==='report'){
    if(id||admin)throw new OperationsError(400,'Start a request from your own support page.');
    const [rate]=await tx.execute(sql`select count(*)::int n from workspace_support_requests where owner_id=${user} and created_at>now()-interval '24 hours'`);
    if(Number(rate.n)>=5)throw new OperationsError(429,'You can start up to five requests per day. Reply to an existing request for the same issue.');
    if(c.action==='create'&&c.referenceKind!=='none'){
     const reference=c.referenceKind==='course'?sql`select id from workspace_course_projects where id=${c.referenceId} and user_id=${user}`:c.referenceKind==='order'?sql`select id from orders where id=${c.referenceId} and (creator_id=${user} or user_id=${user})`:sql`select id from creator_payouts where id=${c.referenceId} and creator_id=${user}`;
     if(!(await tx.execute(reference)).length)throw new OperationsError(404,'That reference is not available to your account.');
    }
    if(c.action==='report'&&!(await tx.execute(sql`select id from courses where id=${c.referenceId} and workspace_project_id is not null and workspace_state='live' and is_published`)).length)throw new OperationsError(404,'Published Creator course not found.');
    target=randomUUID();await tx.execute(sql`insert into workspace_support_requests(id,owner_id,kind,category,title,reference_kind,reference_id) values(${target},${user},${c.action==='report'?'course_report':'support'},${c.action==='report'?'moderation':c.category!},${c.action==='report'?'Course content report':c.title!},${c.action==='report'?'reported_course':c.referenceKind!},${c.referenceId??null})`);
   }else{
    if(!id)throw new OperationsError(400,'Choose an existing request.');
    const [r]=await tx.execute(sql`select * from workspace_support_requests where id=${id} and (${admin} or owner_id=${user}) for update`);if(!r)throw new OperationsError(404,'Support request not found.');
    if(r.version!==c.expectedVersion)throw new OperationsError(409,'This conversation changed. Reload before sending your action again.');
    const state=supportTransition(r.status as SupportStatus,c.action,admin,c.status);
    if(c.assignee&&!(await tx.execute(sql`select id from users where id=${c.assignee} and role='admin'`)).length)throw new OperationsError(409,'Choose a current support administrator.');
    version=Number(r.version)+1;audit={previousStatus:r.status,status:state,priority:c.priority??r.priority,assigneeId:c.action==='update'?c.assignee:r.assignee_id};
    await tx.execute(sql`update workspace_support_requests set status=${state},priority=${c.priority??r.priority},assignee_id=${c.action==='update'?c.assignee:r.assignee_id},version=${version},updated_at=now(),resolved_at=case when ${state} in ('resolved','closed') then coalesce(resolved_at,now()) else null end where id=${id}`);
   }
   if(c.body){
    const [rate]=await tx.execute(sql`select count(*)::int n from workspace_support_messages where actor_id=${user} and created_at>now()-interval '1 hour'`);if(Number(rate.n)>=60)throw new OperationsError(429,'Please wait before adding more messages.');
    await tx.execute(sql`insert into workspace_support_messages(request_id,actor_id,internal,body) values(${target!},${user},${c.action==='note'},${c.body})`);
   }
   const result={id:target!,version,...audit};await tx.execute(sql`insert into workspace_operation_events(actor_id,request_key,entity_id,action,command_hash,result) values(${user},${c.requestKey},${target!},${c.action},${digest},${JSON.stringify(result)}::jsonb)`);return result;
  });
 }
 return {list,read,execute};
}
