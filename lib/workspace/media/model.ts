// Browser-safe contracts. Storage identity and provider evidence never belong in commands.
import { UUID } from '../eligibility/model';

export const CONTENT_FORMATS = ['plain_text', 'markdown'] as const;
export type ContentFormat = typeof CONTENT_FORMATS[number];
export const ASSET_STATES = ['pending_upload', 'uploaded', 'verified', 'processing', 'ready', 'failed', 'detached'] as const;
export type AssetState = typeof ASSET_STATES[number];
export type AssetKind = 'video' | 'resource' | 'caption';
// Provider adapters in later phases must establish this evidence server-side;
// these types are not client commands and no 1.9A route accepts them.
export type ObjectProvenance = { objectVersionId: string; checksum: string; verificationPolicy: string };
export type ProcessingProvenance = { jobId: string; sourceObjectVersion: string; policy: string; outputKey: string; outputVersionId: string };
export type CaptionProvenance = { videoAssetId: string; sourceObjectVersion: string; language: string };
export function permitsMediaTransition(kind: AssetKind, from: AssetState, to: AssetState) {
  if (from === 'detached') return false;
  if (to === from || to === 'detached') return true;
  if (from === 'pending_upload') return to === 'uploaded' || to === 'failed';
  if (from === 'uploaded') return to === 'verified' || to === 'failed';
  if (from === 'verified') return to === 'failed' || (kind === 'video' ? to === 'processing' : to === 'ready');
  return from === 'processing' && kind === 'video' && (to === 'ready' || to === 'failed');
}
export const MAX_VIDEO_BYTES = 2 * 1024 ** 3;
export const MAX_RESOURCE_BYTES = 20 * 1024 ** 2;
export const MAX_CAPTION_BYTES = 1024 ** 2;
export const MAX_RESOURCES = 10, MAX_CAPTIONS = 16, MAX_LESSON_ASSETS = 200;
export const INTENT_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_TTL_SECONDS = 600;
export const MEDIA_BODY_LIMIT = 8192;
export const RESOURCE_TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
export class MediaError extends Error {
  constructor(public code: 'authentication' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'limit' | 'expired' | 'not_ready' | 'object_missing' | 'verification' | 'too_large' | 'unavailable') { super(code); }
}
export function mediaId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new MediaError('not_found');
  return value;
}
export function mediaVersion(value: unknown, zero = false): number {
  if (!Number.isInteger(value) || Number(value) < (zero ? 0 : 1) || Number(value) > 2_147_483_646) throw new MediaError('validation');
  return Number(value);
}
function record(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new MediaError('validation');
  return value as Record<string, unknown>;
}
export function emptyMediaCommand(raw: unknown) { record(raw, []); }
export function uploadAuthorizationCommand(raw: unknown) {
  const i = record(raw, ['checksumSHA256']);
  if (typeof i.checksumSHA256 !== 'string' || !/^[a-f0-9]{64}$/.test(i.checksumSHA256)) throw new MediaError('validation');
  return i.checksumSHA256;
}
export function displayName(value: unknown) {
  if (typeof value !== 'string') throw new MediaError('validation');
  const name = value.normalize('NFC').trim();
  if (!name || name.length > 180 || /[<>\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069/\\:]/u.test(name) || name.startsWith('.') || name.endsWith('.')) throw new MediaError('validation');
  return name;
}
export function reserveCommand(raw: unknown) {
  const i = record(raw, ['lessonId', 'assetKind', 'filename', 'mimeType', 'byteSize', 'requestKey', 'expectedMediaRevision', 'replacesAssetId', 'captionVideoId', 'captionSourceVersion', 'language']);
  const lessonId = mediaId(i.lessonId), requestKey = mediaId(i.requestKey), filename = displayName(i.filename);
  const expectedMediaRevision = mediaVersion(i.expectedMediaRevision, true);
  if (i.assetKind !== 'video' && i.assetKind !== 'resource' && i.assetKind !== 'caption') throw new MediaError('validation');
  const assetKind: AssetKind = i.assetKind, ext = filename.split('.').at(-1)?.toLowerCase() || '';
  const mimeType = assetKind === 'video' && ext === 'mp4' ? 'video/mp4' : assetKind === 'caption' && ext === 'vtt' ? 'text/vtt' : assetKind === 'resource' ? RESOURCE_TYPES[ext] : undefined;
  const max = assetKind === 'video' ? MAX_VIDEO_BYTES : assetKind === 'caption' ? MAX_CAPTION_BYTES : MAX_RESOURCE_BYTES;
  if (!mimeType || mimeType !== i.mimeType || !Number.isSafeInteger(i.byteSize) || Number(i.byteSize) < 1 || Number(i.byteSize) > max) throw new MediaError('validation');
  if (assetKind !== 'video' && i.replacesAssetId !== undefined) throw new MediaError('validation');
  if (assetKind !== 'caption' && [i.captionVideoId, i.captionSourceVersion, i.language].some(v => v !== undefined)) throw new MediaError('validation');
  if (assetKind === 'caption' && (typeof i.language !== 'string' || !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(i.language) || typeof i.captionSourceVersion !== 'string' || !i.captionSourceVersion || i.captionSourceVersion.length > 1024)) throw new MediaError('validation');
  return { lessonId, requestKey, filename, assetKind, mimeType, byteSize: Number(i.byteSize), expectedMediaRevision,
    replacesAssetId: i.replacesAssetId == null ? null : mediaId(i.replacesAssetId),
    captionVideoId: assetKind === 'caption' ? mediaId(i.captionVideoId) : null,
    captionSourceVersion: assetKind === 'caption' ? String(i.captionSourceVersion) : null,
    language: assetKind === 'caption' ? String(i.language) : null };
}
export function assetCommand(raw: unknown) {
  const i = record(raw, ['action', 'expectedVersion', 'expectedMediaRevision', 'displayName', 'direction']);
  if (!['attach', 'detach', 'rename', 'move'].includes(String(i.action))) throw new MediaError('validation');
  if (i.action !== 'rename' && i.displayName !== undefined || i.action !== 'move' && i.direction !== undefined) throw new MediaError('validation');
  if (i.action === 'move' && i.direction !== 'up' && i.direction !== 'down') throw new MediaError('validation');
  return { action: i.action as 'attach' | 'detach' | 'rename' | 'move', expectedVersion: mediaVersion(i.expectedVersion), expectedMediaRevision: mediaVersion(i.expectedMediaRevision, true),
    ...(i.action === 'rename' ? { displayName: displayName(i.displayName) } : {}), ...(i.action === 'move' ? { direction: i.direction as 'up' | 'down' } : {}) };
}
