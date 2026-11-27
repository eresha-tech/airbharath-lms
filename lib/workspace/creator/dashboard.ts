import type { Draft } from './service';
import type { ReviewStatus } from '../review/model';
import type { BuildSummary } from '../builder/repository';
export type CourseSummary = { total: number; drafts: number; underReview: number; changesRequested: number; approved: number; building: number; published?:number };
export function courseAction(draftId: string, editable: boolean, reviewStatus?: ReviewStatus, build?: BuildSummary, builderAvailable = true) {
  const href = `/workspace/courses/${draftId}`;
  if(!editable)return {href:build?`${href}/build`:href,label:build?'Read saved build':'View course'};
  return {href:build?`${href}/build`:href,label:build?'Open Course Studio':'Continue course'};
}
export function preparationAction(profileSaved: boolean, editable: boolean, drafts: Draft[], statuses: Record<string, ReviewStatus>, builds: Record<string, BuildSummary>, builderAvailable: boolean) {
  if (!editable) return { href: '/workspace/courses', label: 'View My Courses' };
  if (!profileSaved) return { href: '/workspace/profile', label: 'Complete Profile' };
  if (!drafts.length) return { href: '/workspace/courses/new', label: 'Create Course' };
  const draft = drafts[0];
  return courseAction(draft.id, editable, statuses[draft.id], builds[draft.id], builderAvailable);
}
