export const categories = [
 ['account','Account and membership'], ['publishing','Course creation or publication'], ['media','Video and file processing'],
 ['access','Student enrollment or access'], ['finance','Earnings and payouts'], ['moderation','Moderation or appeals'], ['technical','Other technical problems'],
] as const;
export const statuses = [['open','Open'],['waiting','Waiting for support'],['action_needed','Action needed'],['resolved','Resolved'],['closed','Closed']] as const;
export type SupportStatus = typeof statuses[number][0];
export const queues = [['new','New requests'],['waiting','Awaiting support'],['action_needed','Awaiting requester'],['urgent','Urgent'],['history','Resolved history']] as const;
export const operationsEnabled = () => process.env.WORKSPACE_OPERATIONS_ENABLED === 'true';
export class OperationsError extends Error {constructor(public status: number, message: string) {super(message);}}
export const uuid = (v: unknown): string => {if(typeof v !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v)) throw new OperationsError(400,'Choose a valid reference.');return v;};
export function plain(v: unknown, min = 10, max = 4000) {if(typeof v !== 'string' || v.trim().length < min || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(v)) throw new OperationsError(400,`Enter ${min}–${max} characters of plain text.`);return v.trim();}
export function object(v: unknown, fields: string[]): Record<string,unknown> {if(!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k=>!fields.includes(k)))throw new OperationsError(400,'Check the request fields.');return v as Record<string,unknown>;}
export type SupportCommand = {action:'create'|'report'|'reply'|'note'|'update';requestKey:string;expectedVersion?:number;category?:string;title?:string;body?:string;referenceKind?:string;referenceId?:string|null;status?:SupportStatus;priority?:string;assignee?:string|null};
export function supportCommand(value: unknown): SupportCommand {
 const v=object(value,['action','requestKey','expectedVersion','category','title','body','referenceKind','referenceId','status','priority','assignee']);
 if(!['create','report','reply','note','update'].includes(String(v.action)))throw new OperationsError(400,'Choose a support action.');
 const action=v.action as SupportCommand['action'],allowed=action==='create'?['category','title','body','referenceKind','referenceId']:action==='report'?['body','referenceId']:action==='update'?['status','priority','assignee','body']:['body'];
 if(Object.keys(v).some(k=>!['action','requestKey',...(action==='create'||action==='report'?[]:['expectedVersion']),...allowed].includes(k)))throw new OperationsError(400,'Check the fields for this action.');
 const c:SupportCommand={action,requestKey:uuid(v.requestKey)};
 if(action!=='create'&&action!=='report'){if(!Number.isSafeInteger(v.expectedVersion)||Number(v.expectedVersion)<1)throw new OperationsError(400,'Reload the current support request.');c.expectedVersion=Number(v.expectedVersion);}
 if(action!=='update'||v.body!==undefined)c.body=plain(v.body);
 if(action==='create'){
  if(!categories.some(([key])=>key===v.category))throw new OperationsError(400,'Choose an issue category.');c.category=String(v.category);c.title=plain(v.title,5,160);
  c.referenceKind=String(v.referenceKind??'none');if(!['none','course','order','payout'].includes(c.referenceKind))throw new OperationsError(400,'Choose a supported reference.');c.referenceId=c.referenceKind==='none'?null:uuid(v.referenceId);
  if(c.referenceKind==='none'&&v.referenceId)throw new OperationsError(400,'Choose a reference type first.');
 }
 if(action==='report')c.referenceId=uuid(v.referenceId);
 if(action==='update'){
  if(!statuses.some(([key])=>key===v.status)||!['normal','urgent'].includes(String(v.priority)))throw new OperationsError(400,'Choose a status and priority.');
  c.status=v.status as SupportStatus;c.priority=String(v.priority);c.assignee=v.assignee===null?null:uuid(v.assignee);
  if(['resolved','closed'].includes(c.status)&&!c.body)throw new OperationsError(400,'Record a resolution before resolving or closing.');
 }
 return c;
}
export function supportTransition(current: SupportStatus, action: SupportCommand['action'], admin: boolean, next?: SupportStatus): SupportStatus {
 if(!admin&&['note','update'].includes(action))throw new OperationsError(403,'Support staff access is required.');
 if(action==='reply'){if(current==='closed')throw new OperationsError(409,'This request is closed. Start a new request if you need more help.');return admin?'action_needed':'waiting';}
 if(action==='update')return next!;
 return current;
}
export function listPage(value:unknown) {if(value===undefined)return 1;if(typeof value!=='string'||!/^[1-9]\d{0,3}$/.test(value))throw new OperationsError(400,'Choose a valid page.');return Number(value);}
export const workerDefinitions = [
 {key:'membership',label:'Membership payment recovery',minutes:1440,href:'/admin/workspace/events'},
 {key:'course_payments',label:'Course payment reconciliation',minutes:5,href:'/admin/creator-settlements?view=exceptions'},
 {key:'payouts',label:'Creator bank payments',minutes:1,href:'/admin/creator-settlements?view=exceptions'},
 {key:'media',label:'Lesson video processing',minutes:5,href:'/admin/workspace/operations?view=media'},
 {key:'refund_notices',label:'Membership refund email delivery',minutes:5,href:'/admin/workspace/notices'},
] as const;
export function workerHealth(last: {started_at:Date|string;finished_at:Date|string|null;outcome:string;lease_until:Date|string|null}|undefined, minutes:number, now=new Date()) {
 if(!last)return 'Never observed';
 if(last.outcome==='running'&&last.lease_until&&new Date(last.lease_until)>now)return 'Running';
 if(last.outcome==='failed'||last.outcome==='attention')return 'Needs attention';
 if(now.getTime()-new Date(last.finished_at??last.started_at).getTime()>Math.max(minutes*3,10)*60000)return 'Stale';
 return last.outcome==='running'?'Interrupted':'Recent successful run';
}
