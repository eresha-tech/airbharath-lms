import { beforeEach,describe,expect,it,vi } from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),read:vi.fn(),mutate:vi.fn(),report:vi.fn(),moderate:vi.fn()}));
vi.mock('@/lib/auth',()=>({getSession:m.session}));
vi.mock('@/lib/reviews/repository',()=>({readReviews:m.read,mutateReview:m.mutate,reportReview:m.report,moderateReview:m.moderate}));
import {reviewHttp} from '@/lib/reviews/http';
const id='00000000-0000-4000-8000-000000000001';
function req(body:unknown={},origin?:string){return new Request('http://localhost/reviews',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)});}
describe('learner feedback HTTP',()=>{
 beforeEach(()=>{m.session.mockResolvedValue({id:'current-actor'});m.mutate.mockResolvedValue({success:true});});
 it('rejects cross site, invalid UUID and anonymous requests',async()=>{expect((await reviewHttp(req({},'https://attacker.invalid'),id)).status).toBe(403);expect((await reviewHttp(req(),'bad')).status).toBe(400);m.session.mockResolvedValue(null);expect((await reviewHttp(req(),id)).status).toBe(401);expect(m.mutate).not.toHaveBeenCalled();});
 it('binds actor to session and never accepts client owner identity',async()=>{const response=await reviewHttp(req({userId:'forged'}),id);expect(response.headers.get('cache-control')).toBe('no-store');expect(m.mutate).toHaveBeenCalledWith('current-actor',id,{userId:'forged'},false);});
 it('limits request body size',async()=>{expect((await reviewHttp(req({content:'x'.repeat(9000)}),id)).status).toBe(400);expect(m.mutate).not.toHaveBeenCalled();});
 it('redacts unexpected database errors',async()=>{m.mutate.mockRejectedValue(Error('synthetic private SQL'));const r=await reviewHttp(req(),id);expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('private SQL');});
});
