'use server';
import { revalidatePath } from 'next/cache';
import { redirect, RedirectType } from 'next/navigation';
import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { getSession } from '@/lib/auth';
import { safeCallbackPath } from '@/lib/auth-navigation';

export async function completeLoginNavigation(callback: string | null) {
  const user = await getWorkspaceUser();
  if (!user) return { error: 'Your sign-in could not be confirmed. Please sign in again.' };
  if (!user.fullName?.trim()) return { error: 'Please complete your profile before continuing.' };
  // API-issued cookies do not invalidate prefetched App Router responses. Invalidate
  // the authenticated boundary in a Server Action before the single redirect.
  revalidatePath('/', 'layout');
  redirect(safeCallbackPath(callback) || (user.role === 'admin' ? '/admin' : '/dashboard'), RedirectType.replace);
}
export async function completeLogoutNavigation() {
  if (await getSession()) return { error: 'Sign out could not be confirmed. Please try again.' };
  revalidatePath('/', 'layout');
  redirect('/login', RedirectType.replace);
}
