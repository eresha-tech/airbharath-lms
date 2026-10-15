import { and, eq, ne } from 'drizzle-orm';
import { after } from 'next/server';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { db } from '@/lib/db';
import { workspaceApplications as table, users } from '@/lib/db/schema';
import { trackWorkspaceServer } from '@/lib/workspace/analytics-server';
import { UUID_PATTERN, validateReview } from '@/lib/workspace/validation';
import { isSameOrigin, privateJson, readJson } from '@/lib/workspace/http';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const session = await getAuthorizedAdminSession();
  if (!session) return privateJson({ error: 'Forbidden' }, 403);
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return privateJson({ error: 'Invalid application identifier.' }, 400);
  try {
    const application = await db.query.workspaceApplications.findFirst({ where: eq(table.id, id), columns: { submissionKey: false, payloadHash: false } });
    if (!application) return privateJson({ error: 'Application not found.' }, 404);
    const sender = application.approvalEmailSentBy ? await db.query.users.findFirst({ where: eq(users.id, application.approvalEmailSentBy), columns: { fullName: true } }) : null;
    return privateJson({ application: { ...application, approvalEmailSenderName: sender?.fullName || null } });
  } catch { return privateJson({ error: 'Application is unavailable. Please try again.' }, 503); }
}
export async function PATCH(request: Request, context: Context) {
  const session = await getAuthorizedAdminSession();
  if (!session) return privateJson({ error: 'Forbidden' }, 403);
  if (!isSameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return privateJson({ error: 'Invalid application identifier.' }, 400);
  let payload: unknown;
  try { payload = await readJson(request); } catch { return privateJson({ error: 'Provide valid JSON smaller than 32 KB.' }, 400); }
  const result = validateReview(payload);
  if (!result.success) return privateJson({ error: result.error }, 400);
  try {
    const current = await db.query.workspaceApplications.findFirst({ where: eq(table.id, id), columns: { applicationStatus: true, updatedAt: true } });
    if (!current) return privateJson({ error: 'Application not found.' }, 404);
    const { expectedUpdatedAt, ...changes } = result.data;
    const now = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
    const [saved] = await db.update(table).set({ ...changes, updatedAt: now, reviewedAt: now, reviewedBy: session.id,
      ...(current.applicationStatus !== changes.applicationStatus ? { statusChangedAt: now } : {}),
    }).where(and(eq(table.id, id), eq(table.updatedAt, new Date(expectedUpdatedAt)), ne(table.approvalEmailStatus, 'sending'))).returning({ updatedAt: table.updatedAt });
    if (!saved) return privateJson({ error: 'Another reviewer updated this application or an email is sending. Reload to review the latest state before saving.' }, 409);
    after(() => trackWorkspaceServer('workspace_review_saved', id, { applicationStatus: changes.applicationStatus }));
    return privateJson({ success: true, updatedAt: saved.updatedAt });
  } catch { return privateJson({ error: 'Your review could not be saved. Please try again.' }, 503); }
}
