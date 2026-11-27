import { createHash, randomUUID } from 'node:crypto';
import type { workspaceMediaJobs, workspaceCourseAssets } from '@/lib/db/schema';
import type { CreatorContext } from '../creator/service';
import { creatorCapabilities } from '../creator/model';
import { MediaError, mediaId, reserveCommand, assetCommand, MAX_RESOURCES, MAX_CAPTIONS, MAX_LESSON_ASSETS, INTENT_LIFETIME_MS } from './model';
import type { VerificationCheckpoint, VerificationProgress } from './verification-checkpoint';

export type Asset = typeof workspaceCourseAssets.$inferSelect & {processingState?: MediaJob['state']};
export type AssetPatch = Partial<Pick<Asset, 'status' | 'isAttached' | 'resourcePosition' | 'displayName' | 'detachedAt' | 'updatedAt' | 'objectVersionId' | 'checksum' | 'verificationPolicy' | 'uploadedAt' | 'verifiedAt' | 'readyAt' | 'processingJobId' | 'processingSourceVersion' | 'processingPolicy' | 'outputKey' | 'outputVersionId'>>;
export type MediaReference = { lessonId: string } | { assetId: string } | { projectId:string };
export type StorageIdentity = { provider: 's3'; container: string; accountId: string };
export type MediaLesson = { id: string; projectId: string; userId: string; mediaRevision: number; artwork?: boolean };
export type MediaJob = typeof workspaceMediaJobs.$inferSelect;
export interface MediaTransaction {
  processing?: { read(): Promise<MediaJob | null>; create(job: MediaJob): Promise<MediaJob>; update(job: MediaJob, patch: Partial<Pick<MediaJob, 'state' | 'providerJobId' | 'dispatchedAt' | 'manifest' | 'updatedAt'>>): Promise<MediaJob>;
    checkpoint?(jobId: string): Promise<VerificationCheckpoint | null>;
    saveCheckpoint?(job: MediaJob, providerJobId: string, version: number, progress: VerificationProgress): Promise<VerificationCheckpoint>;
  };
  context: CreatorContext;
  lesson(): Promise<MediaLesson>;
  assets(): Promise<Asset[]>;
  request(key: string): Promise<Asset | null>;
  create(asset: Asset): Promise<Asset>;
  update(asset: Asset, patch: AssetPatch): Promise<Asset>;
}
export interface MediaStore {
  transaction<T>(actor: string, reference: MediaReference, work: (tx: MediaTransaction) => Promise<T>): Promise<T>;
}
// Explicit allowlist: ordinary metadata never contains bucket/key/version IDs, hashes or signed URLs.
export function assetReceipt(a: Asset) {
  return { ...(a.processingState?{processingState:a.processingState}:{}),id: a.id, lessonId: a.lessonId, assetKind: a.assetKind, displayName: a.displayName, mimeType: a.mimeType, byteSize: a.byteSize,
    status: a.status, isAttached: a.isAttached, resourcePosition: a.resourcePosition, replacesAssetId: a.replacesAssetId,
    replacementVersion: a.replacementVersion, captionVideoId: a.captionVideoId, language: a.language, version: a.version,
    createdAt: a.createdAt, updatedAt: a.updatedAt, expiresAt: a.expiresAt };
}
const active = (a: Asset) => !['failed', 'detached'].includes(a.status);
const resources = (rows: Asset[]) => rows.filter(a => a.assetKind === 'resource' && a.isAttached).sort((a, b) => a.resourcePosition! - b.resourcePosition!);

// Shared with provider orchestration; each invocation owns only a DB transaction.
export async function mediaTransaction<T>(store: MediaStore, environment: string | undefined, clock: () => Date, actor: string, reference: MediaReference, edit: boolean, work: (tx: MediaTransaction, permit: () => Date) => Promise<T>) {
    mediaId(actor); mediaId('lessonId' in reference ? reference.lessonId : 'projectId' in reference ? reference.projectId : reference.assetId);
    return store.transaction(actor, reference, async tx => {
      const permit = () => {
        const now = clock(), c = tx.context;
        const capabilities = creatorCapabilities(c.evidence, now, environment, c.financialReview, c.grant);
        if (c.user.id !== actor || !c.profileId || !(edit ? capabilities.canEditWorkspace : capabilities.canViewCreatorWorkspace)) throw new MediaError('forbidden');
        return now;
      };
      permit();
      const lesson = await tx.lesson();
      if (lesson.userId !== actor || 'lessonId' in reference && lesson.id !== reference.lessonId) throw new MediaError('not_found');
      permit();
      const result = await work(tx, permit); permit(); return result;
    });
}

export function mediaService(store: MediaStore, environment: string | undefined, clock = () => new Date(), storage?: StorageIdentity) {
  const run = <T>(actor: string, reference: MediaReference, edit: boolean, work: (tx: MediaTransaction, permit: () => Date) => Promise<T>) => mediaTransaction(store, environment, clock, actor, reference, edit, work);
  async function revision(tx: MediaTransaction, expected: number) {
    if ((await tx.lesson()).mediaRevision !== expected) throw new MediaError('conflict');
  }
  async function result(tx: MediaTransaction) {
    return { mediaRevision: (await tx.lesson()).mediaRevision, assets: (await tx.assets()).map(assetReceipt) };
  }
  async function reorder(tx: MediaTransaction, rows: Asset[], permit: () => Date) {
    for (const [position, a] of rows.entries()) if (a.resourcePosition !== position) await tx.update(a, { resourcePosition: position, updatedAt: permit() });
  }
  return {
    list: (actor: string, lessonId: string) => run(actor, { lessonId }, false, async tx => result(tx)),
    read: (actor: string, assetId: string) => run(actor, { assetId }, false, async tx => {
      const asset = (await tx.assets()).find(a => a.id === assetId); if (!asset) throw new MediaError('not_found');
      return { asset: assetReceipt(asset), mediaRevision: (await tx.lesson()).mediaRevision };
    }),
    reserve: (actor: string, raw: unknown, projectScope?: string) => {
      const c = reserveCommand(raw), contextHash = createHash('sha256').update(JSON.stringify(projectScope?{...c,scope:'course_cover'}:c)).digest('hex');
      return run(actor, projectScope?{projectId:projectScope}:{lessonId:c.lessonId}, true, async (tx, permit) => {
        const lesson = await tx.lesson(), prior = await tx.request(c.requestKey);
        if(projectScope && (!lesson.artwork || c.assetKind!=='resource' || !['image/png','image/jpeg'].includes(c.mimeType)))throw new MediaError('validation');
        if (prior) {
          if (prior.lessonId !== (lesson.artwork?null:lesson.id) || prior.projectId !== lesson.projectId || prior.contextHash !== contextHash) throw new MediaError('conflict');
          if (!active(prior) || prior.status === 'pending_upload' && prior.expiresAt <= permit()) throw new MediaError('expired');
          return { asset: assetReceipt(prior), mediaRevision: lesson.mediaRevision, created: false };
        }
        await revision(tx, c.expectedMediaRevision);
        if (!storage || storage.provider !== 's3' || !/^[0-9]{12}$/.test(storage.accountId) || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(storage.container)) throw new MediaError('unavailable');
        let rows = await tx.assets();
        if (rows.length >= MAX_LESSON_ASSETS) throw new MediaError('limit');
        // Expiry is durable; expired pending intents no longer reserve a video/resource slot.
        for (const a of rows) if (a.status === 'pending_upload' && a.expiresAt <= permit()) await tx.update(a, { status: 'failed', updatedAt: permit() });
        rows = await tx.assets();
        const video = rows.find(a => a.assetKind === 'video' && a.isAttached);
        if (c.assetKind === 'video') {
          if ((video?.id || null) !== c.replacesAssetId || rows.some(a => a.assetKind === 'video' && active(a) && !a.isAttached)) throw new MediaError('conflict');
        } else if (c.assetKind === 'resource') {
          if (!lesson.artwork && rows.filter(a => a.assetKind === 'resource' && active(a)).length >= MAX_RESOURCES) throw new MediaError('limit');
        } else {
          if (!video || video.id !== c.captionVideoId || video.objectVersionId !== c.captionSourceVersion) throw new MediaError('conflict');
          if (rows.filter(a => a.assetKind === 'caption' && active(a)).length >= MAX_CAPTIONS || rows.some(a => a.assetKind === 'caption' && a.captionVideoId === video.id && a.language === c.language && active(a))) throw new MediaError('limit');
        }
        const now = permit(), id = randomUUID();
        const asset = await tx.create({ id, userId: actor, creatorProfileId: tx.context.profileId!, projectId: lesson.projectId, lessonId: lesson.artwork?null:lesson.id,
          assetKind: c.assetKind, filename: c.filename, displayName: c.filename, mimeType: c.mimeType, byteSize: c.byteSize,
          storageProvider: storage.provider, storageContainer: storage.container, storageAccountId: storage.accountId,
          storageKey: `workspace/${tx.context.profileId}/${lesson.projectId}/${id}/source`,
          status: 'pending_upload', objectVersionId: null, checksum: null, verificationPolicy: null,
          processingJobId: null, processingSourceVersion: null, processingPolicy: null, outputKey: null, outputVersionId: null,
          replacesAssetId: c.replacesAssetId, replacementVersion: c.assetKind === 'video' ? Math.max(0, ...rows.map(a => a.replacementVersion || 0)) + 1 : null,
          captionVideoId: c.captionVideoId, captionSourceVersion: c.captionSourceVersion, language: c.language,
          isAttached: false, resourcePosition: null, requestKey: c.requestKey, contextHash, version: 1,
          createdAt: now, updatedAt: now, expiresAt: new Date(now.getTime() + INTENT_LIFETIME_MS), uploadedAt: null, verifiedAt: null, readyAt: null, detachedAt: null });
        return { asset: assetReceipt(asset), mediaRevision: (await tx.lesson()).mediaRevision, created: true };
      });
    },
    mutate: (actor: string, assetId: string, raw: unknown) => {
      const c = assetCommand(raw);
      return run(actor, { assetId }, true, async (tx, permit) => {
        await revision(tx, c.expectedMediaRevision);
        const rows = await tx.assets(), a = rows.find(a => a.id === assetId);
        if (!a) throw new MediaError('not_found');
        if (a.version !== c.expectedVersion || a.status === 'detached') throw new MediaError('conflict');
        const write = (asset: Asset, patch: AssetPatch) => tx.update(asset, { ...patch, updatedAt: permit() });
        const detach = async (asset: Asset) => {
          await write(asset, { status: 'detached', isAttached: false, resourcePosition: null, detachedAt: permit() });
          if (asset.assetKind === 'video') for (const caption of rows.filter(r => r.captionVideoId === asset.id && r.status !== 'detached')) await write(caption, { status: 'detached', isAttached: false, detachedAt: permit() });
        };
        if((await tx.lesson()).artwork && c.action!=='detach')throw new MediaError('validation');
        if (c.action === 'detach') {
          // Cancel a pending replacement before removing its selected predecessor.
          if (rows.some(r => r.replacesAssetId === a.id && active(r) && !r.isAttached)) throw new MediaError('conflict');
          await detach(a);
          if (a.assetKind === 'resource') await reorder(tx, resources(rows).filter(r => r.id !== a.id), permit);
        } else if (c.action === 'attach') {
          if (a.status !== 'ready' || a.isAttached) throw new MediaError('not_ready');
          if (a.assetKind === 'video') {
            const current = rows.find(r => r.assetKind === 'video' && r.isAttached);
            if ((current?.id || null) !== a.replacesAssetId) throw new MediaError('conflict');
            if (current) await detach(current);
          } else if (a.assetKind === 'caption') {
            if (!rows.some(r => r.id === a.captionVideoId && r.isAttached && r.assetKind === 'video' && r.objectVersionId === a.captionSourceVersion)) throw new MediaError('conflict');
          }
          await write(a, { isAttached: true, resourcePosition: a.assetKind === 'resource' ? resources(rows).length : null });
        } else {
          if (!a.isAttached || a.assetKind !== 'resource') throw new MediaError('conflict');
          if (c.action === 'rename') await write(a, { displayName: c.displayName! });
          else {
            const ordered = resources(rows), index = ordered.findIndex(r => r.id === a.id), next = index + (c.direction === 'up' ? -1 : 1);
            if (next >= 0 && next < ordered.length) { [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; await reorder(tx, ordered, permit); }
          }
        }
        return result(tx);
      });
    },
  };
}
