import { NextResponse } from 'next/server';
import { getSession, setSessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeEmail } from '@/lib/workspace/email/model';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fullName, email } = await req.json();
    if (typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    const contactEmail = normalizeEmail(email);
    if (!contactEmail) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        fullName: fullName.trim(),
        email: contactEmail,
      })
      .where(eq(users.id, session.id))
      .returning();

    if (!updatedUser) return NextResponse.json({ error: 'Account unavailable' }, { status: 401 });
    // Updating contact details does not establish email ownership.
    await setSessionCookie({
      ...session,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
