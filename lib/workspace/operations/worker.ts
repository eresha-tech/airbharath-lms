import 'server-only';
import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {db} from '@/lib/db';
import {operationsEnabled,workerDefinitions} from './model';
type Worker=typeof workerDefinitions[number]['key'];
export function operationalWorker(database=db){return async function observe<T>(key:Worker,work:()=>Promise<T>,needsAttention:(result:T)=>boolean=()=>false){
 const token=randomUUID();
 const claimed=await database.execute(sql`insert into workspace_worker_health(key,token,started_at,lease_until,outcome) values(${key},${token},now(),now()+interval '6 minutes','running') on conflict(key) do update set token=excluded.token,started_at=excluded.started_at,finished_at=null,lease_until=excluded.lease_until,outcome='running' where workspace_worker_health.lease_until is null or workspace_worker_health.lease_until<now() returning key`);
 if(!claimed.length)throw new Error('worker_already_running');
 try{const result=await work(),attention=needsAttention(result);const counts:Record<string,number>={};if(result&&typeof result==='object')for(const [name,value]of Object.entries(result))if(['processed','failed','checked','disputes','inbox','examined','dispatched','reconciled','deferred','payments','refunds','activation'].includes(name)&&Number.isSafeInteger(value)&&Number(value)>=0)counts[name]=Number(value);
  await database.execute(sql`update workspace_worker_health set finished_at=now(),succeeded_at=case when ${!attention} then now() else succeeded_at end,lease_until=null,outcome=${attention?'attention':'success'},counts=${JSON.stringify(counts)}::jsonb where key=${key} and token=${token}`);return result;
 }catch(error){await database.execute(sql`update workspace_worker_health set finished_at=now(),lease_until=null,outcome='failed',counts='{}'::jsonb where key=${key} and token=${token}`);throw error;}
};}
export function observedWorker<T>(key:Worker,work:()=>Promise<T>,attention?:(result:T)=>boolean){return operationsEnabled()?operationalWorker()(key,work,attention):work();}
