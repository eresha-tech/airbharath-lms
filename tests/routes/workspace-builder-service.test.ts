import { beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { builderService, type BuildStore, type Project, type CourseModule, type Lesson, type ApprovedSource } from '@/lib/workspace/builder/service';
import type { CreatorContext } from '@/lib/workspace/creator/service';
import { content, evidence, now, owner, other, draftId, profileId, key } from './workspace-creator-fixtures';
let source: ApprovedSource; let projects: Project[]; let modules: CourseModule[]; let lessons: Lesson[]; let store: BuildStore; let context: CreatorContext; let clock: Date; let failBootstrap: boolean;
const copy = <T>(v: T): T => structuredClone(v);
beforeEach(() => {
  source = { ...copy(content), id: key, userId: owner, creatorProfileId: profileId, draftId, currency: 'INR', version: 3, reviewStatus: 'approved', draftVersion: 1, submissionNumber: 1, contentHash: 'a'.repeat(64), requestKey: randomUUID(), commandHash: 'b'.repeat(64), createdAt: now, updatedAt: now, submittedAt: now, reviewStartedAt: now, reviewCompletedAt: now, approvalExists: true };
  projects = []; modules = []; lessons = []; clock = now; failBootstrap = false;
  context = { user: { id: owner, fullName: 'Synthetic Creator' }, profileId, evidence: copy(evidence), financialReview: false, planName: 'Quarterly' };
  let tail = Promise.resolve();
  store = { transaction: (userId, work) => {
    const result = tail.then(async () => {
      const before = copy({ projects, modules, lessons });
      const ms = (p: Project) => modules.filter(m => m.projectId === p.id && m.userId === userId).sort((a,b) => a.position-b.position);
      const ls = (p: Project) => lessons.filter(l => l.projectId === p.id && l.userId === userId).sort((a,b) => a.position-b.position);
      try { return await work({
        context: async () => ({ ...context, user: { ...context.user, id: userId }, profileId: userId === owner ? context.profileId : other }),
        source: async (id, draft) => id === source.id && draft === source.draftId && source.userId === userId ? copy(source) : null,
        project: async draft => copy(projects.find(p => p.userId === userId && p.draftId === draft) || null),
        existing: async id => copy(projects.find(p => p.userId === userId && p.approvedSubmissionId === id) || null),
        createProject: async (s, at) => { const p: Project = { id: randomUUID(), userId, creatorProfileId: s.creatorProfileId, draftId: s.draftId, approvedSubmissionId: s.id, status: 'building', version: 1, createdAt: at, updatedAt: at }; projects.push(p); return copy(p); },
        modules: async p => copy(ms(p)), lessons: async p => copy(ls(p).map(({ content: _content, ...row }) => row)),
        module: async (p,id) => copy(ms(p).find(m => m.id === id) || null), lesson: async (p,m,id) => copy(ls(p).find(l => l.moduleId === m && l.id === id) || null),
        createModule: async (p,c,position,at) => { if (failBootstrap && position === 1) throw new Error('bootstrap failure'); const m = { ...c, id: randomUUID(), projectId: p.id, userId, position, version: 1, createdAt: at, updatedAt: at }; modules.push(m); return copy(m); },
        createLesson: async (p,m,c,position,at) => { const l = { ...c, id: randomUUID(), projectId: p.id, moduleId: m.id, userId, position, version: 1, createdAt: at, updatedAt: at }; lessons.push(l); return copy(l); },
        updateModule: async (p,id,v,c,at) => { const m=ms(p).find(m => m.id===id && m.version===v); if(!m)return null; Object.assign(m,c,{version:v+1,updatedAt:at}); return copy(m); },
        updateLesson: async (p,m,id,v,c,at) => { const l=ls(p).find(l=>l.id===id&&l.moduleId===m&&l.version===v); if(!l)return null; Object.assign(l,c,{version:v+1,updatedAt:at}); return copy(l); },
        deleteModule: async (p,id,v) => { const m=ms(p).find(m=>m.id===id&&m.version===v); if(!m)return false; modules=modules.filter(row=>row!==m);return true; },
        deleteLesson: async (p,m,id,v) => { const l=ls(p).find(l=>l.id===id&&l.moduleId===m&&l.version===v);if(!l)return false;lessons=lessons.filter(row=>row!==l);return true; },
        positions: async (p,kind,rows,at) => { rows.forEach((row,position)=>{if(row.position===position)return;const target=(kind==='module'?ms(p):ls(p)).find(t=>t.id===row.id&&t.version===row.version)!;Object.assign(target,{position,version:row.version+1,updatedAt:at});}); },
      }); } catch(error) { projects=before.projects;modules=before.modules;lessons=before.lessons;throw error; }
    }); tail=result.then(()=>undefined,()=>undefined);return result;
  } };
});
const service=()=>builderService(store,'test',()=>clock);
const start=()=>service().start(owner,draftId,{approvedSubmissionId:key});
const mutate=(raw: unknown,user=owner,draft=draftId)=>service().mutate(user,draft,raw);
const addModule=(title='Second module')=>mutate({action:'create_module',content:{title}});
const addLesson=(moduleId=modules[0].id,title='First lesson')=>mutate({action:'create_lesson',moduleId,content:{title,summary:'Lesson plan',content:'Private plain text lesson.\nSecond paragraph.'}});
it('uses only approved source, bootstraps once and concurrent retry converges to one project',async()=>{
 const original=copy(source); const result=await Promise.all([start(),start(),start()]);expect(new Set(result.map(r=>r.project.id)).size).toBe(1);expect(result.map(r=>r.created)).toEqual([true,false,false]);expect(projects).toHaveLength(1);expect(modules).toHaveLength(1);expect(modules[0]).toMatchObject({title:source.outline[0].title,description:source.outline[0].description,position:0,version:1});expect(lessons).toEqual([]);expect(source).toEqual(original);
 const tree=await service().read(owner,draftId);expect(tree.source.title).toBe(original.title);expect(tree.project).not.toHaveProperty('userId');expect(tree.modules[0]).not.toHaveProperty('userId');
});
it('outline failure rolls back project and first module; retry creates the complete outline',async()=>{
 source.outline.push({title:'Second approved module',description:'Outline only',ordering:1});failBootstrap=true;await expect(start()).rejects.toThrow('bootstrap failure');expect(projects).toEqual([]);expect(modules).toEqual([]);failBootstrap=false;await start();expect(modules.map(m=>m.position)).toEqual([0,1]);
});
it.each(['submitted','under_review','changes_requested'] as const)('rejects %s source',async status=>{source.reviewStatus=status;await expect(start()).rejects.toMatchObject({code:'not_approved'});expect(projects).toEqual([]);});
it('rejects approval without event, another creator/profile/draft and client ownership fields',async()=>{
 source.approvalExists=false;await expect(start()).rejects.toMatchObject({code:'not_approved'});source.approvalExists=true;await expect(service().start(other,draftId,{approvedSubmissionId:key})).rejects.toMatchObject({code:'not_found'});await expect(service().start(owner,other,{approvedSubmissionId:key})).rejects.toMatchObject({code:'not_found'});context.profileId=other;await expect(start()).rejects.toMatchObject({code:'not_found'});
 expect(()=>service().start(owner,draftId,{approvedSubmissionId:key,userId:owner})).toThrow('validation');expect(projects).toEqual([]);
});
it('independent module and lesson edits persist; stale writes never overwrite',async()=>{
 await start();await addModule();await addLesson();const m=modules[0],l=lessons[0];await mutate({action:'update_module',moduleId:m.id,expectedVersion:1,content:{title:'Updated scope'}});await mutate({action:'update_lesson',moduleId:m.id,lessonId:l.id,expectedVersion:1,content:{title:'Saved lesson',content:'New private text'}});
 await expect(mutate({action:'update_lesson',moduleId:m.id,lessonId:l.id,expectedVersion:1,content:{title:'Stale lesson',content:'Lost text'}})).rejects.toMatchObject({code:'conflict'});expect((await service().lesson(owner,draftId,m.id,l.id)).content).toBe('New private text');expect(projects[0].version).toBe(1);expect((await service().read(owner,draftId)).lessons[0]).not.toHaveProperty('content');
});
it('concurrent creates append modules and lessons at contiguous unique positions',async()=>{await start();await Promise.all([addModule('Another module'),addModule('Third module')]);expect(modules.map(m=>m.position)).toEqual([0,1,2]);await Promise.all([addLesson(),addLesson()]);expect(lessons.map(l=>l.position)).toEqual([0,1]);});
it.each(['module','lesson'] as const)('two same-%s saves have one winner',async kind=>{await start();if(kind==='lesson')await addLesson();const base=kind==='module'?{action:'update_module',moduleId:modules[0].id,expectedVersion:1}:{action:'update_lesson',moduleId:modules[0].id,lessonId:lessons[0].id,expectedVersion:1};const result=await Promise.allSettled([mutate({...base,content:{title:'First saved text'}}),mutate({...base,content:{title:'Second stale text'}})]);expect(result.map(r=>r.status)).toEqual(['fulfilled','rejected']);expect((kind==='module'?modules[0]:lessons[0]).title).toBe('First saved text');});
it.each(['module','lesson'] as const)('two concurrent %s moves conflict safely and retain contiguous order',async kind=>{
 await start();await addModule();if(kind==='lesson'){await addLesson();await addLesson();}const row=kind==='module'?modules[0]:lessons[0];const command=kind==='module'?{action:'move_module',moduleId:row.id,expectedVersion:1,direction:'down'}:{action:'move_lesson',moduleId:modules[0].id,lessonId:row.id,expectedVersion:1,direction:'down'};
 const results=await Promise.allSettled([mutate(command),mutate(command)]);expect(results.map(r=>r.status)).toEqual(['fulfilled','rejected']);const rows=kind==='module'?modules:lessons;expect(rows.toSorted((a,b)=>a.position-b.position).map(r=>r.position)).toEqual([0,1]);expect(rows.find(r=>r.id===row.id)?.position).toBe(1);expect(rows.map(r=>r.version)).toEqual([2,2]);
 const current=rows.find(r=>r.id===row.id)!;await mutate({...command,expectedVersion:current.version,direction:'up'});expect((kind==='module'?modules:lessons).find(r=>r.id===row.id)?.position).toBe(0);
});
it('refuses nonempty module deletion; lesson deletion and empty module deletion normalize positions',async()=>{
 await start();await addModule();await addLesson();await addLesson();await expect(mutate({action:'delete_module',moduleId:modules[0].id,expectedVersion:1})).rejects.toMatchObject({code:'not_empty'});
 await mutate({action:'delete_lesson',moduleId:modules[0].id,lessonId:lessons[0].id,expectedVersion:1});expect(lessons[0].position).toBe(0);expect(lessons[0].version).toBe(2);await mutate({action:'delete_lesson',moduleId:modules[0].id,lessonId:lessons[0].id,expectedVersion:2});await mutate({action:'delete_module',moduleId:modules[0].id,expectedVersion:1});expect(modules).toHaveLength(1);expect(modules[0]).toMatchObject({position:0,version:2});
});
it('wrong owner, draft, module and lesson IDs never enumerate or mutate',async()=>{
 await start();await addModule();await addLesson();await expect(service().read(other,draftId)).rejects.toMatchObject({code:'not_found'});await expect(service().lesson(owner,draftId,modules[1].id,lessons[0].id)).rejects.toMatchObject({code:'not_found'});await expect(service().lesson(owner,other,modules[0].id,lessons[0].id)).rejects.toMatchObject({code:'not_found'});await expect(mutate({action:'create_lesson',moduleId:other,content:{title:'Wrong module'}})).rejects.toMatchObject({code:'not_found'});await expect(mutate({action:'delete_module',moduleId:modules[0].id,expectedVersion:1},other)).rejects.toMatchObject({code:'not_found'});expect(lessons).toHaveLength(1);
});
it.each(['expired','suspended','terminated','held','pending','unpaid'])('%s retains content and denies writes',async state=>{
 await start();await addLesson();const before=copy({projects,modules,lessons});if(state==='expired')clock=evidence.membership.endsAt;else if(state==='suspended'||state==='terminated')context.evidence!.profileStatus=state;else if(state==='held')context.financialReview=true;else if(state==='pending')context.evidence!.activationState='pending_activation';else context.evidence=null;
 await expect(addModule()).rejects.toMatchObject({code:'forbidden'});await expect(start()).rejects.toMatchObject({code:'forbidden'});if(state==='expired'){const tree=await service().read(owner,draftId);expect(tree.canEdit).toBe(false);expect((await service().lesson(owner,draftId,modules[0].id,lessons[0].id)).content).toContain('Private');}else await expect(service().read(owner,draftId)).rejects.toMatchObject({code:'forbidden'});expect({projects,modules,lessons}).toEqual(before);
});
it('active permits edits; production refuses noncommercial Test entitlement',async()=>{clock=evidence.membership.startsAt;await start();await addLesson();expect((await service().read(owner,draftId)).canEdit).toBe(true);await expect(builderService(store,'production',()=>clock).read(owner,draftId)).rejects.toMatchObject({code:'forbidden'});});
it('rechecks membership expiry after source/project locks',async()=>{
 const original=store.transaction;store.transaction=(id,work)=>original(id,tx=>work({...tx,source:async(id,draft)=>{const row=await tx.source(id,draft);clock=evidence.membership.endsAt;return row;}}));await expect(start()).rejects.toMatchObject({code:'forbidden'});expect(projects).toEqual([]);
});
it('substantial builder mutations never change approved snapshot/hash or approval evidence',async()=>{
 const approvalEvent={id:randomUUID(),action:'approved',createdAt:now};const before=copy({source,approvalEvent});await start();await addModule();await addLesson();await mutate({action:'update_lesson',moduleId:modules[0].id,lessonId:lessons[0].id,expectedVersion:1,content:{title:'Expanded full course lesson',content:'Authoring does not revise the approved course.'}});expect({source,approvalEvent}).toEqual(before);
});
it('bounds structural growth and invalid edits commit no change',async()=>{
 await start();const template=modules[0];modules=Array.from({length:50},(_,i)=>({...template,id:randomUUID(),position:i}));await expect(addModule()).rejects.toMatchObject({code:'limit'});await addLesson();const lesson=lessons[0];lessons=Array.from({length:100},(_,i)=>({...lesson,id:randomUUID(),position:i}));await expect(addLesson()).rejects.toMatchObject({code:'limit'});expect(()=>mutate({action:'create_lesson',moduleId:template.id,content:{title:'Valid title',content:'x'.repeat(20001)}})).toThrow('validation');
});

it('two unrelated lesson edits succeed without a shared project version conflict',async()=>{
 await start();await addLesson();await addLesson();await Promise.all(lessons.map(row=>mutate({action:'update_lesson',moduleId:row.moduleId,lessonId:row.id,expectedVersion:1,content:{title:'Independently saved lesson',content:'Saved independently'}})));expect(lessons.map(row=>row.version)).toEqual([2,2]);expect(projects[0].version).toBe(1);
});
it('rechecks expiry while waiting on an item before mutation',async()=>{
 await start();const original=store.transaction;store.transaction=(id,work)=>original(id,tx=>work({...tx,module:async(p,id)=>{const row=await tx.module(p,id);clock=evidence.membership.endsAt;return row;}}));await expect(mutate({action:'update_module',moduleId:modules[0].id,expectedVersion:1,content:{title:'Denied expired save'}})).rejects.toMatchObject({code:'forbidden'});expect(modules[0].title).toBe(content.outline[0].title);
});
