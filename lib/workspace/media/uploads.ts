import 'server-only';
import { enqueueVerifiedVideo } from './processing';
import { createHash } from 'node:crypto';
import { MediaError, UPLOAD_TTL_SECONDS, emptyMediaCommand, reserveCommand, uploadAuthorizationCommand } from './model';
import { assetReceipt, mediaService, mediaTransaction, type Asset, type MediaStore, type MediaTransaction } from './service';
import type { MediaStorage } from './provider';
import { CAPTION_POLICY, validatedCaption } from './captions';
import { fileSignature, verifyResource, RESOURCE_VERIFICATION_POLICY, VIDEO_VERIFICATION_POLICY } from './verification';

async function selected(tx: MediaTransaction, id: string) {
  const asset = (await tx.assets()).find(a => a.id === id); if (!asset) throw new MediaError('not_found'); return asset;
}
function storageMatches(provider: MediaStorage, asset: Asset) {
  if (provider.identity.provider !== asset.storageProvider || provider.identity.container !== asset.storageContainer || provider.identity.accountId !== asset.storageAccountId) throw new MediaError('unavailable');
}
export function downloadable(asset: Asset) {
  if (asset.assetKind !== 'resource' || asset.status !== 'ready' || !asset.isAttached || asset.verificationPolicy !== RESOURCE_VERIFICATION_POLICY || !asset.objectVersionId || !asset.checksum) throw new MediaError('not_ready');
}
export async function resourceBytes(provider: MediaStorage, asset: Asset, artwork = false) {
  downloadable(artwork?{...asset,isAttached:true}:asset); storageMatches(provider, asset);
  const bytes = await provider.download(asset);
  if (bytes.byteLength !== asset.byteSize || createHash('sha256').update(bytes).digest('hex') !== asset.checksum) throw new MediaError('verification');
  return bytes;
}
export function mediaUploads(store: MediaStore, environment: string | undefined, clock = () => new Date(), provider?: MediaStorage, automaticProcessing = false) {
  const domain = mediaService(store, environment, clock, provider?.identity);
  const run = <T>(actor: string, id: string, edit: boolean, work: (tx: MediaTransaction, permit: () => Date) => Promise<T>) => mediaTransaction(store, environment, clock, actor, { assetId: id }, edit, work);
  const storage = () => { if (!provider) throw new MediaError('unavailable'); return provider; };
  const finished = (a: Asset) => a.assetKind === 'video' ? ['verified', 'processing', 'ready'].includes(a.status) : a.status === 'ready';
  const receipt = async (tx: MediaTransaction, a: Asset) => ({ asset: assetReceipt(a), mediaRevision: (await tx.lesson()).mediaRevision });
  return {
    intent: async (actor: string, raw: unknown) => {
      storage(); const command = reserveCommand(raw);
      if (command.assetKind === 'caption') throw new MediaError('validation'); // Caption source is derived in captionIntent.
      return domain.reserve(actor, raw);
    },
    captionIntent: async (actor: string, videoId: string, raw: unknown) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k => !['filename', 'byteSize', 'language', 'requestKey', 'expectedMediaRevision'].includes(k))) throw new MediaError('validation');
      const video = await run(actor, videoId, true, async tx => { const a = await selected(tx, videoId); if (a.assetKind !== 'video' || a.status !== 'ready' || !a.isAttached || !a.objectVersionId) throw new MediaError('not_ready'); return a; });
      storage();
      return domain.reserve(actor, { ...raw, lessonId: video.lessonId, assetKind: 'caption', mimeType: 'text/vtt', captionVideoId: video.id, captionSourceVersion: video.objectVersionId });
    },
    authorize: async (actor: string, id: string, raw: unknown) => {
      const checksum = uploadAuthorizationCommand(raw);
      const asset = await run(actor, id, true, async (tx, permit) => {
        const a = await selected(tx, id);
        if (a.status !== 'pending_upload') throw new MediaError('conflict');
        if (a.expiresAt <= permit()) throw new MediaError('expired'); return a;
      });
      const adapter = storage(); storageMatches(adapter, asset);
      const seconds = Math.min(UPLOAD_TTL_SECONDS, Math.floor((asset.expiresAt.getTime() - clock().getTime()) / 1000));
      if (seconds < 1) throw new MediaError('expired');
      // Signing/credential work is outside DB locks. Conditional PUT cannot overwrite an existing source.
      const upload = await adapter.authorize(asset, checksum, seconds);
      return run(actor, id, true, async (tx, permit) => {
        const current = await selected(tx, id);
        if (current.status !== 'pending_upload' || current.version !== asset.version) throw new MediaError('conflict');
        const expiresAt = Date.parse(upload.expiresAt);
        if (!Number.isFinite(expiresAt) || expiresAt > current.expiresAt.getTime()) throw new MediaError('unavailable');
        if (current.expiresAt <= permit() || expiresAt <= clock().getTime()) throw new MediaError('expired');
        return { ...await receipt(tx, current), upload };
      });
    },
    finalize: async (actor: string, id: string, raw: unknown) => {
      emptyMediaCommand(raw);
      const prior = await run(actor, id, true, async (tx, permit) => {
        const a = await selected(tx, id);
        if (finished(a)) { const current=automaticProcessing&&a.assetKind==='video'&&a.status==='verified'?await enqueueVerifiedVideo(tx,a,permit()):a;return { done:true as const,receipt:await receipt(tx,current)}; }
        if (!['pending_upload', 'uploaded'].includes(a.status)) throw new MediaError('conflict');
        if (a.expiresAt <= permit()) throw new MediaError('expired'); return { done: false as const, asset: a };
      });
      if (prior.done) return prior.receipt;
      const adapter = storage(), asset = prior.asset; storageMatches(adapter, asset);
      let object;
      try {
        object = await adapter.inspect(asset);
        if (!object.versionId || object.versionId === 'null' || !/^[a-f0-9]{64}$/.test(object.checksum) || asset.assetKind !== 'caption' && !fileSignature(asset, object.prefix)) throw new MediaError('verification');
        if (asset.assetKind === 'caption') { if (!object.bytes) throw new MediaError('verification'); validatedCaption(asset, object.bytes, object.checksum); }
        if (asset.assetKind === 'resource') {
          if (!object.bytes) throw new MediaError('verification');
          await verifyResource(asset, object.bytes, object.checksum);
        }
      } catch (error) {
        if (!(error instanceof MediaError) || error.code !== 'verification') throw error; // Missing/transient reads retain recoverable intent.
        const outcome = await run(actor, id, true, async (tx, permit) => {
          const current = await selected(tx, id);
          if (finished(current)) return receipt(tx, current);
          if (current.version !== asset.version || !['pending_upload', 'uploaded'].includes(current.status)) throw new MediaError('conflict');
          await tx.update(current, { status: 'failed', updatedAt: permit() }); return null;
        });
        if (outcome) return outcome;
        throw error;
      }
      return run(actor, id, true, async (tx, permit) => {
        let current = await selected(tx, id);
        if (finished(current)) return receipt(tx, current); // Concurrent finalize converges without another revision.
        if (current.version !== asset.version || !['pending_upload', 'uploaded'].includes(current.status)) throw new MediaError('conflict');
        const now = permit(); if (current.expiresAt <= now) throw new MediaError('expired');
        if (current.objectVersionId && current.objectVersionId !== object.versionId) throw new MediaError('verification');
        if (current.status === 'pending_upload') current = await tx.update(current, { status: 'uploaded', objectVersionId: object.versionId, uploadedAt: now, updatedAt: now });
        current = await tx.update(current, { status: 'verified', checksum: object.checksum, verificationPolicy: current.assetKind === 'resource' ? RESOURCE_VERIFICATION_POLICY : current.assetKind === 'caption' ? CAPTION_POLICY : VIDEO_VERIFICATION_POLICY, verifiedAt: now, updatedAt: now });
        if (current.assetKind !== 'video') current = await tx.update(current, { status: 'ready', readyAt: now, updatedAt: now });
        if(automaticProcessing && current.assetKind==='video') current=await enqueueVerifiedVideo(tx,current,permit());
        // The verified source and durable dispatch intent commit together; selection remains explicit.
        return receipt(tx, current);
      });
    },
    download: async (actor: string, id: string) => {
      const asset = await run(actor, id, false, async tx => { const a = await selected(tx, id); downloadable(a); return a; });
      const bytes = await resourceBytes(storage(), asset);
      return run(actor, id, false, async tx => {
        const current = await selected(tx, id); downloadable(current);
        if (current.objectVersionId !== asset.objectVersionId || current.checksum !== asset.checksum) throw new MediaError('conflict');
        return { bytes, displayName: current.displayName, mimeType: current.mimeType };
      });
    },
  };
}
