import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({user:vi.fn(),admin:vi.fn(),execute:vi.fn(),read:vi.fn(),list:vi.fn(),mark:vi.fn()}));
vi.mock('@/lib/workspace/eligibility/service',()=>({getWorkspaceUser:mocks.user}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:mocks.admin}));
vi.mock('@/lib/workspace/operations/support',()=>({supportRepository:()=>mocks}));
vi.mock('@/lib/workspace/operations/notifications',()=>({notificationRepository:()=>mocks}));
import {supportHttp,notificationHttp} from '@/lib/workspace/operations/http';
const origin='http://localhost:3028',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const request=(headers:Record<string,string>={},body:unknown={})=>new Request(origin+'/api/workspace/support',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv('WORKSPACE_OPERATIONS_ENABLED','true');mocks.user.mockResolvedValue({id,role:'student'});mocks.admin.mockResolvedValue(null);mocks.execute.mockResolvedValue({id,version:1});});
it('refuses disabled surfaces before looking up private account information',async()=>{vi.stubEnv('WORKSPACE_OPERATIONS_ENABLED','false');expect((await supportHttp(request())).status).toBe(503);expect(mocks.execute).not.toHaveBeenCalled();});
it('requires same-origin JSON and denies cross-site or missing-origin mutations',async()=>{for(const r of [request({origin:'https://other.invalid'}),request({'sec-fetch-site':'cross-site'}),new Request(origin+'/api/workspace/support',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})])expect((await supportHttp(r)).status).toBe(403);expect(mocks.execute).not.toHaveBeenCalled();});
it('requires persisted Admin authorization on staff routes',async()=>{expect((await supportHttp(request(),id,true)).status).toBe(403);expect(mocks.execute).not.toHaveBeenCalled();});
it('uses the persisted requester identity and preserves no-store JSON responses',async()=>{const r=await supportHttp(request());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(mocks.execute).toHaveBeenCalledWith(id,null,{},false);});
it('reports invalid or oversized JSON as a validation error',async()=>{const r=new Request(origin+'/api/workspace/support',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{' });expect((await supportHttp(r)).status).toBe(400);expect((await supportHttp(request({}, {body:'x'.repeat(30000)}))).status).toBe(400);});
it('does not expose internal provider/database exceptions',async()=>{mocks.execute.mockRejectedValueOnce(new Error('secret_provider_payload'));const r=await supportHttp(request());expect(r.status).toBe(503);expect(await r.text()).not.toContain('secret_provider_payload');});
it('marks only the persisted users notification and validates the action body',async()=>{mocks.mark.mockResolvedValue({read:true});expect((await notificationHttp(request({}, {key:'support:'+id}))).status).toBe(200);expect(mocks.mark).toHaveBeenCalledWith(id,'support:'+id);expect((await notificationHttp(request({}, {key:'support:'+id,ownerId:'forged'}))).status).toBe(400);});

it('accepts a full-length Unicode description within the explicit JSON byte budget',async()=>{expect((await supportHttp(request({}, {body:'अ'.repeat(4000)}))).status).toBe(200);});
