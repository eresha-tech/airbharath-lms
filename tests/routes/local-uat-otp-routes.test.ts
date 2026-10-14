import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({identity:vi.fn(),selectRole:vi.fn(),findUser:vi.fn(),insertUser:vi.fn(),values:vi.fn(),cookie:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{execute:mocks.identity,select:()=>({from:()=>({where:()=>({limit:mocks.selectRole})})}),query:{users:{findFirst:mocks.findUser}},insert:mocks.insertUser}}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>undefined,set:mocks.cookie})}));
import { POST as send } from '@/app/api/auth/send-otp/route';
import { POST as verify } from '@/app/api/auth/verify-otp/route';
import { verifySessionToken } from '@/lib/auth';
import { LOCAL_UAT_PHONES } from '@/lib/local-uat-otp';
const request=(route:string,body:unknown)=>new Request('http://localhost:3000/api/auth/'+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.stubEnv('NODE_ENV','development');vi.stubEnv('DATABASE_ENV','development');vi.stubEnv('DATABASE_URL','postgresql://synthetic:synthetic@localhost:5433/airbharath_lms');vi.stubEnv('WORKSPACE_LOCAL_UAT_OTP_ENABLED','true');vi.stubEnv('JWT_SECRET','synthetic-local-session-key-not-a-credential');
 delete (globalThis as typeof globalThis & {airbharathLocalUatOtp?:unknown}).airbharathLocalUatOtp;
 mocks.identity.mockResolvedValue([{database:'airbharath_lms',oid:'16384',system_identifier:'7680462735222304705',address:'127.0.0.1',port:'5433'}]);mocks.selectRole.mockResolvedValue([]);mocks.findUser.mockResolvedValue(null);
 mocks.insertUser.mockReturnValue({values:mocks.values});mocks.values.mockImplementation(value=>({returning:async()=>[{id:'00000000-0000-4000-8000-000000000123',...value,fullName:'',email:null}]}));
});
it.each(LOCAL_UAT_PHONES)('uses normal account creation and signed student-session issuance for %s, with no provider fetch',async phone=>{
 expect((await send(request('send-otp',{phone}))).status).toBe(200);const response=await verify(request('verify-otp',{phone,otp:'1234'}));expect(response.status).toBe(200);expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({phone,role:'student'}));expect(mocks.cookie).toHaveBeenCalledTimes(1);const session=await verifySessionToken(mocks.cookie.mock.calls[0][1]);expect(session?.role).toBe('student');expect(fetch).not.toHaveBeenCalled();
});
it('refuses fourth number, old Admin number, invalid Indian mobile and verify without issue',async()=>{
 for(const phone of ['9123456781','9876543210']){expect((await send(request('send-otp',{phone}))).status).toBe(503);expect((await verify(request('verify-otp',{phone,otp:'1234'}))).status).toBe(503);}
 expect((await send(request('send-otp',{phone:'1234567890'}))).status).toBe(400);expect((await verify(request('verify-otp',{phone:'1234567890',otp:'1234'}))).status).toBe(400);
 expect((await verify(request('verify-otp',{phone:'9876543211',otp:'1234'}))).status).toBe(400);expect(mocks.insertUser).not.toHaveBeenCalled();expect(mocks.cookie).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
it.each([{NODE_ENV:'production'},{DATABASE_ENV:'production'},{DATABASE_ENV:'staging'},{VERCEL:'1'}])('refuses misplaced mock activation in %j without real-provider fallback',async changes=>{
 for(const [key,value] of Object.entries(changes))vi.stubEnv(key,value);
 expect((await send(request('send-otp',{phone:'9876543211'}))).status).toBe(503);expect((await verify(request('verify-otp',{phone:'9876543211',otp:'1234'}))).status).toBe(503);expect(mocks.identity).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
it('requires matching live local database identity and refuses existing privileged users',async()=>{
 mocks.identity.mockResolvedValueOnce([{database:'airbharath_lms',oid:'999',system_identifier:'wrong',address:'127.0.0.1',port:'5433'}]);expect((await send(request('send-otp',{phone:'9876543211'}))).status).toBe(503);
 mocks.selectRole.mockResolvedValue([{role:'admin'}]);expect((await send(request('send-otp',{phone:'9876543211'}))).status).toBe(503);expect(mocks.cookie).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
it('applies rate limits, wrong-code failure and replay denial through normal routes',async()=>{
 const phone='9876543211';expect((await send(request('send-otp',{phone}))).status).toBe(200);expect((await send(request('send-otp',{phone}))).status).toBe(429);
 expect((await verify(request('verify-otp',{phone,otp:'0000'}))).status).toBe(400);expect((await verify(request('verify-otp',{phone,otp:'1234'}))).status).toBe(200);expect((await verify(request('verify-otp',{phone,otp:'1234'}))).status).toBe(400);expect(fetch).not.toHaveBeenCalled();
});
it('refuses session issuance if the persisted role becomes privileged after the local provider check',async()=>{
 const phone='9876543211';expect((await send(request('send-otp',{phone}))).status).toBe(200);
 mocks.findUser.mockResolvedValue({id:'00000000-0000-4000-8000-000000000123',phone:'919876543211',role:'admin'});
 expect((await verify(request('verify-otp',{phone,otp:'1234'}))).status).toBe(400);
 expect(mocks.cookie).not.toHaveBeenCalled();expect(mocks.insertUser).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
