import { createHmac, randomUUID } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({runtime:vi.fn(),user:vi.fn(),accept:vi.fn(),ensure:vi.fn(),confirm:vi.fn(),receive:vi.fn(),admin:vi.fn(),list:vi.fn(),counts:vi.fn(),readOrder:vi.fn(),readRefund:vi.fn()}));
vi.mock('@/lib/workspace/payments/runtime',()=>({workspacePaymentRuntime:mocks.runtime}));
vi.mock('@/lib/workspace/eligibility/service',()=>({getWorkspaceUser:mocks.user}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:mocks.admin}));
vi.mock('@/lib/workspace/payments/repository',()=>({postgresFinanceStore:{readOrder:mocks.readOrder},readWorkspaceFinancialRefund:mocks.readRefund,listFinancialOrders:mocks.list,financialCouponCounts:mocks.counts}));
import { POST as create } from '@/app/api/workspace/membership/orders/route';
import { GET as read } from '@/app/api/workspace/membership/orders/[id]/route';
import { POST as confirm } from '@/app/api/workspace/payments/razorpay/confirm/route';
import { POST as webhook } from '@/app/api/workspace/payments/razorpay/webhook/route';
import { GET as adminList } from '@/app/api/admin/workspace/orders/route';
import { GET as adminCounts } from '@/app/api/admin/workspace/coupons/[id]/financial/route';
import { PaymentError } from '@/lib/workspace/payments/model';
import { plans,actorId,requestKey } from './workspace-membership-fixtures';
const origin='http://localhost:3000',config={keyId:'rzp_test_SYNTHETIC15A',accountId:'acc_TEST15A',mode:'test',keySecret:'synthetic-callback-secret',webhookSecret:'synthetic-webhook-secret'},order={id:requestKey,userId:actorId,planCode:'quarterly',planVersionId:plans[0].id,totalPaise:589882,currency:'INR',providerOrderId:'order_SYNTHETIC15A',providerAccountId:'acc_TEST15A',providerMode:'test',providerSetupState:'ready',financialState:'unpaid',activationState:'pending_activation',paidAt:null,refundEligibleUntil:null};
const json=(path:string,body:unknown,source=origin)=>new Request(origin+path,{method:'POST',headers:{'content-type':'application/json',origin:source},body:JSON.stringify(body)});
function hook(raw:string,signature:string|undefined=createHmac('sha256',config.webhookSecret).update(raw).digest('hex'),eventId='evt_TEST15A') { return new Request(origin+'/api/workspace/payments/razorpay/webhook',{method:'POST',headers:{...(signature?{'x-razorpay-signature':signature}:{}),'x-razorpay-event-id':eventId,origin:'https://unrelated-origin.example.invalid'},body:raw}); }
const input={planCode:'quarterly',planVersionId:plans[0].id,quoteHash:'a'.repeat(64),requestKey};
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_BASE_URL',origin);mocks.runtime.mockReturnValue({config,service:{acceptOrder:mocks.accept,ensureProviderOrder:mocks.ensure,confirmPayment:mocks.confirm},store:{receiveEvent:mocks.receive}});mocks.user.mockResolvedValue({id:actorId});mocks.admin.mockResolvedValue({id:actorId});mocks.accept.mockResolvedValue(order);mocks.ensure.mockResolvedValue(order);mocks.confirm.mockResolvedValue(order);mocks.readOrder.mockResolvedValue(order);mocks.readRefund.mockResolvedValue(null);mocks.list.mockResolvedValue([]);mocks.counts.mockResolvedValue({activeReserved:1,redeemedPaidUses:2,releasedReservations:3,capturedHeldOrders:1});mocks.receive.mockResolvedValue({event:{processingState:'pending'},anomaly:false});});
it('default disabled gate blocks create/confirm before auth, financial writes or provider calls',async()=>{mocks.runtime.mockImplementation(()=>{throw new PaymentError('disabled')});expect((await create(json('/orders',input))).status).toBe(503);expect((await confirm(json('/confirm',{}))).status).toBe(503);expect(mocks.user).not.toHaveBeenCalled();expect(mocks.accept).not.toHaveBeenCalled();expect(mocks.ensure).not.toHaveBeenCalled();});
it('enabled controlled test path requires persisted auth and same origin',async()=>{mocks.user.mockResolvedValue(null);expect((await create(json('/orders',input))).status).toBe(401);expect(mocks.accept).not.toHaveBeenCalled();mocks.user.mockResolvedValue({id:actorId});expect((await create(json('/orders',input,'https://cross-site.example.invalid'))).status).toBe(403);});
it('rejects forged economics and creates only from validated identifiers',async()=>{expect((await create(json('/orders',{...input,totalPaise:1}))).status).toBe(400);const response=await create(json('/orders',input));expect(response.status).toBe(201);expect(mocks.accept).toHaveBeenCalledWith(actorId,input);expect(mocks.ensure).toHaveBeenCalledWith(actorId,requestKey);expect(await response.json()).toMatchObject({order:{hasCreatorAccess:false,hasPaidEntitlement:false}});expect(response.headers.get('cache-control')).toBe('no-store');});
it('confirmation ignores no client order/price/status fields',async()=>{const valid={orderId:requestKey,providerPaymentId:'pay_TEST15A',signature:'a'.repeat(64)};expect((await confirm(json('/confirm',{...valid,providerOrderId:'order_FORGED15A'}))).status).toBe(400);expect((await confirm(json('/confirm',valid))).status).toBe(200);expect(mocks.confirm).toHaveBeenCalledWith(actorId,requestKey,'pay_TEST15A','a'.repeat(64),config.keySecret);});
it('order history is owned, authenticated and bounded',async()=>{expect((await read(new Request(origin+'/orders'),{params:Promise.resolve({id:requestKey})})).status).toBe(200);expect(mocks.readOrder).toHaveBeenCalledWith(requestKey,actorId);mocks.readOrder.mockResolvedValue(undefined);expect((await read(new Request(origin+'/orders'),{params:Promise.resolve({id:requestKey})})).status).toBe(404);});
it('webhook verifies raw HMAC before parsing without cookie/Origin authorization',async()=>{const raw=' { "account_id":"acc_TEST15A", "event":"payment.captured", "payload":{} } ';const response=await webhook(hook(raw));expect(response.status).toBe(202);expect(mocks.user).not.toHaveBeenCalled();expect(mocks.receive).toHaveBeenCalledWith(config,expect.objectContaining({eventId:'evt_TEST15A',type:'payment.captured',hash:expect.stringMatching(/^[a-f0-9]{64}$/)}),expect.any(Date));});
it('missing/invalid signatures and invalid signed JSON cannot produce durable receipt',async()=>{expect((await webhook(hook('{','a'.repeat(64)))).status).toBe(403);expect((await webhook(hook('{}',''))).status).toBe(403);expect((await webhook(hook('{'))).status).toBe(400);expect(mocks.receive).not.toHaveBeenCalled();});
it('oversized raw body and missing event ID are rejected',async()=>{expect((await webhook(hook(' '.repeat(32769)))).status).toBe(400);expect((await webhook(hook('{}',undefined,''))).status).toBe(400);expect(mocks.receive).not.toHaveBeenCalled();});
it('durable storage failure is retryable, never acknowledged as success',async()=>{mocks.receive.mockRejectedValue(new Error('synthetic storage failure'));expect((await webhook(hook(JSON.stringify({account_id:config.accountId,event:'payment.captured',payload:{}})))).status).toBe(503);});
it('duplicate processed receipt succeeds; same ID/different hash signals anomaly',async()=>{const raw=JSON.stringify({account_id:config.accountId,event:'payment.captured',payload:{}});mocks.receive.mockResolvedValue({event:{processingState:'processed'},anomaly:false});expect((await webhook(hook(raw))).status).toBe(200);mocks.receive.mockResolvedValue({event:{processingState:'needs_review'},anomaly:true});expect((await webhook(hook(raw))).status).toBe(409);});
it('admin financial reports recheck persisted authorization; no mark-paid command exists',async()=>{mocks.admin.mockResolvedValue(null);expect((await adminList(new Request(origin+'/api/admin/workspace/orders'))).status).toBe(403);expect((await adminCounts(new Request(origin+'/counts'),{params:Promise.resolve({id:requestKey})})).status).toBe(403);expect(mocks.list).not.toHaveBeenCalled();expect(mocks.counts).not.toHaveBeenCalled();});
it('admin reporting distinguishes capacity, consumption, releases and held captures',async()=>{const response=await adminCounts(new Request(origin+'/counts'),{params:Promise.resolve({id:requestKey})});expect(await response.json()).toEqual({activeReserved:1,redeemedPaidUses:2,releasedReservations:3,capturedHeldOrders:1});expect((await adminList(new Request(origin+'/orders?page=0'))).status).toBe(400);});

it('Checkout creation exposes only scoped public key/order identifiers, never signing secrets',async()=>{
 const response=await create(json('/orders',input)),body=await response.json();
 expect(body.checkout).toEqual({keyId:config.keyId,providerOrderId:order.providerOrderId});
 expect(JSON.stringify(body)).not.toContain(config.keySecret);expect(JSON.stringify(body)).not.toContain(config.webhookSecret);
});

it('owned order recovery exposes Test Checkout only while the strict runtime gates and provider scope match',async()=>{
 for(const [key,value]of Object.entries({NODE_ENV:'test',DATABASE_ENV:'development',WORKSPACE_PAYMENT_ENABLED:'true',WORKSPACE_RAZORPAY_TEST_AUTHORIZED:'true',WORKSPACE_RAZORPAY_MODE:'test',WORKSPACE_RAZORPAY_KEY_ID:config.keyId,WORKSPACE_RAZORPAY_KEY_SECRET:config.keySecret,WORKSPACE_RAZORPAY_WEBHOOK_SECRET:config.webhookSecret,WORKSPACE_RAZORPAY_ACCOUNT_ID:config.accountId}))vi.stubEnv(key,value);
 const params={params:Promise.resolve({id:requestKey})};
 expect(await (await read(new Request(origin+'/orders'),params)).json()).toMatchObject({checkout:{keyId:config.keyId,providerOrderId:order.providerOrderId}});
 vi.stubEnv('NODE_ENV','production');expect(await (await read(new Request(origin+'/orders'),params)).json()).not.toHaveProperty('checkout');
 vi.stubEnv('NODE_ENV','test');vi.stubEnv('WORKSPACE_PAYMENT_ENABLED','false');expect(await (await read(new Request(origin+'/orders'),params)).json()).not.toHaveProperty('checkout');
});

it('owned full-refund projection preserves captured history but exposes fully refunded truth and no Checkout',async()=>{
 mocks.readRefund.mockResolvedValue({confirmedAt:new Date('2026-10-12T12:00:00Z'),amountPaise:589882});
 const response=await read(new Request(origin+'/orders'),{params:Promise.resolve({id:requestKey})});const body=await response.json();
 expect(body.order).toMatchObject({financialRefundState:'fully_refunded',refundedPaise:589882,refundConfirmedAt:'2026-10-12T12:00:00.000Z'});expect(body).not.toHaveProperty('checkout');
});
