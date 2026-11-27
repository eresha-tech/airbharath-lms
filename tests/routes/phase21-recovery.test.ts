import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),recover:vi.fn(),effects:vi.fn()}));
vi.mock('@/lib/auth',()=>({getSession:m.session}));
vi.mock('@/lib/commerce/service',()=>({commerceService:()=>({recover:m.recover})}));
vi.mock('@/lib/commerce/effects',()=>({recordCoursePurchase:m.effects}));
import {POST} from '@/app/api/payments/razorpay/recover/route';
import {CommerceError} from '@/lib/commerce/model';
const request=(body:unknown={orderId:'order_synthetic_123'},origin?:string)=>new Request('http://localhost/api/payments/razorpay/recover',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)});
describe('owned server-evidence payment recovery',()=>{
 beforeEach(()=>{m.session.mockResolvedValue({id:'synthetic-owner'});m.recover.mockResolvedValue({success:false});m.effects.mockResolvedValue(undefined);});
 it('requires authentication and rejects cross-origin writes',async()=>{m.session.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);expect((await POST(request({},'https://attacker.invalid'))).status).toBe(403);expect(m.recover).not.toHaveBeenCalled();});
 it('rejects client-selected malformed payment identities',async()=>{expect((await POST(request({paymentId:'forged'}))).status).toBe(400);expect(m.recover).not.toHaveBeenCalled();});
 it('binds recovery to the session and returns no internal order data',async()=>{m.recover.mockResolvedValue({success:true,alreadyVerified:false,order:{id:'internal',creatorId:'private-creator'}});const response=await POST(request());expect(response.status).toBe(200);expect(m.recover).toHaveBeenCalledWith('synthetic-owner','order_synthetic_123');expect(await response.json()).toEqual({success:true,alreadyVerified:false});expect(m.effects).toHaveBeenCalledTimes(1);});
 it('does not grant access or run effects for uncertain evidence',async()=>{const response=await POST(request());expect(await response.json()).toEqual({success:false,alreadyVerified:false});expect(m.effects).not.toHaveBeenCalled();});
 it('does not repeat post-commit effects on replay',async()=>{m.recover.mockResolvedValue({success:true,alreadyVerified:true});expect((await POST(request())).status).toBe(200);expect(m.effects).not.toHaveBeenCalled();});
 it('preserves ownership denial',async()=>{m.recover.mockRejectedValue(new CommerceError(403,'Forbidden'));expect((await POST(request())).status).toBe(403);expect(m.effects).not.toHaveBeenCalled();});
});
