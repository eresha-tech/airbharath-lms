import { createHash } from 'node:crypto';
import { serverTrack } from '@/lib/analytics-server';
import { APPLICATION_STATUSES } from './options';

export type WorkspaceServerEvent = 'workspace_application_saved' | 'workspace_review_saved' | 'workspace_approval_email_result';
export async function trackWorkspaceServer(event: WorkspaceServerEvent, opaqueId: string, input: {
  applicationStatus?: string; action?: string; outcome?: string; errorCategory?: string | null;
} = {}) {
  const properties: Record<string, string> = { feature: 'workspace', eventVersion: '1' };
  for (const [key, values] of Object.entries({ applicationStatus: APPLICATION_STATUSES, action: ['send', 'resend', 'retry'], outcome: ['sent', 'failed'], errorCategory: ['not_configured', 'provider_rejected', 'timeout', 'delivery_unknown'] })) {
    const value = input[key as keyof typeof input];
    if (value && (values as readonly string[]).includes(value)) properties[key] = value;
  }
  try { await serverTrack(`workspace:${createHash('sha256').update(opaqueId).digest('hex')}`, event, properties); }
  catch { /* Analytics must not affect application persistence or email delivery. */ }
}
