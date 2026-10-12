import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import type { CaptureResult } from 'posthog-js';
import { sanitizeWorkspaceAnalytics, workspaceAnalyticsPath } from '@/lib/workspace/analytics-privacy';
import { snapshot } from '@/lib/workspace/review/snapshot';
import { submitCommand, adminCommand } from '@/lib/workspace/review/model';
import { content, key, owner, draftId } from './workspace-creator-fixtures';
import type { Draft } from '@/lib/workspace/creator/service';
const migration=readdirSync('drizzle').find(name=>/^0015_.*\.sql$/.test(name))!;
const sql=readFileSync('drizzle/'+migration,'utf8');
it('additive migration has snapshot/event guards, ownership, numbering and open uniqueness, ordered FK prerequisites',()=>{
 expect(sql).toContain('workspace_submissions_draft_owner_fk');expect(sql).toContain('FOREIGN KEY ("draft_id","user_id","creator_profile_id")');expect(sql).toContain('workspace_submissions_number_idx');expect(sql).toMatch(/workspace_submissions_open_idx[\s\S]*?WHERE[^;]*submitted[^;]*under_review/);
 expect(sql.indexOf('CREATE UNIQUE INDEX "workspace_drafts_composite_owner_idx"')).toBeLessThan(sql.indexOf('ADD CONSTRAINT "workspace_submissions_draft_owner_fk"'));
 for(const text of ['Workspace submissions must be retained','to_jsonb(NEW) - ARRAY','Workspace review events are append-only','Persisted admin required','workspace_drafts_review_lock','DEFERRABLE INITIALLY DEFERRED','Workspace transition lacks its audit event','Workspace event lacks its lifecycle transition','Invalid Workspace submission source or sequence']) expect(sql).toContain(text);
 expect(sql).toContain('NEW.version <> OLD.version + 1');expect(sql).toContain("prior.review_status <> 'changes_requested'");expect(sql).toContain('NEW.content_hash = prior.content_hash');expect(sql).not.toMatch(/(?:INSERT INTO|ALTER TABLE|UPDATE|DELETE FROM)\s+"?(?:courses|course_authors|enrollments|orders|certificates)"?\b/i);
});
it('review implementation writes no LMS/financial tables, performs no external calls and exposes no snapshot-update method',()=>{
 const source=['model','snapshot','transaction','repository','service','http'].map(name=>readFileSync('lib/workspace/review/'+name+'.ts','utf8')).join('\n');expect(source).not.toMatch(/fetch\(|axios|razorpay|insert\(courses\)|insert\(courseAuthors\)|insert\(enrollments\)|workspaceMembershipOrders|sendEmail/);
 expect(readFileSync('lib/workspace/review/repository.ts','utf8')).toContain('version: prior.version + 1');expect(readFileSync('lib/workspace/creator/service.ts','utf8')).toContain('tx.reviews.latest(id)');
});
it('hash covers every reviewed content field and INR but excludes mutable metadata',()=>{
 const base={...content,currency:'INR'} as Draft;const hash=snapshot(base).contentHash;expect(snapshot({...base,id:owner,version:100,updatedAt:new Date()}).contentHash).toBe(hash);
 for(const patch of [{title:'A different saved title'},{category:'aviation_safety'},{description:content.description+' More detail.'},{targetLearner:'Other audience'},{learningOutcomes:['Another outcome']},{outline:[]},{tentativePricePaise:100}])expect(snapshot({...base,...patch} as Draft).contentHash).not.toBe(hash);
 expect(()=>snapshot({...base,currency:'USD'})).toThrow('validation');
});
it('strict commands reject extra identity/content/lifecycle fields and bound normalized plain text',()=>{
 for(const patch of [{content},{userId:owner},{reviewStatus:'approved'},{draftId}])expect(()=>submitCommand({expectedDraftVersion:1,requestKey:key,...patch})).toThrow('validation');
 for(const expectedDraftVersion of [0,-1,1.2,2147483647])expect(()=>submitCommand({expectedDraftVersion,requestKey:key})).toThrow('validation');
 expect(adminCommand({action:'request_changes',expectedStatus:'under_review',requestKey:key,feedback:'  Please clarify this.\r\nThank you.  '}).feedback).toBe('Please clarify this.\nThank you.');
 for(const note of ['x'.repeat(1001),'<b>approved</b>','bad\u0000note'])expect(()=>adminCommand({action:'approve',expectedStatus:'under_review',requestKey:key,note})).toThrow('validation');expect(adminCommand({action:'approve',expectedStatus:'under_review',requestKey:key}).note).toBeNull();
});
it.each(['/admin/workspace/course-reviews','/admin/workspace/course-reviews/'+key])('review path %s sanitizes identifiers/content and suppresses capture',pathname=>{
 const event={uuid:'event',event:'$pageview',timestamp:new Date(),properties:{$current_url:'https://example.test'+pathname+'?feedback=private#title',pathname,$device_id:'synthetic_device_01',distinct_id:owner,submissionId:key,draftId,feedback:'private',note:'private',title:'private',description:'private',outline:[],tentativePricePaise:100}} as CaptureResult;
 const safe=sanitizeWorkspaceAnalytics(event)!;expect(safe.properties.$current_url).toBe('https://example.test'+workspaceAnalyticsPath(pathname));for(const value of [key,owner,draftId,'private'])expect(JSON.stringify(safe)).not.toContain(value);expect(sanitizeWorkspaceAnalytics({...event,event:'$autocapture'})).toBeNull();expect(sanitizeWorkspaceAnalytics({...event,event:'workspace_course_review_approved'})).toBeNull();
});
it('private review pages are noindex and have capture protection; public payments remain fail-closed',()=>{
 for(const path of ['app/(admin)/admin/workspace/course-reviews/page.tsx','app/(admin)/admin/workspace/course-reviews/[id]/page.tsx']){const source=readFileSync(path,'utf8');expect(source).toContain('index: false, follow: false');expect(source).toContain('ph-no-capture');}
 expect(readFileSync('app/(user)/workspace/(creator)/layout.tsx','utf8')).toContain('index: false');
 const config=readFileSync('lib/workspace/payments/configuration-core.mjs','utf8');expect(config).toContain('WORKSPACE_PAYMENT_ENABLED');
});

it('0015 snapshot changes only private review tables and the justified draft composite index; 0014 stays byte-identical', () => {
 const before=JSON.parse(readFileSync('drizzle/meta/0014_snapshot.json','utf8')), after=JSON.parse(readFileSync('drizzle/meta/0015_snapshot.json','utf8'));
 expect(after.prevId).toBe(before.id); expect(Object.keys(after.tables).filter(name=>!before.tables[name]).sort()).toEqual(['public.workspace_course_review_events','public.workspace_course_submissions']);
 for(const [name,table] of Object.entries(before.tables)){
  if(name==='public.workspace_course_drafts') { const copy=structuredClone(after.tables[name]);delete copy.indexes.workspace_drafts_composite_owner_idx;expect(copy).toEqual(table); }
  else expect(after.tables[name]).toEqual(table);
 }
 expect(after.enums).toEqual(before.enums);expect(createHash('sha256').update(readFileSync('drizzle/0014_outgoing_freak.sql')).digest('hex')).toBe('286e94347d50db660ce6bcae06c1e1b6eb0baed316b2f3d9d8aedd9af04d6598');
});
