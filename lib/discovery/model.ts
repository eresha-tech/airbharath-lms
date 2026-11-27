// Organic ranking only. Changes are versioned alongside source and tests.
export const rankingConfig = Object.freeze({ version: 'organic-2026-11-v1', priorMean: 4, priorReviews: 8,
  weights: { relevance: .24, interests: .04, rating: .23, popularity: .12, engagement: .1, completion: .08, quality: .09, freshness: .04, exploration: .06 } });
export const difficulties = ['all_levels', 'beginner', 'intermediate', 'advanced'] as const;
export const sorts = ['relevance', 'rating', 'popularity', 'newest'] as const;
export function bayesianRating(sum: number, count: number) { return (sum + rankingConfig.priorMean * rankingConfig.priorReviews) / (count + rankingConfig.priorReviews); }
export function rankingScore(f: { ratingSum: number; reviewCount: number; learners: number; engaged: number; completed: number; quality: number; ageDays: number; relevance?: number; interests?: number }) {
  const w = rankingConfig.weights;
  return (f.relevance ?? 0) * w.relevance + (f.interests ?? 0) * w.interests + bayesianRating(f.ratingSum, f.reviewCount) / 5 * w.rating +
    Math.min(1, Math.log1p(f.learners) / Math.log1p(1000)) * w.popularity + (f.engaged + 2) / (f.learners + 5) * w.engagement +
    (f.completed + 1) / (f.learners + 5) * w.completion + f.quality * w.quality + Math.exp(-Math.max(0, f.ageDays) / 90) * w.freshness +
    Math.exp(-Math.max(0, f.ageDays) / 45) / Math.sqrt(1 + f.learners) * w.exploration;
}
export function catalogParams(raw: Record<string, string | string[] | undefined>) {
  const one = (key: string) => typeof raw[key] === 'string' ? raw[key] as string : '';
  const sort = one('sort'); const difficulty = one('difficulty');
  return { q: one('q').trim().slice(0,120), category: one('category').slice(0,80),
    difficulty: difficulties.includes(difficulty as typeof difficulties[number]) ? difficulty : '',
    sort: sorts.includes(sort as typeof sorts[number]) ? sort : 'relevance',
    page: Math.min(1000, Math.max(1, Number.parseInt(one('page'),10) || 1)) };
}
export type CatalogParams = ReturnType<typeof catalogParams>;
