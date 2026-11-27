import 'server-only';
import { createHash } from 'node:crypto';
import { WebVTTParser } from 'webvtt-parser';
import { MediaError, MAX_CAPTION_BYTES } from './model';
import type { Asset } from './service';
export const CAPTION_POLICY = 'workspace-plain-vtt-v1';
export function validatedCaption(asset: Asset, bytes: Uint8Array, checksum: string) {
  if (asset.assetKind !== 'caption' || bytes.length !== asset.byteSize || bytes.length > MAX_CAPTION_BYTES || createHash('sha256').update(bytes).digest('hex') !== checksum) throw new MediaError('verification');
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Only plain cues: no HTML, CSS, regions, URLs, control/bidi characters.
    if (!text.startsWith('WEBVTT\n') && !text.startsWith('WEBVTT\r\n') || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(text.replaceAll('-->', '')) || /^(STYLE|REGION)\b/m.test(text)) throw new Error('invalid');
    const result = new WebVTTParser().parse(text);
    if (result.errors.length || !result.cues.length || result.cues.length > 10000 || result.cues.some(c => !Number.isFinite(c.startTime) || c.startTime < 0 || c.endTime <= c.startTime || c.endTime > 86400 || c.text.length > 4000)) throw new Error('invalid');
    return text;
  } catch { throw new MediaError('verification'); }
}
