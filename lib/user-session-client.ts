/**
 * Client-side user session cache & request deduplicator
 * AirBharath LMS — Phase 17 Performance
 *
 * Provides:
 * 1. Single in-flight request deduplication for concurrent mounts.
 * 2. In-memory session caching during client navigation.
 * 3. Immediate cache clearance on logout for total user data isolation.
 */

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

export async function getClientUser(forceRefresh = false): Promise<ClientUser | null> {
  if (cachedUser && !forceRefresh) {
    return cachedUser;
  }

  if (typeof window === "undefined") return null;

  if (fetchPromise && !forceRefresh) {
    return fetchPromise;
  }

  fetchPromise = fetch("/api/auth/me")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      cachedUser = (data?.user as ClientUser) || null;
      return cachedUser;
    })
    .catch(() => {
      cachedUser = null;
      return null;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function clearClientUser(): void {
  cachedUser = null;
  fetchPromise = null;
}

export function setClientUser(user: ClientUser | null): void {
  cachedUser = user;
}
