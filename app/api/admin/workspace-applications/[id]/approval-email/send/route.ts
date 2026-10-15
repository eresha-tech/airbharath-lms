import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { db } from '@/lib/db';
import { workspaceApplications as table } from '@/lib/db/schema';
import { UUID_PATTERN } from '@/lib/workspace/validation';
import { isSameOrigin, privateJson, readJson } from '@/lib/workspace/http';
import { approvalPreviewHash, renderApprovalEmail, sendApprovalEmail, validateApprovalInput } from '@/lib/workspace/approval-email';
import { trackWorkspaceServer } from '@/lib/workspace/analytics-server';

const fields = { approvalEmailStatus: table.approvalEmailStatus, approvalEmailSentAt: table.approvalEmailSentAt,
  approvalEmailSentBy: table.approvalEmailSentBy, approvalEmailAttemptedAt: table.approvalEmailAttemptedAt,
  approvalEmailErrorCategory: table.approvalEmailErrorCategory, approvalEmailPersonalNote: table.approvalEmailPersonalNote, updatedAt: table.updatedAt };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedAdminSession();
  if (!session) return privateJson({ error: 'Forbidden' }, 403);
  if (!isSameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return privateJson({ error: 'Invalid application identifier.' }, 400);
  let payload: unknown;
  try { payload = await readJson(request, 8192); } catch { return privateJson({ error: 'Provide valid send details.' }, 400); }
  const input = validateApprovalInput(payload, true);
  if (!input) return privateJson({ error: 'Preview the email and provide valid send details.' }, 400);
  try {
    const app = await db.query.workspaceApplications.findFirst({ where: eq(table.id, id) });
    if (!app) return privateJson({ error: 'Application not found.' }, 404);
    if (app.applicationStatus !== 'approved') return privateJson({ error: 'Only an approved application can receive an approval email.' }, 409);
    if (app.approvalEmailStatus === 'sending') return privateJson({ error: 'An email attempt is already in progress. Reload to check its result; do not send another copy.' }, 409);
    const requiredAction = app.approvalEmailStatus === 'sent' ? 'resend' : app.approvalEmailStatus === 'failed' ? 'retry' : 'send';
    if (input.action !== requiredAction || (requiredAction !== 'send' && !input.confirmed)) return privateJson({ error: 'Previously attempted emails require an explicitly confirmed resend or retry.' }, 409);
    const email = renderApprovalEmail(app, input.personalNote);
    if (input.previewHash !== approvalPreviewHash(email, app.updatedAt, app.email) || input.expectedUpdatedAt !== app.updatedAt.toISOString()) return privateJson({ error: 'The application or email changed. Reload and preview again before sending.' }, 409);
    const attemptId = randomUUID();
    const now = new Date(Math.max(Date.now(), app.updatedAt.getTime() + 1));
    // Atomic claim prevents double clicks, multiple tabs and concurrent admins from sending twice.
    const [claimed] = await db.update(table).set({ approvalEmailStatus: 'sending', approvalEmailAttemptedAt: now,
      approvalEmailAttemptedBy: session.id, approvalEmailAttemptId: attemptId, approvalEmailPersonalNote: input.personalNote,
      approvalEmailErrorCategory: null, updatedAt: now,
    }).where(and(eq(table.id, id), eq(table.applicationStatus, 'approved'), eq(table.approvalEmailStatus, app.approvalEmailStatus), eq(table.updatedAt, app.updatedAt))).returning({ id: table.id });
    if (!claimed) return privateJson({ error: 'Another admin updated or sent this email. Reload and preview again.' }, 409);

    const result = await sendApprovalEmail(app, email);
    const finishedAt = new Date(Math.max(Date.now(), now.getTime() + 1));
    const errorCategory = result.success ? null : ['not_configured', 'provider_rejected', 'timeout', 'delivery_unknown'].includes(result.errorCategory || '') ? result.errorCategory! : 'delivery_unknown';
    const [communication] = await db.update(table).set({ approvalEmailStatus: result.success ? 'sent' : 'failed',
      approvalEmailErrorCategory: errorCategory, updatedAt: finishedAt,
      ...(result.success ? { approvalEmailSentAt: finishedAt, approvalEmailSentBy: session.id } : {}),
    }).where(and(eq(table.id, id), eq(table.approvalEmailAttemptId, attemptId), eq(table.approvalEmailStatus, 'sending'))).returning(fields);
    if (!communication) return privateJson({ error: 'The delivery result could not be recorded. Reload and check the provider before attempting another send.' }, 503);
    after(() => trackWorkspaceServer('workspace_approval_email_result', id, { action: input.action, outcome: result.success ? 'sent' : 'failed', errorCategory }));
    const response = { communication: { ...communication, ...(result.success ? { approvalEmailSenderName: session.fullName || null } : {}) } };
    return result.success ? privateJson({ success: true, ...response }) : privateJson({ ...response,
      error: errorCategory === 'timeout' || errorCategory === 'delivery_unknown'
        ? 'Delivery could not be confirmed. Check the provider before explicitly retrying; a copy may already have been accepted.'
        : 'The email was not accepted. Creator approval is unchanged. Check mail configuration before retrying.',
    }, 502);
  } catch {
    // Never clear a claimed Sending state after an uncertain provider/persistence outcome.
    return privateJson({ error: 'The send result could not be confirmed. Reload and check the provider before sending again. Creator approval is unchanged.' }, 503);
  }
}
