import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), session: vi.fn() }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/auth', () => ({ getSession: mocks.session }));
import { creatorHttp } from '@/lib/workspace/creator/http';
import { builderHttp } from '@/lib/workspace/builder/http';
import { publishingHttp } from '@/lib/workspace/publishing/http';
import { mediaHttp } from '@/lib/workspace/media/http';
import { coverHttp } from '@/lib/workspace/media/artwork';
import { supportHttp } from '@/lib/workspace/operations/http';
import { reviewHttp } from '@/lib/workspace/review/http';
import { refundHttp } from '@/lib/workspace/refunds/http';
import { POST as checkout } from '@/app/api/payments/razorpay/order/route';
import { POST as mentorship } from '@/app/api/mentorship/applications/route';
const id = 'b9c0d139-5c3e-421c-996e-86c40ced2e0a';
const origin = 'https://staging.airbharath.in';
const request = (headers: Record<string, string> = {}) => new Request('https://internal:3000/api/action', {
 method: 'POST', headers: { origin, host: 'staging.airbharath.in', 'x-forwarded-proto': 'https', 'content-type': 'application/json', ...headers }, body: '{}',
});
const callers: [string, (r: Request) => Promise<Response>][] = [
 ['Creator editing', r => creatorHttp(r, 'create')],
 ['lesson saving', r => builderHttp(r, id)],
 ['publishing', r => publishingHttp(r, id)],
 ['Workspace media', r => mediaHttp(r, 'collection')],
 ['artwork', r => coverHttp(r, id)],
 ['operations', r => supportHttp(r)],
 ['legacy reviews', r => reviewHttp(r, 'submit', id)],
 ['refunds', r => refundHttp(r, id, 'request')],
 ['Academy and Creator checkout', checkout],
 ['mentorship submission', mentorship],
];
beforeEach(() => {
 vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_BASE_URL', origin);
 vi.stubEnv('WORKSPACE_OPERATIONS_ENABLED', 'true');
 mocks.user.mockResolvedValue(null); mocks.session.mockResolvedValue(null);
});
it.each(callers)('%s accepts canonical HTTPS before retaining its authentication guard', async (_name, call) => {
 expect((await call(request())).status).toBe(401);
});
it.each(callers)('%s rejects foreign Origin and mismatched Host/proxy metadata before authentication', async (_name, call) => {
 const attacks: Record<string,string>[] = [{origin:'https://foreign.invalid'}, {host:'foreign.invalid'}, {'x-forwarded-host':'foreign.invalid'}, {'x-forwarded-proto':'http'}, {'x-forwarded-port':'3000'}, {origin:origin+':3000'}];
 for (const headers of attacks) {
  mocks.user.mockClear(); mocks.session.mockClear();
  expect((await call(request(headers))).status).toBe(403);
  expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.session).not.toHaveBeenCalled();
 }
});
