import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getWorkspaceUser } from '../eligibility/service';
import { workspaceContent } from './repository';
import { CreatorError } from './model';
export const requireCreatorWorkspace = cache(async () => {
  const user = await getWorkspaceUser();
  if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fdashboard');
  try { return await workspaceContent().overview(user.id); }
  catch (error) { if (error instanceof CreatorError && error.code === 'restricted') redirect('/workspace/member'); throw new Error('Workspace could not be loaded. Please try again later.'); }
});
