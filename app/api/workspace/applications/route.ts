import { after } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { workspaceApplications } from '@/lib/db/schema';
import { validateApplication } from '@/lib/workspace/validation';
import { CONSENT_VERSION } from '@/lib/workspace/options';
import { applicationPayloadHash, createApplicationReference } from '@/lib/workspace/reference';
import { isSameOrigin, privateJson, readJson } from '@/lib/workspace/http';
import { sendApplicationReceipt } from '@/lib/workspace/receipt';
import { trackWorkspaceServer } from '@/lib/workspace/analytics-server';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  let payload: unknown;
  try { payload = await readJson(request); } catch { return privateJson({ error: 'Provide valid JSON smaller than 32 KB.' }, 400); }
  const result = validateApplication(payload);
  if (!result.success) return privateJson({ error: 'Please check your application.', errors: result.errors }, 400);
  const { data, submissionKey } = result;
  const payloadHash = applicationPayloadHash(data);
  try {
    const prior = await db.query.workspaceApplications.findFirst({
      where: and(eq(workspaceApplications.email, data.email.toLowerCase()), eq(workspaceApplications.mobile, data.mobile.replace(/\D/g, ''))),
      columns: { id: true },
    });
    const now = new Date();
    const [created] = await db.insert(workspaceApplications).values({
      ...data, email: data.email.toLowerCase(), mobile: data.mobile.replace(/\D/g, ''),
      submissionKey, payloadHash, applicationReference: createApplicationReference(),
      submittedAt: now, updatedAt: now,
      applicationStatus: 'submitted', consentAccuracyAt: now, consentContactAt: now,
      consentVersion: CONSENT_VERSION, potentialDuplicate: !!prior,
    }).onConflictDoNothing({ target: workspaceApplications.submissionKey }).returning({
      id: workspaceApplications.id, applicationReference: workspaceApplications.applicationReference,
    });
    if (!created) {
      const existing = await db.query.workspaceApplications.findFirst({
        where: eq(workspaceApplications.submissionKey, submissionKey),
        columns: { applicationReference: true, payloadHash: true },
      });
      if (!existing || existing.payloadHash !== payloadHash) return privateJson({ error: 'We already received a submission from this browser with different answers. You can start a fresh submission.' }, 409);
      // Only a complete matching payload plus its unguessable key may recover a receipt.
      return privateJson({ applicationReference: existing.applicationReference, status: 'submitted' });
    }
    after(async () => {
      const analytics = trackWorkspaceServer('workspace_application_saved', created.id, { applicationStatus: 'submitted' });
      try {
        if (await sendApplicationReceipt({ ...data, applicationReference: created.applicationReference })) {
          await db.update(workspaceApplications).set({ receiptSentAt: new Date() }).where(eq(workspaceApplications.id, created.id));
        }
      } catch { console.error('WORKSPACE_RECEIPT_FAILED'); }
      await analytics;
    });
    return privateJson({ applicationReference: created.applicationReference, status: 'submitted' }, 201);
  } catch {
    console.error('WORKSPACE_APPLICATION_CREATE_FAILED');
    return privateJson({ error: 'We could not save your application. Your answers are still here. Please try again.' }, 503);
  }
}
