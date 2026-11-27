import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), list: vi.fn(), read: vi.fn(), mutate: vi.fn(), intent: vi.fn(), authorize: vi.fn(), finalize: vi.fn(), download: vi.fn(), process:vi.fn(), captionIntent:vi.fn(), inspect: vi.fn(), bytes: vi.fn() }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/workspace/media/runtime', () => ({ workspaceMediaProcessing:()=>({request:mocks.process}), workspaceMedia: () => ({ list: mocks.list, read: mocks.read, mutate: mocks.mutate }), workspaceMediaUploads: () => ({ intent: mocks.intent, captionIntent:mocks.captionIntent, authorize: mocks.authorize, finalize: mocks.finalize, download: mocks.download, downloadResponse:async(actor:string,id:string,request:Request)=>{const r=await mocks.download(actor,id);const {privateBytesResponse,attachment}=await import('@/lib/workspace/media/streaming');return privateBytesResponse(request,r.bytes,'application/octet-stream',attachment(r.displayName,r.mimeType));} }), workspaceMediaStorage: () => ({ download: mocks.bytes, open:async(asset:{byteSize:number},range:{start:number;end:number}|null,_signal:AbortSignal,head:boolean)=>{const bytes=await mocks.bytes();return {size:range?range.end-range.start+1:asset.byteSize,...(!head?{body:new ReadableStream<Uint8Array>({start(c){c.enqueue(range?bytes.subarray(range.start,range.end+1):bytes);c.close();}})}:{})};}, identity: { provider: 's3', container: 'synthetic-private', accountId: '123456789012' } }) }));
vi.mock('@/lib/workspace/media/repository', () => ({ inspectMedia: mocks.inspect }));
import { mediaHttp, adminMediaHttp } from '@/lib/workspace/media/http';
import { MediaError } from '@/lib/workspace/media/model';
import { uploadFixture, checksum } from './workspace-media-upload-fixtures';
import { RESOURCE_VERIFICATION_POLICY } from '@/lib/workspace/media/verification';
import { owner, other, key } from './workspace-creator-fixtures';
import * as collection from '@/app/api/workspace/media/route';
import * as assetRoute from '@/app/api/workspace/media/[id]/route';
import * as uploadRoute from '@/app/api/workspace/media/[id]/upload/route';
import * as finalizeRoute from '@/app/api/workspace/media/[id]/finalize/route';
import * as accessRoute from '@/app/api/workspace/media/[id]/access/route';
import * as adminRoute from '@/app/api/admin/workspace/course-builds/[id]/media/route';
import * as adminAccessRoute from '@/app/api/admin/workspace/course-builds/[id]/media/[assetId]/access/route';

const request = (method = 'GET', value?: unknown, headers: Record<string,string> = {}, query = '') => new Request(`https://example.test/api/workspace/media${query}`, { method, headers: { ...(value === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
beforeEach(async () => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: owner }); mocks.admin.mockResolvedValue({ id: other });
  mocks.list.mockResolvedValue({ assets: [], mediaRevision: 0 }); mocks.read.mockResolvedValue({ asset: { id: key } }); mocks.mutate.mockResolvedValue({ assets: [] }); mocks.intent.mockResolvedValue({ asset: { id: key }, created: true }); mocks.authorize.mockResolvedValue({ upload: { url: 'https://uploads.invalid/temporary' } }); mocks.finalize.mockResolvedValue({ asset: { id: key, status: 'verified' } });
  const bytes = new TextEncoder().encode('synthetic resource'); mocks.download.mockResolvedValue({ bytes, displayName: 'Résumé notes.pdf', mimeType: 'application/pdf' }); mocks.bytes.mockResolvedValue(bytes);
  const f = uploadFixture(); await f.reserve({ assetKind: 'resource', filename: 'notes.pdf', mimeType: 'application/pdf', byteSize: bytes.length });
  mocks.inspect.mockResolvedValue([{ ...f.state.rows[0], status: 'ready', isAttached: true, verificationPolicy: RESOURCE_VERIFICATION_POLICY, objectVersionId: 'source-v1', checksum: checksum(bytes) }]);
});
it('authenticates every Creator action before service/provider use', async () => {
  mocks.user.mockResolvedValue(null);
  for (const [action,method] of [['collection','POST'],['asset','PATCH'],['upload','POST'],['finalize','POST'],['access','GET'],['process','POST'],['captions','POST']] as const) expect((await mediaHttp(request(method, method==='GET'?undefined:{}), action, key)).status).toBe(401);
  for (const fn of [mocks.intent,mocks.authorize,mocks.finalize,mocks.mutate,mocks.download]) expect(fn).not.toHaveBeenCalled();
});
it('rejects cross-origin/cross-site requests, duplicate selectors and unexpected query parameters', async () => {
  expect((await mediaHttp(request('POST',{}, { origin: 'https://other.test' }), 'collection')).status).toBe(403);
  expect((await mediaHttp(request('GET',undefined, {'sec-fetch-site':'cross-site'}), 'access', key)).status).toBe(403);
  for (const q of ['?lessonId='+key+'&lessonId='+key, '?lessonId='+key+'&storageKey=private', '?lessonId=bad']) expect((await mediaHttp(request('GET',undefined,{},q),'collection')).status).toBeGreaterThanOrEqual(400);
  expect(mocks.list).not.toHaveBeenCalled();
});
it('bounds JSON bodies and rejects unsupported content types or forged finalization data', async () => {
  expect((await mediaHttp(request('POST',{x:'x'.repeat(8200)}),'collection')).status).toBe(413);
  for (const type of ['text/plain','application/jsonp']) expect((await mediaHttp(request('POST',{}, {'content-type':type}),'finalize',key)).status).toBe(400);
  expect(mocks.intent).not.toHaveBeenCalled(); expect(mocks.finalize).not.toHaveBeenCalled();
});
it('uses private no-store metadata and expected create/replay status codes', async () => {
  const r = await collection.GET(request('GET',undefined,{},'?lessonId='+key)); expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store'); expect(mocks.list).toHaveBeenCalledWith(owner,key);
  expect((await collection.POST(request('POST',{}))).status).toBe(201); mocks.intent.mockResolvedValue({created:false}); expect((await collection.POST(request('POST',{}))).status).toBe(200);
  const context = {params:Promise.resolve({id:key})};
  await assetRoute.GET(request(),context); await assetRoute.PATCH(request('PATCH',{}),context); await uploadRoute.POST(request('POST',{}),context); await finalizeRoute.POST(request('POST',{}),context);
  expect(mocks.authorize).toHaveBeenCalledWith(owner,key,{}); expect(mocks.finalize).toHaveBeenCalledWith(owner,key,{});
});
it('resources are authenticated downloads, never inline HTML/PDF/images or permanent signed GET links', async () => {
  const r = await accessRoute.GET(request(),{params:Promise.resolve({id:key})});
  expect(r.status).toBe(200); expect(r.headers.get('content-type')).toBe('application/octet-stream'); expect(r.headers.get('content-disposition')).toMatch(/^attachment;.*filename\*=UTF-8''R%C3%A9sum%C3%A9/);
  expect(r.headers.get('content-security-policy')).toContain('sandbox'); expect(r.headers.get('x-content-type-options')).toBe('nosniff'); expect(r.headers.get('cache-control')).toContain('no-store'); expect(r.headers.get('location')).toBeNull();
});
it.each([['object_missing',409],['verification',422],['expired',410],['conflict',409],['forbidden',403],['unavailable',503]] as const)('maps %s to controlled %i and suppresses raw provider details', async (code,status) => {
  mocks.finalize.mockRejectedValue(new MediaError(code)); const r=await mediaHttp(request('POST',{}),'finalize',key); expect(r.status).toBe(status); expect(r.headers.get('cache-control')).toBe('no-store');
  mocks.finalize.mockRejectedValue(new Error('SECRET_BUCKET_NAME credentials signed-url')); const failed=await mediaHttp(request('POST',{}),'finalize',key); expect(failed.status).toBe(503); expect(await failed.text()).not.toMatch(/SECRET|credentials|signed-url/);
});
it('Admin metadata is GET-only and payload GET/HEAD denies non-Admins before inspecting Creator media', async () => {
  expect(Object.keys(adminRoute).filter(k=>!['runtime','dynamic'].includes(k))).toEqual(['GET']); expect(Object.keys(adminAccessRoute).filter(k=>!['runtime','dynamic','maxDuration'].includes(k))).toEqual(['GET','HEAD']);
  mocks.admin.mockResolvedValue(null); expect((await adminRoute.GET(request('GET',undefined,{},'?lessonId='+key),{params:Promise.resolve({id:key})})).status).toBe(403); expect(mocks.inspect).not.toHaveBeenCalled();
  expect((await adminMediaHttp(request('PATCH',{}),key)).status).toBe(405);
});
it('Admin metadata omits storage identity; access rechecks demotion after reading provider bytes', async () => {
  const r = await adminMediaHttp(request('GET',undefined,{},'?lessonId='+key),key); const text=await r.text(); expect(text).not.toMatch(/storageKey|source-v1|checksum|synthetic-private|processingJobId/);
  mocks.inspect.mockResolvedValueOnce((await mocks.inspect.mock.results[0].value)).mockResolvedValueOnce((await mocks.inspect.mock.results[0].value)).mockRejectedValueOnce(new MediaError('forbidden'));
  const failed=await adminAccessRoute.GET(request(),{params:Promise.resolve({id:key,assetId:key})}); expect(failed.status).toBe(403); expect(mocks.bytes).toHaveBeenCalledTimes(1);
});

it('uses owner-scoped processing/caption actions and rejects cross-origin work before dispatch',async()=>{mocks.process.mockResolvedValue({asset:{id:key,status:'processing'}});mocks.captionIntent.mockResolvedValue({asset:{id:key},created:true});expect((await mediaHttp(request('POST',{}),'process',key)).status).toBe(202);expect(mocks.process).toHaveBeenCalledWith(owner,key,{});expect((await mediaHttp(request('POST',{}),'captions',key)).status).toBe(201);expect((await mediaHttp(request('POST',{}, {origin:'https://attacker.test'}),'process',key)).status).toBe(403);expect(mocks.process).toHaveBeenCalledTimes(1);});
