// Browser-safe creator text normalization shared by drafts and structured builds.
import { CATEGORIES } from '../eligibility/model';
export class CreatorError extends Error {
  constructor(public code: 'authentication' | 'restricted' | 'not_found' | 'validation' | 'conflict' | 'review_locked' | 'too_large', public fields?: Record<string, string>) { super(code); }
}
export function plain(value: unknown, key: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new CreatorError('validation', { [key]: 'Enter plain text.' });
  const text = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  if (text.length < min || text.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new CreatorError('validation', { [key]: `Use ${min}–${max} characters of plain text, without HTML.` });
  return text;
}
export function version(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 2_147_483_646) throw new CreatorError('validation');
  return Number(value);
}
export function categoryLabel(value: string) { return CATEGORIES.find(([key]) => key === value)?.[1] || 'Aviation'; }
export function priceLabel(value: number | null) { return value === null ? 'Not set' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100); }
