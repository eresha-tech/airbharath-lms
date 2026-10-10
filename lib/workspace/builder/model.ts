import { CreatorError, plain, version } from '../creator/text';
import { UUID } from '../eligibility/model';
export const BUILDER_BODY_LIMIT = 131_072;
export const MAX_MODULES = 50, MAX_LESSONS_PER_MODULE = 100, MAX_PROJECT_LESSONS = 500;
export const BUILD_APPROVAL_COPY = 'Your course review is approved. You can now build the full course. Final course content will require a separate publication review before it can go live.';
export const STRUCTURE_REVIEW_COPY = 'Major changes from the approved course structure may require review before publication.';
export class BuildError extends Error {
  constructor(public code: 'authentication' | 'forbidden' | 'not_found' | 'not_approved' | 'conflict' | 'validation' | 'too_large' | 'not_empty' | 'limit') { super(code); }
}
export type ModuleContent = { title: string; description: string };
export type LessonContent = { title: string; summary: string; content: string };
export type BuildCommand =
  | { action: 'create_module'; content: ModuleContent }
  | { action: 'update_module'; moduleId: string; expectedVersion: number; content: ModuleContent }
  | { action: 'move_module'; moduleId: string; expectedVersion: number; direction: 'up' | 'down' }
  | { action: 'delete_module'; moduleId: string; expectedVersion: number }
  | { action: 'create_lesson'; moduleId: string; content: LessonContent }
  | { action: 'update_lesson'; moduleId: string; lessonId: string; expectedVersion: number; content: LessonContent }
  | { action: 'move_lesson'; moduleId: string; lessonId: string; expectedVersion: number; direction: 'up' | 'down' }
  | { action: 'delete_lesson'; moduleId: string; lessonId: string; expectedVersion: number };
function object(raw: unknown) { if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BuildError('validation'); return raw as Record<string, unknown>; }
function exact(input: Record<string, unknown>, allowed: string[]) { if (Object.keys(input).some(k => !allowed.includes(k))) throw new BuildError('validation'); }
export function buildId(value: unknown) { if (typeof value !== 'string' || !UUID.test(value)) throw new BuildError('not_found'); return value; }
export function startCommand(raw: unknown) { const input = object(raw); exact(input, ['approvedSubmissionId']); return { approvedSubmissionId: buildId(input.approvedSubmissionId) }; }
function expected(value: unknown) { const v = version(value); if (!v) throw new BuildError('validation'); return v; }
export function moduleContent(raw: unknown): ModuleContent { const i = object(raw); exact(i, ['title', 'description']); return { title: plain(i.title, 'title', 2, 200), description: plain(i.description ?? '', 'description', 0, 1000) }; }
export function lessonContent(raw: unknown): LessonContent { const i = object(raw); exact(i, ['title', 'summary', 'content']); return { title: plain(i.title, 'title', 2, 200), summary: plain(i.summary ?? '', 'summary', 0, 1000), content: plain(i.content ?? '', 'content', 0, 20000) }; }
export function buildCommand(raw: unknown): BuildCommand {
  try {
    const i = object(raw), action = i.action;
    if (!['create_module', 'update_module', 'move_module', 'delete_module', 'create_lesson', 'update_lesson', 'move_lesson', 'delete_lesson'].includes(String(action))) throw new BuildError('validation');
    const lesson = String(action).endsWith('lesson'), create = String(action).startsWith('create'), update = String(action).startsWith('update'), move = String(action).startsWith('move');
    exact(i, ['action', ...(!create || lesson ? ['moduleId'] : []), ...(lesson && !create ? ['lessonId'] : []), ...(!create ? ['expectedVersion'] : []), ...(create || update ? ['content'] : []), ...(move ? ['direction'] : [])]);
    if (move && i.direction !== 'up' && i.direction !== 'down') throw new BuildError('validation');
    return { action, ...(!create || lesson ? { moduleId: buildId(i.moduleId) } : {}), ...(lesson && !create ? { lessonId: buildId(i.lessonId) } : {}), ...(!create ? { expectedVersion: expected(i.expectedVersion) } : {}), ...(create || update ? { content: lesson ? lessonContent(i.content) : moduleContent(i.content) } : {}), ...(move ? { direction: i.direction } : {}) } as BuildCommand;
  } catch (error) { if (error instanceof CreatorError) throw new BuildError('validation'); throw error; }
}
