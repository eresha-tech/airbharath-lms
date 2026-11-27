import { expect, it } from 'vitest';
import { reserveCommand, assetCommand, displayName, permitsMediaTransition, MAX_VIDEO_BYTES, MAX_RESOURCE_BYTES } from '@/lib/workspace/media/model';
import { lessonContent } from '@/lib/workspace/builder/model';
import { key, owner } from './workspace-creator-fixtures';

const base = { lessonId: owner, assetKind: 'video', filename: 'lesson.mp4', mimeType: 'video/mp4', byteSize: 100, requestKey: key, expectedMediaRevision: 0 };
it('requires verified video processing and prevents resurrection or direct upload-to-ready transitions', () => {
  expect(permitsMediaTransition('video', 'pending_upload', 'ready')).toBe(false);
  expect(permitsMediaTransition('video', 'verified', 'ready')).toBe(false);
  expect(permitsMediaTransition('video', 'verified', 'processing')).toBe(true);
  expect(permitsMediaTransition('video', 'processing', 'ready')).toBe(true);
  expect(permitsMediaTransition('resource', 'verified', 'ready')).toBe(true);
  expect(permitsMediaTransition('caption', 'verified', 'processing')).toBe(false);
  expect(permitsMediaTransition('video', 'failed', 'ready')).toBe(false);
  expect(permitsMediaTransition('video', 'detached', 'ready')).toBe(false);
});
it('normalizes explicit metadata without accepting storage identity or owner fields', () => {
  expect(reserveCommand({ ...base, filename: '  lesson.mp4  ' })).toMatchObject({ filename: 'lesson.mp4', replacesAssetId: null });
  for (const field of ['storageKey', 'userId', 'status', 'outputKey', 'url', 'verificationPolicy']) expect(() => reserveCommand({ ...base, [field]: 'forged' })).toThrow('validation');
});
it.each([
  { filename: 'lesson.mov' }, { byteSize: 0 }, { byteSize: MAX_VIDEO_BYTES + 1 }, { byteSize: 1.5 },
  { mimeType: 'image/png' }, { expectedMediaRevision: -1 }, { expectedMediaRevision: '0' },
  { language: 'en' }, { filename: '../lesson.mp4' }, { filename: 'hidden\u202efile.mp4' },
])('rejects invalid media intent %j', change => expect(() => reserveCommand({ ...base, ...change })).toThrow());
it.each([['pdf', 'application/pdf'], ['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg']])('allows bounded %s resources', (ext, mimeType) => {
  const resource = { ...base, assetKind: 'resource', filename: `notes.${ext}`, mimeType, byteSize: MAX_RESOURCE_BYTES };
  expect(reserveCommand(resource).assetKind).toBe('resource');
  expect(() => reserveCommand({ ...resource, byteSize: MAX_RESOURCE_BYTES + 1 })).toThrow();
  expect(() => reserveCommand({ ...resource, replacesAssetId: key })).toThrow();
});
it.each(['svg', 'gif', 'html', 'exe', 'webp'])('does not silently classify unsupported %s as PDF', ext => expect(() => reserveCommand({ ...base, assetKind: 'resource', filename: `notes.${ext}`, mimeType: 'application/pdf' })).toThrow());
it('requires caption provenance and language, and rejects caption fields for other kinds', () => {
  const caption = { ...base, assetKind: 'caption', filename: 'english.vtt', mimeType: 'text/vtt', captionVideoId: key, captionSourceVersion: 'source-v1', language: 'en' };
  expect(reserveCommand(caption)).toMatchObject({ captionVideoId: key, language: 'en' });
  expect(() => reserveCommand({ ...caption, captionSourceVersion: '' })).toThrow();
  expect(() => reserveCommand({ ...caption, language: 'english' })).toThrow();
});
it('validates strict versioned attachment commands and safe display names', () => {
  expect(assetCommand({ action: 'move', expectedVersion: 1, expectedMediaRevision: 0, direction: 'up' }).direction).toBe('up');
  for (const bad of [{ action: 'attach', displayName: 'name' }, { action: 'move', direction: 'left' }, { action: 'detach', expectedVersion: 0 }, { action: 'rename' }, { action: 'delete' }]) expect(() => assetCommand({ expectedVersion: 1, expectedMediaRevision: 0, ...bad })).toThrow();
  for (const value of ['', '.hidden', 'unsafe/name', 'unsafe:name', '<script>', 'line\nname']) expect(() => displayName(value)).toThrow();
});
it('keeps old Builder input valid and format changes explicit', () => {
  expect(lessonContent({ title: 'Existing lesson', content: 'Unchanged plain text' })).toEqual({ title: 'Existing lesson', content: 'Unchanged plain text', summary: '' });
  expect(lessonContent({ title: 'Formatted lesson', content: '# Heading', contentFormat: 'markdown' }).contentFormat).toBe('markdown');
  expect(() => lessonContent({ title: 'Unsafe format', contentFormat: 'html' })).toThrow();
  expect(() => lessonContent({ title: 'Forged revision', mediaRevision: 42 })).toThrow();
});
