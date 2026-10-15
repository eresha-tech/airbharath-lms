'use server';
import { revalidatePath } from 'next/cache';
import { redirect, RedirectType } from 'next/navigation';
import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
export async function continueAfterEligibility() {
  if (!await getWorkspaceUser()) return { error: 'Please sign in again to view your saved result.' };
  for (const path of ['/workspace/apply', '/workspace/eligibility-result', '/workspace/activate']) revalidatePath(path);
  redirect('/workspace/eligibility-result', RedirectType.replace);
}
