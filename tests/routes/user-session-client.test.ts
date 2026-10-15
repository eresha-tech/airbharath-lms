import { expect, it, vi } from 'vitest';
const response = (user: unknown) => new Response(JSON.stringify({ user }));
it('does not let a pre-logout session request restore a logged-out identity', async () => {
  vi.resetModules(); vi.stubGlobal('window', {});
  const { getClientUser, clearClientUser } = await import('@/lib/user-session-client');
  let resolve!: (r: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  const pending = getClientUser(); clearClientUser();
  resolve(response({ id: 'old-user', role: 'student' }));
  expect(await pending).toBeNull();
});
it('does not let a stale auth check overwrite a newly confirmed login', async () => {
  vi.resetModules(); vi.stubGlobal('window', {});
  const { getClientUser, setClientUser } = await import('@/lib/user-session-client');
  let resolve!: (r: Response) => void;
  const http = vi.fn(() => new Promise<Response>(done => { resolve = done; })); vi.stubGlobal('fetch', http);
  const pending = getClientUser(), confirmed = { id: 'new-user', role: 'student' };
  setClientUser(confirmed); resolve(response(null));
  expect(await pending).toEqual(confirmed); expect(await getClientUser()).toEqual(confirmed);
  expect(http).toHaveBeenCalledOnce();
});
