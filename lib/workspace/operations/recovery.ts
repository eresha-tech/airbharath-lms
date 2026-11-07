import 'server-only';
import {sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {hash} from '../publishing/model';
import {workspaceMediaProcessing} from '../media/runtime';
import {object,uuid,OperationsError} from './model';
// Uses the existing processing service. Never reset an ambiguous dispatch, delete
// an asset or create a replacement provider job for a failed/uncertain source.
export async function recheckMedia(admin:string,id:string,raw:unknown){uuid(id);const command=object(raw,['requestKey']),key=uuid(command.requestKey),digest=hash({id,action:'media_recheck'});
 const selection=await db.transaction(async tx=>{
  await tx.execute(sql`select id from users where id=${admin} for update`);if(!(await tx.execute(sql`select id from users where id=${admin} and role='admin'`)).length)throw new OperationsError(403,'Administrator access is required.');
  const [prior]=await tx.execute(sql`select command_hash from workspace_operation_events where actor_id=${admin} and request_key=${key}`);if(prior){if(prior.command_hash!==digest)throw new OperationsError(409,'Request key already used.');return null;}
  const [row]=await tx.execute(sql`select a.user_id,j.state,j.provider_job_id from workspace_course_assets a join workspace_media_jobs j on j.asset_id=a.id where a.id=${id} and a.status='processing'`);
  if(!row||row.state!=='queued'&&!(row.state==='submitted'&&row.provider_job_id))throw new OperationsError(409,'This asset requires investigation or a fresh Creator upload. It cannot be redispatched safely.');
  await tx.execute(sql`select set_config('airbharath.workspace_operations',${admin},true)`);await tx.execute(sql`insert into workspace_operation_events(actor_id,request_key,entity_id,action,command_hash,result) values(${admin},${key},${id},'media_recheck',${digest},'{"requested":true}'::jsonb)`);return row;
 });
 if(selection){const service=workspaceMediaProcessing();if(selection.state==='queued')await service.dispatch(String(selection.user_id),id);else await service.reconcile(String(selection.user_id),id);}
 return {requested:true,message:'The existing media job was checked. Reload its saved status; this acknowledgement does not confirm processing success.'};
}
