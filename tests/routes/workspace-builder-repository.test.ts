vi.mock('@/lib/workspace/access/repository',()=>({readGrantEvidence:async()=>null}));
import { beforeEach, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks=vi.hoisted(()=>({transaction:vi.fn(),access:vi.fn(),select:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{transaction:mocks.transaction,select:mocks.select}}));
vi.mock('@/lib/workspace/activation/repository',()=>({readWorkspaceAccess:mocks.access}));
import { postgresBuildStore, inspectBuilds, inspectBuild, inspectLesson, readBuildSummaries } from '@/lib/workspace/builder/repository';
import { users, workspaceCreatorProfiles as profiles, workspaceMembershipOrders as orders, workspaceCourseDrafts as drafts, workspaceCourseSubmissions as submissions, workspaceCourseProjects as projects, workspaceCourseModules as modules, workspaceCourseLessons as lessons } from '@/lib/db/schema';
import { content,evidence,owner,other,key,draftId,profileId,now } from './workspace-creator-fixtures';
import type { Project, ApprovedSource, CourseModule } from '@/lib/workspace/builder/service';
let role:string;let absent:boolean;let queries:{table:unknown;where?:SQL;lock?:string;kind:string;patch?:object;columns?:unknown;limit?:number;offset?:number}[];
const dialect=new PgDialect();
const project:Project={id:key,userId:owner,creatorProfileId:profileId,draftId,approvedSubmissionId:other,status:'building',version:1,createdAt:now,updatedAt:now};
const source:ApprovedSource={...content,id:other,userId:owner,creatorProfileId:profileId,draftId,submissionNumber:1,draftVersion:1,contentHash:'a'.repeat(64),commandHash:'b'.repeat(64),requestKey:key,currency:'INR',reviewStatus:'approved',version:3,submittedAt:now,createdAt:now,updatedAt:now,reviewStartedAt:now,reviewCompletedAt:now,approvalExists:true};
let tx:unknown;
beforeEach(()=>{
 role='admin';absent=false;queries=[];
 const select=(columns?:unknown)=>({from:(table:unknown)=>{const q:typeof queries[number]={table,columns,kind:'select'};queries.push(q);const result=()=>table===users?absent?[]:[{id:owner,fullName:'Synthetic',role,creatorName:'Synthetic',creatorStatus:'enabled'}]:table===profiles?[{id:profileId,userId:owner}]:table===orders?[{id:other}]:table===submissions?[{submission:source,approvalExists:true}]:table===projects?[project]:[];const b={where:(where:SQL)=>{q.where=where;return b;},orderBy:()=>b,limit:(n:number)=>{q.limit=n;return b;},offset:(n:number)=>{q.offset=n;return b;},innerJoin:()=>b,for:async(lock:string)=>{q.lock=lock;return result();},then:(resolve:(r:unknown[])=>unknown)=>Promise.resolve(result()).then(resolve)};return b;}});
 const update=(table:unknown)=>({set:(patch:object)=>({where:(where:SQL)=>{queries.push({table,patch,where,kind:'update'});return{returning:async()=>[{id:key}]};}})});
 const remove=(table:unknown)=>({where:(where:SQL)=>{queries.push({table,where,kind:'delete'});return{returning:async()=>[{id:key}]};}});
 const insert=(table:unknown)=>({values:(patch:object)=>{queries.push({table,patch,kind:'insert'});return{returning:async()=>[{...patch,id:key}]};}});
 tx={select,update,insert,delete:remove};mocks.transaction.mockImplementation(work=>work(tx));mocks.select.mockImplementation(select);
 mocks.access.mockResolvedValue({row:{profile:{status:'enabled'},order:{...evidence,planSnapshot:{displayName:'Quarterly'}},membership:evidence.membership},latestOrder:{activationState:'fulfilled'}});
});
it('locks persisted user/orders/profile before access; draft precedes approved source and checks approval event',async()=>{
 await postgresBuildStore.transaction(owner,async tx=>{expect((await tx.context()).profileId).toBe(profileId);await tx.source(other,draftId);});expect(queries.map(q=>[q.table,q.lock])).toEqual([[users,'update'],[orders,'update'],[profiles,'update'],[drafts,'update'],[submissions,'share']]);expect(mocks.access).toHaveBeenCalledWith(owner,tx);expect(dialect.sqlToQuery(queries[3].where!).params).toEqual([draftId,owner]);expect(dialect.sqlToQuery(queries[4].where!).params).toEqual([other,owner,draftId]);const columns=queries[4].columns as {approvalExists:SQL};const approval=dialect.sqlToQuery(columns.approvalExists).sql;expect(approval).toContain('transition_version');expect(approval).toContain('review_completed_at');absent=true;await expect(postgresBuildStore.transaction(owner,async()=>null)).rejects.toMatchObject({code:'authentication'});
});
it('all project/module/lesson lookup and update SQL is scoped to persisted parent/owner/version',async()=>{
 await postgresBuildStore.transaction(owner,async tx=>{await tx.project(draftId);await tx.existing(other);await tx.module(project,other);await tx.lesson(project,other,draftId);await tx.updateModule(project,other,7,{title:'Updated module',description:''},now);await tx.updateLesson(project,other,draftId,8,{title:'Updated lesson',summary:'',content:'Private'},now);await tx.deleteModule(project,other,7);await tx.deleteLesson(project,other,draftId,8);});
 const reads=queries.filter(q=>q.kind==='select'&&[projects,modules,lessons].includes(q.table as never));expect(reads.map(q=>dialect.sqlToQuery(q.where!).params)).toEqual([[owner,draftId],[owner,other],[key,owner,other],[key,owner,other,draftId]]);const mutations=queries.filter(q=>q.kind!=='select');expect(mutations.map(q=>dialect.sqlToQuery(q.where!).params)).toEqual([[key,owner,other,7],[key,owner,other,draftId,8],[key,owner,other,7],[key,owner,other,draftId,8]]);
});
it('writes only new builder tables; derived inserts preserve full owner chain; trees omit lesson bodies',async()=>{
 await postgresBuildStore.transaction(owner,async tx=>{await tx.createProject(source,now);const m=await tx.createModule(project,{title:'Module',description:''},0,now);await tx.createLesson(project,m,{title:'Lesson',summary:'',content:'Private'},0,now);await tx.modules(project);await tx.lessons(project);});const inserts=queries.filter(q=>q.kind==='insert');expect(inserts.map(q=>q.table)).toEqual([projects,modules,lessons]);expect(inserts[0].patch).toMatchObject({userId:owner,creatorProfileId:profileId,draftId,approvedSubmissionId:other});for(const q of inserts)expect(q.patch).toMatchObject({userId:owner});expect(queries.find(q=>q.table===lessons&&q.kind==='select')!.columns).not.toHaveProperty('content');
});
it('reorder updates changed rows only under owner and independent expected versions',async()=>{await postgresBuildStore.transaction(owner,async tx=>{await tx.positions(project,'module',[{id:other,position:1,version:4},{id:draftId,position:0,version:9},{id:profileId,position:2,version:3}],now);});const writes=queries.filter(q=>q.kind==='update');expect(writes).toHaveLength(2);expect(writes.map(q=>q.patch)).toEqual([{position:0,version:5,updatedAt:now},{position:1,version:10,updatedAt:now}]);expect(writes.map(q=>dialect.sqlToQuery(q.where!).params)).toEqual([[key,owner,other,4],[key,owner,draftId,9]]);});
it('persisted demotion denies list/detail/lesson inspection before private content queries',async()=>{role='student';for(const run of [()=>inspectBuilds(other,1),()=>inspectBuild(other,key),()=>inspectLesson(other,key,other,draftId)]){queries=[];await expect(run()).rejects.toMatchObject({code:'forbidden'});expect(queries.map(q=>q.table)).toEqual([users]);}});
it('persisted admin inspection is read only and includes source, creator, timestamps and scoped lesson lookup',async()=>{const tree=await inspectBuild(other,key);expect(tree.canEdit).toBe(false);expect(tree.inspection?.creatorName).toBe('Synthetic');expect(tree.source.title).toBe(source.title);expect(tree.project.createdAt).toEqual(now);await inspectLesson(other,key,other,draftId).catch(()=>undefined);const q=queries.find(q=>q.table===lessons&&q.columns&&Object.hasOwn(q.columns as object,'lesson'))!;expect(dialect.sqlToQuery(q.where!).params).toEqual([key,other,draftId]);expect(queries.every(q=>q.kind==='select')).toBe(true);queries=[];await inspectBuilds(other,2);expect(queries.find(q=>q.table===projects)).toMatchObject({limit:21,offset:20});});
it('unapplied migration degrades library summary safely and owner-scoped summaries never read body',async()=>{await readBuildSummaries(owner,[draftId]);expect(dialect.sqlToQuery(queries[0].where!).params).toEqual([owner,draftId]);mocks.select.mockImplementation(()=>{throw new Error('unapplied builder schema');});expect(await readBuildSummaries(owner,[draftId])).toEqual({available:false,rows:{}});});

it('preserves correlated approval and count qualifiers in flattened single-table SQL',async()=>{
 await postgresBuildStore.transaction(owner,tx=>tx.source(other,draftId));
 const columns=queries.find(q=>q.table===submissions)!.columns as {approvalExists:SQL};
 const approval=drizzle.mock().select({approvalExists:columns.approvalExists}).from(submissions).toSQL().sql;
 expect(approval).toContain('"workspace_course_review_events"."submission_id"="workspace_course_submissions"."id"');
 expect(approval).toContain('"workspace_course_review_events"."transition_version"="workspace_course_submissions"."version"');
 expect(approval).toContain('"workspace_course_review_events"."created_at"="workspace_course_submissions"."review_completed_at"');
 queries=[];await readBuildSummaries(owner,[draftId]);
 const counts=queries[0].columns as {moduleCount:SQL;lessonCount:SQL};
 const countSql=drizzle.mock().select(counts).from(projects).toSQL().sql;
 expect(countSql).toContain('"workspace_course_modules"."project_id"="workspace_course_projects"."id"');
 expect(countSql).toContain('"workspace_course_lessons"."project_id"="workspace_course_projects"."id"');
});
