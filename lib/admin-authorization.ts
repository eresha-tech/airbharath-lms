import { eq } from 'drizzle-orm';
import { getSession, type UserSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function hasPersistedAdminRole(session: UserSession): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
      columns: { id: true, role: true },
    });

    return user?.role === 'admin';
  } catch {
    return false;
  }
}

export async function getAuthorizedAdminSession(): Promise<UserSession | null> {
  const session = await getSession();
  if (!session || !(await hasPersistedAdminRole(session))) return null;

  return { ...session, role: 'admin' };
}
