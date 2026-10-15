import { randomUUID } from 'node:crypto';
import type { NoticeStore, NoticeClaim, NoticeBinding } from '@/lib/workspace/refund-notifications/store';
import type { DeliveryState, NoticeFacts, NoticeOutcome, Recipient } from '@/lib/workspace/refund-notifications/model';
import { noticeRetryAt } from '@/lib/workspace/refund-notifications/model';
import type { NoticeProvider } from '@/lib/workspace/refund-notifications/provider';
import { vi } from 'vitest';
export const noticeEnv = { NODE_ENV:'development',DATABASE_ENV:'development',WORKSPACE_NOTICE_DELIVERY_ENABLED:'true',WORKSPACE_NOTICE_SENDER_VERIFIED:'true',WORKSPACE_NOTICE_PROVIDER_SCOPE:'synthetic-account-v1',MAILERCLOUD_API_KEY:'synthetic-notice-key-not-real',MAILERCLOUD_SENDER_EMAIL:'academy@example.test',MAILERCLOUD_SENDER_NAME:'AirBharath Workspace',NEXT_PUBLIC_BASE_URL:'https://example.test',WORKSPACE_PAYMENT_ENABLED:'false',WORKSPACE_REFUND_ENABLED:'false' };
// Deterministic fake coordination; never represented as real PostgreSQL concurrency.
export function noticeHarness(kind:NoticeFacts['kind']='completed') {
 const now={value:new Date('2026-10-13T00:00:00Z')},owner=randomUUID(),noticeId=randomUUID(),deliveryId=randomUUID();
 const facts:NoticeFacts={userId:owner,kind,request:true,rejected:kind==='rejected',rejectionReason:kind==='rejected'?'A safe recorded reason':null,initiated:kind==='initiated',completed:kind==='completed'};
 let recipient:Recipient|null={userId:owner,email:'creator@example.test',verification:'verified',verifiedAt:new Date(now.value.getTime()-1000)};
 const row={state:'pending' as DeliveryState,attemptCount:0,currentAttemptId:null as string|null,lease:null as Date|null,next:null as Date|null,binding:null as NoticeBinding|null,reason:null as string|null};
 const history:{id:string;state:string;outcome?:NoticeOutcome}[]=[],sends:unknown[]=[];let failFinish=false;
 const current=(claim:NoticeClaim)=>row.currentAttemptId===claim.attemptId&&['claimed','submitted'].includes(row.state);
 const store:NoticeStore={
  async candidates(limit){return (['pending','retryable_failure'].includes(row.state)&&(!row.next||row.next<=now.value)||['claimed','submitted'].includes(row.state)&&row.lease!<=now.value)?[noticeId].slice(0,limit):[]},
  async claim(){if(['accepted','uncertain','blocked'].includes(row.state)||row.next&&row.next>now.value)return null;
   if(['claimed','submitted'].includes(row.state)){if(row.lease!>now.value)return null;row.state=row.state==='submitted'?'uncertain':row.attemptCount===5?'blocked':'retryable_failure';row.reason=row.state==='uncertain'?'lease_expired_after_dispatch':'lease_expired_before_dispatch';history.at(-1)!.state=row.state;row.lease=null;row.next=row.state==='retryable_failure'?noticeRetryAt(now.value,row.attemptCount):null;return null;}
   const attemptId=randomUUID();row.attemptCount++;row.currentAttemptId=attemptId;row.state='claimed';row.lease=new Date(now.value.getTime()+60000);row.next=null;history.push({id:attemptId,state:'claimed'});return {deliveryId,attemptId,attemptNumber:row.attemptCount};},
  async inspect(){return {facts,recipient}},
  async dispatch(claim,binding){if(!current(claim)||row.state!=='claimed'||row.lease!<=now.value)return false;if(row.binding&&JSON.stringify(row.binding)!==JSON.stringify(binding)){row.state='blocked';row.reason='payload_changed';row.lease=null;history.at(-1)!.state='blocked';return false;}row.binding=binding;row.state='submitted';history.at(-1)!.state='submitted';return true;},
  async finish(claim,outcome){if(failFinish){failFinish=false;throw Error('DB receipt failure')}if(!current(claim))return false;if(row.state==='claimed'&&!['blocked','retryable_failure'].includes(outcome.state))return false;row.state=outcome.state==='retryable_failure'&&row.attemptCount>=5?'blocked':outcome.state;row.reason=row.state==='blocked'&&outcome.state==='retryable_failure'?'retry_exhausted':outcome.reason;row.lease=null;row.next=row.state==='retryable_failure'?noticeRetryAt(now.value,row.attemptCount):null;history.at(-1)!.state=row.state;history.at(-1)!.outcome=structuredClone(outcome);return true;},
  async summary(){return {states:{[row.state]:1},blockedReasons:row.state==='blocked'?{[row.reason||'unknown']:1}:{},lastAcceptedAt:row.state==='accepted'?now.value.toISOString():null,oldestPendingAt:now.value.toISOString()}},
 };
 const provider:NoticeProvider={send:vi.fn<NoticeProvider['send']>(async input=>{sends.push(input);return {state:'accepted',reason:'provider_accepted',providerCode:1000}})};
 return {now,facts,owner,noticeId,deliveryId,row,store,provider,history,sends,setRecipient:(value:Recipient|null)=>{recipient=value},failFinish:()=>{failFinish=true}};
}
