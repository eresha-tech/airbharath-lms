import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCommand, startCommand, BUILDER_BODY_LIMIT } from '@/lib/workspace/builder/model';
import { sanitizeWorkspaceAnalytics, workspaceAnalyticsPath } from '@/lib/workspace/analytics-privacy';
import { owner, other, draftId, key } from './workspace-creator-fixtures';
const mocks=vi.hoisted(()=>({user:vi.fn(),admin:vi.fn(),start:vi.fn(),read:vi.fn(),lesson:vi.fn(),mutate:vi.fn(),inspect:vi.fn(),inspectLesson:vi.fn()}));
vi.mock('@/lib/workspace/eligibility/service',()=>({getWorkspaceUser:mocks.user}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:mocks.admin}));
vi.mock('@/lib/workspace/builder/repository',()=>({workspaceBuilder:()=>({start:mocks.start,read:mocks.read,lesson:mocks.lesson,mutate:mocks.mutate}),inspectBuild:mocks.inspect,inspectLesson:mocks.inspectLesson}));
import { builderHttp, adminBuilderHttp } from '@/lib/workspace/builder/http';
import { BuildError } from '@/lib/workspace/builder/model';
import * as adminRoute from '@/app/api/admin/workspace/course-builds/[id]/route';
beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue({id:owner});mocks.admin.mockResolvedValue({id:other});mocks.start.mockResolvedValue({created:true,project:{id:key}});mocks.read.mockResolvedValue({});mocks.lesson.mockResolvedValue({content:'Private'});mocks.mutate.mockResolvedValue({});mocks.inspect.mockResolvedValue({canEdit:false});mocks.inspectLesson.mockResolvedValue({content:'Private'});});
const request=(method='GET',body?:string,headers:Record<string,string>={},query='')=>new Request('http://localhost:3000/api/workspace/course-drafts/'+draftId+'/build'+query,{method,...(body!==undefined?{body}:{}),headers:{'Content-Type':'application/json',...headers}});
it.each(['<script>alert(1)</script>','text\u0000','text\u0007','x'.repeat(20001)])('rejects unsafe/oversized lesson text',text=>{expect(()=>buildCommand({action:'create_lesson',moduleId:key,content:{title:'Lesson',content:text}})).toThrow('validation');});
it('normalizes plain text and rejects unknown identity, price, HTML or publication fields',()=>{
 expect(buildCommand({action:'create_lesson',moduleId:key,content:{title:'  Lesson  ',content:'Line 1\r\nLine 2'}})).toMatchObject({content:{title:'Lesson',summary:'',content:'Line 1\nLine 2'}});
 for(const field of ['userId','projectId','approvedSubmissionId','price','published'])expect(()=>buildCommand({action:'create_module',content:{title:'Module'},[field]:owner})).toThrow('validation');expect(()=>startCommand({approvedSubmissionId:key,ownerId:owner})).toThrow('validation');
 for(const expectedVersion of [0,-1,1.2,'1',2_147_483_647])expect(()=>buildCommand({action:'delete_module',moduleId:key,expectedVersion})).toThrow('validation');
 expect(()=>buildCommand({action:'move_module',moduleId:key,expectedVersion:1,direction:'sideways'})).toThrow('validation');expect(()=>buildCommand({action:'update_lesson',moduleId:key,lessonId:other,expectedVersion:1,content:{title:'ok',summary:'x'.repeat(1001)}})).toThrow('validation');
});
it('anonymous fails before service; cross-origin writes fail before authentication',async()=>{
 mocks.user.mockResolvedValue(null);expect((await builderHttp(request(),draftId)).status).toBe(401);expect(mocks.read).not.toHaveBeenCalled();vi.clearAllMocks();expect((await builderHttp(request('POST','{}',{origin:'https://attacker.invalid'}),draftId)).status).toBe(403);expect(mocks.user).not.toHaveBeenCalled();
});
it('start and mutations use persisted user, private no-store responses and idempotent status',async()=>{
 const response=await builderHttp(request('POST',JSON.stringify({approvedSubmissionId:key})),draftId);expect(response.status).toBe(201);expect(response.headers.get('cache-control')).toBe('no-store');expect(mocks.start).toHaveBeenCalledWith(owner,draftId,{approvedSubmissionId:key});mocks.start.mockResolvedValue({created:false,project:{id:key}});expect((await builderHttp(request('POST','{}'),draftId)).status).toBe(200);
 await builderHttp(request('PATCH','{"action":"create_module","content":{"title":"Module"}}'),draftId);expect(mocks.mutate).toHaveBeenCalledWith(owner,draftId,{action:'create_module',content:{title:'Module'}});
});
it('rejects malformed/over-limit bodies and invalid selected IDs without invoking mutation/read',async()=>{
 expect((await builderHttp(request('PATCH','{'),draftId)).status).toBe(400);expect((await builderHttp(request('PATCH','x'.repeat(BUILDER_BODY_LIMIT+1)),draftId)).status).toBe(413);expect((await builderHttp(request('PATCH','{}',{'Content-Type':'text/plain'}),draftId)).status).toBe(400);expect(mocks.mutate).not.toHaveBeenCalled();
 for(const query of ['?moduleId='+key,'?moduleId='+key+'&lessonId='+other+'&userId='+owner,'?moduleId='+key+'&moduleId='+other+'&lessonId='+other])expect((await builderHttp(request('GET',undefined,{},query),draftId)).status).toBeGreaterThanOrEqual(400);expect(mocks.lesson).not.toHaveBeenCalled();await builderHttp(request('GET',undefined,{},'?moduleId='+key+'&lessonId='+other),draftId);expect(mocks.lesson).toHaveBeenCalledWith(owner,draftId,key,other);
});
it.each([['not_found',404],['forbidden',403],['conflict',409],['not_empty',409]] as const)('%s errors are controlled and do not expose SQL',async(code,status)=>{mocks.mutate.mockRejectedValue(new BuildError(code));const response=await builderHttp(request('PATCH','{}'),draftId);expect(response.status).toBe(status);expect(JSON.stringify(await response.json())).not.toMatch(/password|SQL/);});
it('unknown failures never leak internal details or discard client text',async()=>{mocks.mutate.mockRejectedValue(new Error('SQL private password'));const response=await builderHttp(request('PATCH','{}'),draftId);expect(response.status).toBe(503);const body=await response.json();expect(body.error).toContain('unsaved text is still here');expect(body.error).not.toMatch(/SQL|password/);});
it('admin route is GET only, denies creators/stale session and scopes lesson inspection',async()=>{
 expect(Object.keys(adminRoute)).toEqual(['GET']);mocks.admin.mockResolvedValue(null);expect((await adminBuilderHttp(request(),key)).status).toBe(403);expect(mocks.inspect).not.toHaveBeenCalled();mocks.admin.mockResolvedValue({id:other});mocks.inspect.mockRejectedValue(new BuildError('forbidden'));expect((await adminBuilderHttp(request(),key)).status).toBe(403);await adminBuilderHttp(request('GET',undefined,{},'?moduleId='+key+'&lessonId='+draftId),key);expect(mocks.inspectLesson).toHaveBeenCalledWith(other,key,key,draftId);
});
it('builder telemetry canonicalizes IDs and discards content/prices/owner identity',()=>{
 const paths=['/workspace/courses/'+draftId+'/build','/admin/workspace/course-builds/'+key];const canonical=['/workspace/courses/[id]/build','/admin/workspace/course-builds/[id]'];paths.forEach((path,i)=>{expect(workspaceAnalyticsPath(path)).toBe(canonical[i]);const event=sanitizeWorkspaceAnalytics({event:'$pageview',properties:{$current_url:'https://example.invalid'+path+'?lessonId='+other,$device_id:'synthetic-device',distinct_id:owner,title:'Secret title',moduleId:key,lessonContent:'Private',tentativePrice:250000}} as never)!;expect(event.properties.$current_url).toBe('https://example.invalid'+canonical[i]);const json=JSON.stringify(event);for(const privateValue of [owner,key,other,draftId,'Secret title','Private','250000'])expect(json).not.toContain(privateValue);expect(sanitizeWorkspaceAnalytics({event:'$autocapture',properties:{$current_url:'https://example.invalid'+path}} as never)).toBeNull();});
});
it('new migration preserves old history, FK dependencies and deferred normalized ordering',()=>{
 const migration=readFileSync('drizzle/0017_marvelous_captain_midlands.sql','utf8');expect(migration.indexOf('CREATE UNIQUE INDEX "workspace_submissions_build_owner_idx"')).toBeLessThan(migration.indexOf('ADD CONSTRAINT "workspace_projects_approved_owner_fk"'));expect(migration.indexOf('CREATE UNIQUE INDEX "workspace_modules_owner_idx"')).toBeLessThan(migration.indexOf('ADD CONSTRAINT "workspace_lessons_module_owner_fk"'));expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED');expect(migration).toContain('builder positions must be contiguous');expect(migration).toContain('authoritative owned approval required');expect(migration).toContain('lesson parent is immutable');expect(migration).not.toMatch(/DROP |TRUNCATE |DISABLE TRIGGER|UPDATE workspace_course_submissions|DELETE FROM/);
 const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));expect(journal.entries.at(-2).tag).toBe('0016_tired_prowler');expect(journal.entries.at(-1).tag).toBe('0017_marvelous_captain_midlands');
});

it('browser-safe validation cannot import server payment/access dependencies',()=>{
 for(const path of ['lib/workspace/creator/text.ts','lib/workspace/builder/model.ts'])expect(readFileSync(path,'utf8')).not.toMatch(/from ['"].*(?:activation|payments|repository|lib\/db)|node:crypto/);
});
