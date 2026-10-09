import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@/lib/workspace/creator/repository', () => ({ postgresCreatorStore: {} }));
import { postgresAdminReviewStore, reviewQueue, reviewDetail } from '@/lib/workspace/review/repository';
import { submissionTransaction } from '@/lib/workspace/review/transaction';
import { workspaceCourseDrafts as drafts, workspaceCourseSubmissions as submissions, workspaceCourseReviewEvents as events, users } from '@/lib/db/schema';
import { content, now, owner, other, key, draftId, profileId } from './workspace-creator-fixtures';
import type { Submission } from '@/lib/workspace/review/service';
let role: string; let queries: { table: unknown; where?: SQL; lock?: string; kind: string; patch?: object; limit?: number; offset?: number }[];
const row: Submission = { ...content, id:key, draftId, userId:owner, creatorProfileId:profileId, submissionNumber:1,draftVersion:1,contentHash:'a'.repeat(64),commandHash:'b'.repeat(64),requestKey:key,currency:'INR',reviewStatus:'submitted',version:1,submittedAt:now,createdAt:now,updatedAt:now,reviewStartedAt:null,reviewCompletedAt:null };
let adapter: ReturnType<typeof submissionTransaction>;
const dialect = new PgDialect();
beforeEach(() => {
  role = 'admin'; queries = [];
  const select = () => ({ from: (table: unknown) => {
    const q: typeof queries[number] = { table, kind:'select' }; queries.push(q);
    const result = () => table === users ? [{ role }] : table === submissions ? [row] : [];
    const b = { where:(where:SQL)=>{q.where=where;return b;}, orderBy:()=>b, limit:(n:number)=>{q.limit=n;return b;}, offset:(n:number)=>{q.offset=n;return b;}, innerJoin:()=>b,leftJoin:()=>b, for:async(lock:string)=>{q.lock=lock;return result();}, then:(resolve:(rows:unknown[])=>unknown)=>Promise.resolve(result()).then(resolve) }; return b;
  } });
  const tx = { select, selectDistinctOn:select, insert:(table:unknown)=>({values:(patch:object)=>{queries.push({table,patch,kind:'insert'});return{returning:async()=>[{...patch,id:key}]};}}), update:(table:unknown)=>({set:(patch:object)=>({where:(where:SQL)=>{queries.push({table,patch,where,kind:'update'});return{returning:async()=>[{...row,...patch}]};}})}) };
  mocks.transaction.mockImplementation(work=>work(tx));
  adapter = submissionTransaction(tx as unknown as Parameters<typeof submissionTransaction>[0], owner);
});
it('admin transaction locks persisted actor, draft, then submission and rechecks expected status/version in update', async () => {
  await postgresAdminReviewStore.transaction(other,key,async tx => { const prior=await tx.submission(); await tx.transition(prior!,'under_review',now); });
  expect(queries.slice(0,4).map(q=>[q.table,q.lock])).toEqual([[users,'update'],[submissions,undefined],[drafts,'update'],[submissions,'update']]);
  expect(dialect.sqlToQuery(queries[0].where!).params).toEqual([other]); const mutation=queries.find(q=>q.kind==='update')!;expect(dialect.sqlToQuery(mutation.where!).params).toEqual([key,'submitted',1]); expect(mutation.patch).toEqual({reviewStatus:'under_review',version:2,updatedAt:now,reviewStartedAt:now});
});
it('demoted actor loses mutation, queue and detail before any submission is read', async () => {
  role='student'; for(const run of [()=>postgresAdminReviewStore.transaction(other,key,async()=>null),()=>reviewQueue(other,undefined,1),()=>reviewDetail(other,key)]) { queries=[]; await expect(run()).rejects.toMatchObject({code:'forbidden'}); expect(queries.map(q=>q.table)).toEqual([users]); }
});
it('creator lookups always carry owner predicates and histories are bounded to 10+1', async () => {
  await adapter.latest(draftId);await adapter.request(key); await adapter.history(draftId,2); await adapter.statuses([draftId]);
  const reads=queries.filter(q=>q.table===submissions);expect(reads.map(q=>dialect.sqlToQuery(q.where!).params)).toEqual([[owner,draftId],[owner,key],[owner,draftId],[owner,draftId]]); expect(reads[0].limit).toBe(1);expect(reads[2]).toMatchObject({limit:11,offset:10});
});
it('admin queue defaults to two open states and is bounded to 20+1', async () => { await reviewQueue(other,undefined,3);const query=queries.find(q=>q.table===submissions)!;expect(query).toMatchObject({limit:21,offset:40});expect(dialect.sqlToQuery(query.where!).params).toEqual(['submitted','under_review']); });
it('only lifecycle columns are written by admin review; snapshot writer inserts a separate private row', async () => {
  await adapter.create(row); await postgresAdminReviewStore.transaction(other,key,async tx=>{await tx.request(key);await tx.append({submissionId:key,actorAdminUserId:other,action:'review_started',fromStatus:'submitted',toStatus:'under_review',transitionVersion:2,requestKey:key,commandHash:'c'.repeat(64),createdAt:now});await tx.transition(row,'under_review',now);});
  expect(queries.filter(q=>q.kind!=='select').map(q=>q.table)).toEqual([submissions,events,submissions]);expect(Object.keys(queries.find(q=>q.kind==='update')!.patch!)).toEqual(['reviewStatus','version','updatedAt','reviewStartedAt']);
  expect(dialect.sqlToQuery(queries.find(q=>q.table===events&&q.kind==='select')!.where!).params).toEqual([other,key]);
});
