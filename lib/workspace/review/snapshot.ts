import { createHash } from 'node:crypto';
import { CreatorError, validateDraft } from '../creator/model';
import type { Draft } from '../creator/service';
import { ReviewError } from './model';
export function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function snapshot(draft: Draft) {
  const { title, category, description, targetLearner, learningOutcomes, outline, tentativePricePaise } = draft;
  try {
    if (draft.currency !== 'INR') throw new ReviewError('validation');
    const content = { ...validateDraft({ title, category, description, targetLearner, learningOutcomes, outline, tentativePricePaise }), currency: 'INR' as const };
    return { content, contentHash: digest(content) };
  } catch (error) { if (error instanceof CreatorError) throw new ReviewError('validation'); throw error; }
}
