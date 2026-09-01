import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
    });
    return NextResponse.json({ user: user || session });
  } catch {
    return NextResponse.json({ user: session });
  }
}
