import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),execute:vi.fn(),overview:vi.fn(),transactions:vi.fn()}));
vi.mock('@/lib/auth',()=>({getSession:m.session}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:vi.fn()}));
vi.mock('@/lib/creator-payments/settlement',()=>({settlementService:()=>({execute:m.execute})}));
vi.mock('@/lib/creator-payments/reporting',()=>({financeReporting:()=>({overview:m.overview,transactions:m.transactions})}));
import {financeHttp} from '@/lib/creator-payments/http';
const id='00000000-0000-4000-8000-000000000001';
const request=()=>new Request('http://localhost/api/workspace/earnings',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify({action:'save_payee',creatorId:'spoofed',requestKey:id})});
beforeEach(()=>{vi.clearAllMocks();m.execute.mockResolvedValue({id});});
it('requires recent OTP authentication rather than JWT renewal time for bank changes',async()=>{
 for(const authenticatedAt of [undefined,0,Math.floor(Date.now()/1000)+100]){m.session.mockResolvedValue({id,iat:Math.floor(Date.now()/1000),authenticatedAt});expect((await financeHttp(request())).status).toBe(403);}
 expect(m.execute).not.toHaveBeenCalled();m.session.mockResolvedValue({id,authenticatedAt:Math.floor(Date.now()/1000)});expect((await financeHttp(request())).status).toBe(200);expect(m.execute).toHaveBeenCalledWith(id,expect.objectContaining({creatorId:id}));
});
it('returns only a masked current payee and complete summary to Creator API readers',async()=>{
 m.session.mockResolvedValue({id});m.overview.mockResolvedValue({summary:{available:10},payee:{id:'private-id',masked:'Account ••••1234',decision:'verify_payee',createdAt:'2026-11-06'},audit:[{evidence:'private bank evidence'}]});
 const response=await financeHttp(new Request('http://localhost/api/workspace/earnings'));expect(response.status).toBe(200);const body=await response.text();expect(body).toContain('••••1234');expect(body).not.toContain('private');
});
