import { randomUUID } from 'node:crypto';
import { beforeEach,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({transaction:vi.fn(),candidate:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>({db:{transaction:mocks.transaction,query:{workspaceMembershipOrders:{findFirst:mocks.candidate}}}}));
import { postgresRefundStore } from '@/lib/workspace/refunds/repository';
import { users,workspaceMembershipOrders,workspaceRefundRequests,workspaceRefundAttempts,workspaceRefundCompletions,workspacePaymentAttempts } from '@/lib/db/schema';
const owner=randomUUID(),actor=randomUUID(),orderId=randomUUID(),now=new Date('2026-10-12T12:01:00Z');
let trace:string[],role:string,candidateOwner:string,orderOwner:string;
beforeEach(()=>{trace=[];role='admin';candidateOwner=owner;orderOwner=owner;mocks.candidate.mockImplementation(async()=>({userId:candidateOwner}));
 mocks.transaction.mockImplementation(async work=>work({select:()=>({from:(table:unknown)=>{
  const name=table===users?'users':table===workspaceMembershipOrders?'orders':table===workspaceRefundRequests?'requests':table===workspaceRefundAttempts?'attempts':table===workspaceRefundCompletions?'completions':table===workspacePaymentAttempts?'payments':'unexpected';
  const rows=table===users?[{id:owner,role:'student'},{id:actor,role}]:table===workspaceMembershipOrders?[{id:orderId,userId:orderOwner}]:[];
  const chain={where:()=>chain,orderBy:()=>chain,for:async(mode:string)=>{trace.push(`${name}:${mode}`);return rows;},then:(resolve:(rows:unknown[])=>unknown)=>Promise.resolve(rows).then(resolve)};return chain;
 }}),execute:async()=>{trace.push('clock');return [{time:now}];}}));});
it('locks persisted users then order/case/intent/payment and samples DB clock after locks',async()=>{const row=await postgresRefundStore.transaction(orderId,actor,async tx=>({actor:tx.actor,time:await tx.now()}));expect(row).toEqual({actor:{id:actor,role:'admin'},time:now});expect(trace).toEqual(['users:update','orders:update','requests:update','attempts:update','payments:share','clock']);});
it('role is read from locked persisted user and stale session cannot change it',async()=>{role='student';expect(await postgresRefundStore.transaction(orderId,actor,async tx=>tx.actor?.role)).toBe('student');await expect(postgresRefundStore.read(orderId,actor,true)).rejects.toMatchObject({code:'forbidden'});});
it('ownership is rechecked after routing lookup and missing order fails closed',async()=>{orderOwner=randomUUID();await expect(postgresRefundStore.transaction(orderId,actor,async()=>true)).rejects.toMatchObject({code:'not_found'});mocks.candidate.mockResolvedValue(undefined);await expect(postgresRefundStore.transaction(orderId,actor,async()=>true)).rejects.toMatchObject({code:'not_found'});});
it('storage failure is propagated without false success',async()=>{mocks.transaction.mockRejectedValue(Error('synthetic storage unavailable'));await expect(postgresRefundStore.transaction(orderId,actor,async()=>true)).rejects.toThrow('synthetic storage unavailable');});
