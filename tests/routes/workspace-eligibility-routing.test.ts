import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { middleware } from '@/middleware';
import { userId } from './workspace-eligibility-fixtures';
it.each(['/workspace/apply', '/workspace/eligibility-result'])('anonymous %s keeps only the fixed account callback', async path => {
  const response = await middleware(new NextRequest(`https://example.test${path}?eligible=true&userId=other&callbackUrl=https://attacker.test`));
  const destination = new URL(response.headers.get('location')!);
  expect(destination.pathname).toBe('/login'); expect([...destination.searchParams]).toEqual([['callbackUrl', '/workspace/apply']]);
});
it('keeps the manual application public and does not create a new creator JWT role', async () => {
  expect((await middleware(new NextRequest('https://example.test/workspace/manual-application'))).headers.get('location')).toBeNull();
  vi.stubEnv('JWT_SECRET', 'synthetic-workspace-test-secret');
  const token = await new SignJWT({ id: userId, role: 'student', phone: 'synthetic' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('5m').sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const headers = { cookie: `ab_session=${token}` };
  expect((await middleware(new NextRequest('https://example.test/workspace/apply', { headers }))).headers.get('location')).toBeNull();
  expect(new URL((await middleware(new NextRequest('https://example.test/admin/workspace/eligibility', { headers }))).headers.get('location')!).pathname).toBe('/dashboard');
});
