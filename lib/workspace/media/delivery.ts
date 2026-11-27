import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { workspaceMediaJobs } from '@/lib/db/schema';
import { environment } from '../creator/model';
import { postgresMediaStore, inspectMedia } from './repository';
import { mediaTransaction, type Asset } from './service';
import { processingConfig, processingProvider, playlistReferences, outputName } from './processing-provider';
import { workspaceMediaStorage } from './runtime';
import { CAPTION_POLICY, validatedCaption } from './captions';
import { PROCESSING_POLICY } from './processing';
import { MediaError } from './model';
import { privateBytesResponse, privateObjectResponse } from './streaming';
import { sourceDelivery } from './source-delivery';
export type DeliveryActor = { creator: string } | { admin: string; project: string };
async function authorized(actor: DeliveryActor, id: string) {
  if ('admin' in actor) return (await inspectMedia(actor.admin, actor.project, { assetId: id }))[0];
  return mediaTransaction(postgresMediaStore, environment(), () => new Date(), actor.creator, { assetId: id }, false, async tx => {
    const a = (await tx.assets()).find(a => a.id === id); if (!a) throw new MediaError('not_found'); return a;
  });
}
function attached(a: Asset) { if (a.status !== 'ready' || !a.isAttached) throw new MediaError('not_ready'); }
export async function privateMediaDelivery(actor: DeliveryActor, id: string, name: string, base: string, request = new Request('http://localhost')) {
  const asset = await authorized(actor, id); attached(asset);
  const recheck = async () => { const current = await authorized(actor, id); attached(current); if (asset.version !== current.version) throw new MediaError('conflict'); };
  if (name === 'source.mp4') return sourceDelivery(request, workspaceMediaStorage(), asset, recheck, true);
  let bytes: Uint8Array, type: string;
  if (name === 'captions.vtt') {
    if (asset.assetKind !== 'caption' || asset.verificationPolicy !== CAPTION_POLICY || !asset.checksum) throw new MediaError('not_ready');
    bytes = await workspaceMediaStorage().download(asset,request.signal); validatedCaption(asset, bytes, asset.checksum); type = 'text/vtt; charset=utf-8';
  } else {
    outputName(name);
    if (asset.assetKind !== 'video' || asset.processingPolicy !== PROCESSING_POLICY) throw new MediaError('not_ready');
    const [job] = await db.select().from(workspaceMediaJobs).where(eq(workspaceMediaJobs.assetId, id));
    const evidence = job?.manifest?.[name];
    if (!job || job.state !== 'complete' || job.id !== asset.processingJobId || job.sourceVersion !== asset.objectVersionId || !evidence || job.manifest?.['master.m3u8']?.version !== asset.outputVersionId) throw new MediaError('not_ready');
    const provider = processingProvider(processingConfig());
    if (!name.endsWith('.m3u8')) return privateObjectResponse(request, { size: evidence.size, type: 'video/mp2t', checksum: evidence.checksum,
      open: (range, signal, head) => provider.open(asset, name, evidence, range, signal, head),
    }, recheck);
    bytes = await provider.read(asset, name, evidence,request.signal);
    if (name.endsWith('.m3u8')) {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes), refs = playlistReferences(text);
      if (refs.some(r => !job.manifest?.[r])) throw new MediaError('verification');
      bytes = new TextEncoder().encode(text.split(/\r?\n/).map(line => line && !line.startsWith('#') ? `${base}/${encodeURIComponent(line)}` : line).join('\n'));
      type = 'application/vnd.apple.mpegurl';
    } else type = 'video/mp2t';
  }
  const current = await authorized(actor, id); attached(current);
  if (asset.version !== current.version) throw new MediaError('conflict');
  return privateBytesResponse(request, bytes, type, undefined, recheck);
}
