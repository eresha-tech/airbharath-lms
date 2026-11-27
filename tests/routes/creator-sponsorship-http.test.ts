import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({user:vi.fn(),admin:vi.fn(),query:vi.fn()}));
vi.mock('@/lib/auth',()=>({getSession:m.user}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:m.admin}));
vi.mock('@/lib/db',()=>({db:{execute:m.query}}));
import {sponsorshipHttp} from '@/lib/workspace/sponsorship/http';
const origin='http://localhost:3000',owner='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('CREATOR_SPONSORSHIP_SYNTHETIC','false');m.user.mockResolvedValue({id:owner,role:'student'});m.admin.mockResolvedValue(null);});
const request=(body:unknown)=>new Request(origin+'/api/workspace/sponsorships',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
it('requires authentication and independently authorized Admin access',async()=>{
 m.user.mockResolvedValue(null);expect((await sponsorshipHttp(new Request(origin+'/api/workspace/sponsorships'))).status).toBe(401);expect((await sponsorshipHttp(request({action:'create'}),true)).status).toBe(401);expect(m.query).not.toHaveBeenCalled();
});
it('does not let Creator requests choose Admin actions or bypass same-origin protection',async()=>{
 expect((await sponsorshipHttp(request({action:'create'}))).status).toBe(403);
 const cross=new Request(origin+'/api/workspace/sponsorships',{method:'POST',headers:{origin:'https://other.invalid','Content-Type':'application/json'},body:'{}'});expect((await sponsorshipHttp(cross)).status).toBe(403);expect(m.query).not.toHaveBeenCalled();
});
it('real offer acceptance is disabled before database or provider access and responses are private',async()=>{
 const response=await sponsorshipHttp(request({action:'accept',offerId:owner,requestKey:owner,acknowledged:true}));expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');expect(m.query).not.toHaveBeenCalled();
 const get=await sponsorshipHttp(new Request(origin+'/api/workspace/sponsorships'));expect(await get.json()).toEqual({available:false,financialActivation:false,offers:[]});expect(m.query).not.toHaveBeenCalled();
});
