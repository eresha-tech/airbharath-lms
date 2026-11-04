export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class ReviewError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function reviewInput(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ReviewError(400, 'Invalid review.');
  const b = raw as Record<string, unknown>;
  if (Object.keys(b).some(k => !['rating', 'content', 'showName', 'version'].includes(k)) ||
      !Number.isInteger(b.rating) || Number(b.rating) < 1 || Number(b.rating) > 5 ||
      typeof b.content !== 'string' || typeof b.showName !== 'boolean' ||
      !Number.isInteger(b.version) || Number(b.version) < 0) throw new ReviewError(400, 'Check the review fields.');
  const content = b.content.trim().normalize('NFC');
  if (content.length < 20 || content.length > 3000 || /https?:\/\/|www\.|[\u0000-\u0008\u000b-\u001f\u007f]/i.test(content))
    throw new ReviewError(400, 'Write 20–3000 characters without links or control characters.');
  return { rating: b.rating as number, content, showName: b.showName, version: b.version as number };
}
export function requiredLessons(total: number) { return Math.max(Math.min(2, total), Math.ceil(total * .2)); }
export function learnerEligible(f: { role: string; verified: boolean; self: boolean; active: boolean; ageHours: number; total: number; completed: number }) {
  return f.role === 'student' && f.verified && !f.self && f.active && f.ageHours >= 24 && f.total > 0 && f.completed >= requiredLessons(f.total);
}
export type PublicReview = { id: string; rating: number; content: string; displayName: string; updatedAt: string };
export type OwnReview = { id: string; rating: number; content: string; showName: boolean; status: string; version: number };
export type ReviewPage = { average: number | null; count: number; distribution: number[]; reviews: PublicReview[]; page: number; pages: number; own: OwnReview | null; eligible: boolean; signedIn: boolean };
