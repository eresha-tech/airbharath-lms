/** Shared UI session cache. Authorization remains enforced by server-side guards. */
export interface ClientUser {
  id: string;
  role: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}
let cachedUser: ClientUser | null = null;
let fetchPromise: Promise<ClientUser | null> | null = null;
let revision = 0;
const listeners = new Set<(user: ClientUser | null) => void>();
function publish(user: ClientUser | null) {
  cachedUser = user;
  for (const listener of listeners) listener(user);
}
export function subscribeClientUser(listener: (user: ClientUser | null) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function getClientUser(forceRefresh = false): Promise<ClientUser | null> {
  if (typeof window === 'undefined') return null;
  if (cachedUser && !forceRefresh) return cachedUser;
  if (fetchPromise && !forceRefresh) return fetchPromise;
  const requestedRevision = ++revision;
  const pending = fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (revision === requestedRevision) publish(data?.user || null);
      return cachedUser;
    })
    .catch(() => {
      if (revision === requestedRevision) publish(null);
      return cachedUser;
    })
    .finally(() => { if (fetchPromise === pending) fetchPromise = null; });
  fetchPromise = pending;
  return pending;
}
export function setClientUser(user: ClientUser | null): void {
  revision++;
  fetchPromise = null;
  publish(user);
}
export function clearClientUser(): void { setClientUser(null); }
