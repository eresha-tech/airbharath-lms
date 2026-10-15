import { privateJson } from '@/lib/workspace/http';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ user: null });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
    });
    return privateJson({ user: user || session });
  } catch {
    return privateJson({ user: session });
  }
}
