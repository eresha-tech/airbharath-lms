import { NextResponse } from 'next/server';
import { getSession, setSessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fullName, email } = await req.json();
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        fullName,
        email: email || session.email,
      })
      .where(eq(users.id, session.id))
      .returning();

    // Refresh session cookie with updated name
    await setSessionCookie({
      ...session,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
