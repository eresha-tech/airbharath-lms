import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { db } from '@/lib/db';
import { workspaceApplications as table } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { UUID_PATTERN } from '@/lib/workspace/validation';
import { isSameOrigin, privateJson, readJson } from '@/lib/workspace/http';
import { approvalPreviewHash, renderApprovalEmail, validateApprovalInput } from '@/lib/workspace/approval-email';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthorizedAdminSession();
  if (!session) return privateJson({ error: 'Forbidden' }, 403);
  if (!isSameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return privateJson({ error: 'Invalid application identifier.' }, 400);
  let payload: unknown;
  try { payload = await readJson(request, 8192); } catch { return privateJson({ error: 'Provide valid preview details.' }, 400); }
  const input = validateApprovalInput(payload);
  if (!input) return privateJson({ error: 'Use a plain-text personal note of 1,000 characters or fewer.' }, 400);
  try {
    const app = await db.query.workspaceApplications.findFirst({ where: eq(table.id, id) });
    if (!app) return privateJson({ error: 'Application not found.' }, 404);
    if (app.applicationStatus !== 'approved') return privateJson({ error: 'Save this application as Approved before previewing an approval email.' }, 409);
    const email = renderApprovalEmail(app, input.personalNote);
    return privateJson({ ...email, applicantName: app.fullName, applicationReference: app.applicationReference, recipient: app.email,
      personalNote: input.personalNote, expectedUpdatedAt: app.updatedAt.toISOString(), previewHash: approvalPreviewHash(email, app.updatedAt, app.email) });
  } catch { return privateJson({ error: 'The approval email preview is unavailable. Please try again.' }, 503); }
}
