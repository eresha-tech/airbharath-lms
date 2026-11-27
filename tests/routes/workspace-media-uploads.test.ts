import { beforeEach, expect, it } from 'vitest';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { mediaUploads } from '@/lib/workspace/media/uploads';
import { MediaError } from '@/lib/workspace/media/model';
import { RESOURCE_VERIFICATION_POLICY } from '@/lib/workspace/media/verification';
import { uploadFixture, checksum, mp4 } from './workspace-media-upload-fixtures';
import { now, evidence } from './workspace-creator-fixtures';

let f: ReturnType<typeof uploadFixture>;
beforeEach(() => { f = uploadFixture(); });
it('uses two-step reservation/authorization, preserving full intent idempotency and signing outside locks', async () => {
  const c = f.intent(), result = await f.uploads.intent(f.owner, c);
  expect((await f.uploads.intent(f.owner, c)).created).toBe(false);
  const auth = await f.uploads.authorize(f.owner, result.asset.id, { checksumSHA256: checksum(mp4) });
  expect(auth.upload.method).toBe('PUT'); expect(Date.parse(auth.upload.expiresAt) - now.getTime()).toBe(600000);
  expect(f.state.rows).toHaveLength(1); expect(f.state.providerCalls).toBe(1);
});
it('does not reserve or authorize against disabled/mismatched storage', async () => {
  await expect(mediaUploads(f.store, 'test', () => now).intent(f.owner, f.intent())).rejects.toMatchObject({ code: 'unavailable' });
  const r = await f.reserve(); f.provider.identity.container = 'other-private';
  await expect(f.uploads.authorize(f.owner, r.asset.id, { checksumSHA256: checksum(mp4) })).rejects.toMatchObject({ code: 'unavailable' }); expect(f.state.providerCalls).toBe(0);
});
it('finalizes video only to verified, without processing, attachment or playable access', async () => {
  const r = await f.reserve(), result = await f.uploads.finalize(f.owner, r.asset.id, {});
  expect(result.asset).toMatchObject({ status: 'verified', isAttached: false }); expect(f.state.rows[0]).toMatchObject({ objectVersionId: 'source-v1', checksum: checksum(mp4), processingJobId: null, outputKey: null });
  await expect(f.mutate(r.asset.id, 'attach')).rejects.toMatchObject({ code: 'not_ready' });
  await expect(f.uploads.download(f.owner, r.asset.id)).rejects.toMatchObject({ code: 'not_ready' });
});
it('concurrent/repeated finalization converges once without overwriting evidence or advancing revisions again', async () => {
  const r = await f.reserve(); await Promise.all([f.uploads.finalize(f.owner, r.asset.id, {}), f.uploads.finalize(f.owner, r.asset.id, {})]);
  const saved = structuredClone(f.state.rows), revision = f.state.lesson.mediaRevision, calls = f.state.providerCalls;
  await f.uploads.finalize(f.owner, r.asset.id, {});
  expect(f.state.rows).toEqual(saved); expect(f.state.lesson.mediaRevision).toBe(revision); expect(f.state.providerCalls).toBe(calls);
});
it('verified replacement leaves the prior playable attachment and captions selected', async () => {
  const old = await f.reserve(); Object.assign(f.state.rows[0], { status: 'ready', isAttached: true, objectVersionId: 'old-source' });
  const r = await f.reserve({ replacesAssetId: old.asset.id }); await f.uploads.finalize(f.owner, r.asset.id, {});
  expect(f.state.rows[0]).toMatchObject({ status: 'ready', isAttached: true }); expect(f.state.rows[1]).toMatchObject({ status: 'verified', isAttached: false });
});
it.each(['pdf', 'png', 'jpeg'])('validates %s resources before explicit attachment and authenticated downloads', async kind => {
  let bytes: Uint8Array;
  if (kind === 'pdf') { const pdf = await PDFDocument.create(); pdf.addPage(); bytes = await pdf.save(); }
  else { const image = sharp({ create: { width: 3, height: 3, channels: 3, background: '#223344' } }); bytes = await (kind === 'png' ? image.png() : image.jpeg()).toBuffer(); }
  const mimeType = kind === 'pdf' ? 'application/pdf' : `image/${kind}`;
  f.state.object = { versionId: 'resource-v1', checksum: checksum(bytes), prefix: bytes.slice(0,4096), bytes }; f.state.downloaded = bytes;
  const r = await f.reserve({ assetKind: 'resource', filename: `notes.${kind}`, mimeType, byteSize: bytes.length });
  const result = await f.uploads.finalize(f.owner, r.asset.id, {}); expect(result.asset).toMatchObject({ status: 'ready', isAttached: false });
  expect(f.state.rows[0].verificationPolicy).toBe(RESOURCE_VERIFICATION_POLICY);
  await expect(f.uploads.download(f.owner, r.asset.id)).rejects.toMatchObject({ code: 'not_ready' });
  await f.mutate(r.asset.id, 'attach'); expect((await f.uploads.download(f.owner, r.asset.id)).bytes).toEqual(bytes);
  await f.mutate(r.asset.id, 'detach'); await expect(f.uploads.download(f.owner, r.asset.id)).rejects.toMatchObject({ code: 'not_ready' });
});
it.each(['object_missing', 'unavailable'])('preserves recoverable intents after %s without exposing raw provider errors', async code => {
  const r = await f.reserve(); f.state.failure = new MediaError(code as 'object_missing' | 'unavailable');
  await expect(f.uploads.finalize(f.owner, r.asset.id, {})).rejects.toMatchObject({ code }); expect(f.state.rows[0].status).toBe('pending_upload');
  f.state.failure = undefined; expect((await f.uploads.finalize(f.owner, r.asset.id, {})).asset.status).toBe('verified');
});
it.each(['signature', 'version', 'checksum', 'structural'])('quarantines invalid %s evidence without attachment', async kind => {
  const r = await f.reserve(kind === 'structural' ? { assetKind: 'resource', filename: 'notes.pdf', mimeType: 'application/pdf' } : {});
  if (kind === 'signature') f.state.object.prefix = new Uint8Array(20);
  if (kind === 'version') f.state.object.versionId = 'null';
  if (kind === 'checksum') f.state.object.checksum = '';
  if (kind === 'structural') { const bytes = new TextEncoder().encode('%PDF-invalid-data'); f.state.object = { versionId: 'v1', checksum: checksum(bytes), prefix: bytes, bytes }; }
  await expect(f.uploads.finalize(f.owner, r.asset.id, {})).rejects.toMatchObject({ code: 'verification' }); expect(f.state.rows[0]).toMatchObject({ status: 'failed', isAttached: false });
});
it('does not expose captions endpoints or accept client-supplied finalization evidence', async () => {
  await expect(f.uploads.intent(f.owner, f.intent({ assetKind: 'caption', filename: 'x.vtt', mimeType: 'text/vtt', language: 'en', captionVideoId: f.key, captionSourceVersion: 'v1' }))).rejects.toMatchObject({ code: 'validation' });
  const r = await f.reserve(); await expect(f.uploads.finalize(f.owner, r.asset.id, { status: 'ready' })).rejects.toThrow();
});
it('rechecks revocation after signing or inspection; no authorization/evidence escapes', async () => {
  const r = await f.reserve(); f.state.onProvider = () => { f.state.context.evidence!.profileStatus = 'suspended'; };
  await expect(f.uploads.authorize(f.owner, r.asset.id, { checksumSHA256: checksum(mp4) })).rejects.toMatchObject({ code: 'forbidden' });
  f.state.context.evidence!.profileStatus = 'enabled';
  await expect(f.uploads.finalize(f.owner, r.asset.id, {})).rejects.toMatchObject({ code: 'forbidden' }); expect(f.state.rows[0].status).toBe('pending_upload');
});
it('checks expiry both before and after external work, and caps refreshed URLs at the original intent deadline', async () => {
  const r = await f.reserve(); f.state.clock = new Date(f.state.rows[0].expiresAt.getTime() - 1000);
  const auth = await f.uploads.authorize(f.owner, r.asset.id, { checksumSHA256: checksum(mp4) }); expect(auth.upload.expiresAt).toBe(f.state.rows[0].expiresAt.toISOString());
  f.state.onProvider = () => { f.state.clock = f.state.rows[0].expiresAt; };
  await expect(f.uploads.finalize(f.owner, r.asset.id, {})).rejects.toMatchObject({ code: 'expired' }); expect(f.state.rows[0].status).toBe('pending_upload');
});
it.each(['refunded', 'held', 'expired', 'cross_owner'])('rejects %s finalization before provider access', async state => {
  const r = await f.reserve(); let actor = f.owner;
  if (state === 'refunded') f.state.context.evidence!.refundedAt = now;
  if (state === 'held') f.state.context.financialReview = true;
  if (state === 'expired') f.state.clock = evidence.membership.endsAt;
  if (state === 'cross_owner') actor = f.other;
  await expect(f.uploads.finalize(actor, r.asset.id, {})).rejects.toBeInstanceOf(MediaError); expect(f.state.providerCalls).toBe(0);
});
