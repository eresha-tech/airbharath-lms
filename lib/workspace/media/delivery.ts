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
export type DeliveryActor = { creator: string } | { admin: string; project: string };
async function authorized(actor: DeliveryActor, id: string) {
  if ('admin' in actor) return (await inspectMedia(actor.admin, actor.project, { assetId: id }))[0];
  return mediaTransaction(postgresMediaStore, environment(), () => new Date(), actor.creator, { assetId: id }, false, async tx => {
    const a = (await tx.assets()).find(a => a.id === id); if (!a) throw new MediaError('not_found'); return a;
  });
}
function attached(a: Asset) { if (a.status !== 'ready' || !a.isAttached) throw new MediaError('not_ready'); }
export async function privateMediaDelivery(actor: DeliveryActor, id: string, name: string, base: string) {
  const asset = await authorized(actor, id); attached(asset);
  let bytes: Uint8Array, type: string;
  if (name === 'captions.vtt') {
    if (asset.assetKind !== 'caption' || asset.verificationPolicy !== CAPTION_POLICY || !asset.checksum) throw new MediaError('not_ready');
    bytes = await workspaceMediaStorage().download(asset); validatedCaption(asset, bytes, asset.checksum); type = 'text/vtt; charset=utf-8';
  } else {
    outputName(name);
    if (asset.assetKind !== 'video' || asset.processingPolicy !== PROCESSING_POLICY) throw new MediaError('not_ready');
    const [job] = await db.select().from(workspaceMediaJobs).where(eq(workspaceMediaJobs.assetId, id));
    const evidence = job?.manifest?.[name];
    if (!job || job.state !== 'complete' || job.id !== asset.processingJobId || job.sourceVersion !== asset.objectVersionId || !evidence || job.manifest?.['master.m3u8']?.version !== asset.outputVersionId) throw new MediaError('not_ready');
    bytes = await processingProvider(processingConfig()).read(asset, name, evidence);
    if (name.endsWith('.m3u8')) {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes), refs = playlistReferences(text);
      if (refs.some(r => !job.manifest?.[r])) throw new MediaError('verification');
      bytes = new TextEncoder().encode(text.split(/\r?\n/).map(line => line && !line.startsWith('#') ? `${base}/${encodeURIComponent(line)}` : line).join('\n'));
      type = 'application/vnd.apple.mpegurl';
    } else type = 'video/mp2t';
  }
  const current = await authorized(actor, id); attached(current);
  if (asset.version !== current.version) throw new MediaError('conflict');
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type, 'Content-Length': String(bytes.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer', Vary: 'Cookie, Authorization' } });
}
