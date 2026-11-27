import 'server-only';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import type { Asset } from './service';
import { MediaError } from './model';

export const RESOURCE_VERIFICATION_POLICY = 'sha256-structural-download-only-v1';
export const VIDEO_VERIFICATION_POLICY = 's3-sha256-mp4-header-v1';
export function fileSignature(asset: Pick<Asset, 'assetKind' | 'mimeType'>, bytes: Uint8Array) {
  const text = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end));
  if (asset.assetKind === 'video') return bytes.length >= 16 && text(4, 8) === 'ftyp' && /^(isom|iso[2-6]|mp4[12]|avc1|M4V )$/.test(text(8, 12));
  if (asset.mimeType === 'application/pdf') return text(0, 5) === '%PDF-';
  if (asset.mimeType === 'image/png') return Buffer.from(bytes.slice(0, 8)).toString('hex') === '89504e470d0a1a0a';
  if (asset.mimeType === 'image/jpeg') return Buffer.from(bytes.slice(0, 3)).toString('hex') === 'ffd8ff';
  return false;
}
// Structural validation is not a malware certification. All original resources
// remain download-only, never inline, including structurally valid PDFs/images.
export async function verifyResource(asset: Asset, bytes: Uint8Array, checksum: string) {
  if (bytes.byteLength !== asset.byteSize || createHash('sha256').update(bytes).digest('hex') !== checksum || !fileSignature(asset, bytes)) throw new MediaError('verification');
  try {
    if (asset.mimeType === 'application/pdf') {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
      if (pdf.isEncrypted || pdf.getPageCount() < 1 || pdf.getPageCount() > 10000) throw new Error('invalid');
    } else {
      const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' }).timeout({ seconds: 5 });
      const meta = await image.metadata();
      if (meta.format !== (asset.mimeType === 'image/png' ? 'png' : 'jpeg') || !meta.width || !meta.height || (meta.pages || 1) !== 1) throw new Error('invalid');
      await image.stats(); // Decode rather than trusting dimensions/header alone.
    }
  } catch { throw new MediaError('verification'); }
}
