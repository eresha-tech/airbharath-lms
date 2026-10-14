'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { APPROVAL_EMAIL_STATUS_LABELS } from '@/lib/workspace/options';
import type { ApplicationDetail } from '@/lib/workspace/types';

type Preview = { subject: string; html: string; applicantName: string; applicationReference: string; recipient: string; personalNote: string; expectedUpdatedAt: string; previewHash: string };
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Not recorded';

export function ApprovalCommunication({ app, dirty, onUpdate, onReload, onBusy }: {
  app: ApplicationDetail; dirty: boolean; onUpdate: (changes: Partial<ApplicationDetail>) => void; onReload: () => void; onBusy: (busy: boolean) => void;
}) {
  const [note, setNote] = useState(app.approvalEmailPersonalNote || '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const emailStatus = app.approvalEmailStatus || 'not_sent';
  const failureMessage = app.approvalEmailErrorCategory === 'not_configured' ? 'Email delivery is not configured.'
    : app.approvalEmailErrorCategory === 'provider_rejected' ? 'The provider did not accept the last attempt.'
    : 'Delivery could not be confirmed. Check the provider before retrying; another copy may already have been accepted.';
  const isApproved = app.applicationStatus === 'approved';
  const unavailable = dirty || !!busy || emailStatus === 'sending' || uncertain;
  useEffect(() => { setPreview(null); setConfirmed(false); }, [app.updatedAt]);
  function pending(value: 'preview' | 'send' | null) { setBusy(value); onBusy(!!value); }

  async function call(path: string, body: object) {
    const response = await fetch(`/api/admin/workspace-applications/${app.id}/approval-email/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null);
    if (result?.communication) onUpdate(result.communication);
    if (!response.ok || !result) throw new Error(result?.error || 'Communication is unavailable. Reload to check the current state.');
    return result;
  }
  async function showPreview(trigger: HTMLElement) {
    if (unavailable || lock.current) return;
    dialogReturnFocus.current = trigger; lock.current = true; pending('preview'); setError(''); setMessage('');
    try { const result = await call('preview', { personalNote: note }); setPreview(result); setConfirmed(false); setOpen(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not preview the email.'); }
    finally { lock.current = false; pending(null); }
  }
  async function send() {
    if (!preview || unavailable || lock.current) return;
    const action = emailStatus === 'sent' ? 'resend' : emailStatus === 'failed' ? 'retry' : 'send';
    if (action !== 'send' && !confirmed) return;
    lock.current = true; pending('send'); setError(''); setMessage('');
    try {
      await call('send', { personalNote: preview.personalNote, expectedUpdatedAt: preview.expectedUpdatedAt, previewHash: preview.previewHash, action, confirmed });
      setMessage('Approval email accepted by the email provider. Creator approval is unchanged.'); setOpen(false);
    } catch (e) {
      const networkFailure = e instanceof Error && ['TimeoutError', 'AbortError', 'TypeError', 'SyntaxError'].includes(e.name);
      setError(e instanceof Error && !networkFailure ? e.message : 'Delivery could not be confirmed. Reload to check the result before sending another copy.');
      setUncertain(true); setOpen(false);
    }
    finally { setPreview(null); setConfirmed(false); lock.current = false; pending(null); }
  }

  return <section className="ph-no-capture ph-sensitive space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-busy={!!busy}>
    <div className="border-b border-border pb-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><Mail aria-hidden="true" className="size-5 text-primary" />Approval &amp; Communication</h2><p className="mt-3 text-xs leading-6 text-muted-foreground">Approval emails are sent only when an admin deliberately sends them. This does not activate a Workspace or collect payment.</p></div>
    <dl className="space-y-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><dt>Email status</dt><dd className="rounded-lg bg-muted px-3 py-1.5 font-medium" role="status">{busy === 'send' ? 'Sending' : APPROVAL_EMAIL_STATUS_LABELS[emailStatus]}</dd></div>
      {app.approvalEmailSentAt && <><div><dt className="text-xs text-muted-foreground">Last accepted by provider</dt><dd>{date(app.approvalEmailSentAt)}</dd></div><div><dt className="text-xs text-muted-foreground">Sent by</dt><dd className="break-all">{app.approvalEmailSenderName || app.approvalEmailSentBy || 'Admin no longer available'}</dd></div></>}
      {app.approvalEmailAttemptedAt && <div><dt className="text-xs text-muted-foreground">Last attempt</dt><dd>{date(app.approvalEmailAttemptedAt)}</dd></div>}
    </dl>
    {emailStatus === 'failed' && <p className="rounded-lg bg-muted/60 p-4 text-xs leading-6">{failureMessage} Creator approval is unchanged.</p>}
    {!isApproved && <p className="rounded-lg bg-muted/60 p-4 text-xs leading-6">Save the application as Approved to preview and send its approval email.</p>}
    {isApproved && <>
      {dirty && <p className="text-xs text-amber-800 dark:text-amber-300">Save or discard your review changes before sending communication.</p>}
      <div><label htmlFor="ws-approval-note" className="mb-2 block text-sm font-medium">Personal note <span className="text-xs text-muted-foreground">Optional · plain text only</span></label><Textarea id="ws-approval-note" value={note} rows={3} maxLength={1000} disabled={unavailable} onChange={e => { setNote(e.target.value); setPreview(null); setConfirmed(false); }} /><p className="mt-2 text-xs text-muted-foreground">{note.length}/1,000 characters. The full email template is controlled by AirBharath.</p></div>
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={unavailable} onClick={event => void showPreview(event.currentTarget)}>{busy === 'preview' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Eye aria-hidden="true" />}Preview Approval Email</Button><Button type="button" disabled={unavailable || !preview} onClick={event => { dialogReturnFocus.current = event.currentTarget; setOpen(true); }}><Mail aria-hidden="true" />{emailStatus === 'sent' ? 'Resend Approval Email' : emailStatus === 'failed' ? 'Retry Approval Email' : 'Send Approval Email'}</Button></div>
      {!preview && !unavailable && <p className="text-xs text-muted-foreground">Preview the exact email before enabling Send.</p>}
    </>}
    {(emailStatus === 'sending' || uncertain) && <div className="space-y-3 rounded-lg bg-muted/60 p-4 text-xs leading-6"><p>Reload to check the latest result. If Sending remains, have an operator check the provider before retrying; another copy may already have been accepted.</p><Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={onReload}>Reload communication status</Button></div>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">{message}</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); const target = dialogReturnFocus.current; if (target && !target.matches(':disabled')) target.focus(); }} className="workspace-ui workspace-dialog max-w-3xl ph-no-capture ph-sensitive"><DialogHeader className="pr-12"><DialogTitle>Approval email preview</DialogTitle><DialogDescription>The rendered template below is the email that will be sent. Sending is a separate action.</DialogDescription></DialogHeader>
      {preview && <><dl className="space-y-2 break-words text-sm"><div><dt className="text-xs text-muted-foreground">Subject</dt><dd className="font-semibold">{preview.subject}</dd></div><div><dt className="text-xs text-muted-foreground">Recipient</dt><dd>{preview.applicantName} · {preview.recipient}</dd></div><div><dt className="text-xs text-muted-foreground">Application reference</dt><dd className="font-mono text-xs">{preview.applicationReference}</dd></div></dl>
        <iframe title="Rendered Workspace approval email" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html} className="h-[50vh] min-h-72 w-full rounded-lg border bg-white" />
        {emailStatus !== 'not_sent' && <label className="workspace-check-label flex items-start gap-3 rounded-lg bg-muted p-4 text-sm leading-6"><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={e => setConfirmed(e.target.checked)} className="workspace-checkbox" /><span>I confirm that I checked the previous attempt and want to send another copy. Delivery may already have occurred.</span></label>}
        <Button type="button" disabled={unavailable || (emailStatus !== 'not_sent' && !confirmed)} onClick={send}>{busy === 'send' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Mail aria-hidden="true" />}{busy === 'send' ? 'Sending…' : emailStatus === 'sent' ? 'Confirm Resend Approval Email' : emailStatus === 'failed' ? 'Confirm Retry Approval Email' : 'Send Approval Email'}</Button>
      </>}
    </DialogContent></Dialog>
  </section>;
}
