import type { workspaceCourseProjects, workspaceCourseModules, workspaceCourseLessons } from '@/lib/db/schema';
import type { Submission } from '../review/service';
import type { CreatorContext } from '../creator/service';
import { creatorCapabilities } from '../creator/model';
import { BuildError, buildId, startCommand, buildCommand, moduleContent, MAX_MODULES, MAX_LESSONS_PER_MODULE, MAX_PROJECT_LESSONS, type ModuleContent, type LessonContent } from './model';
export type Project = typeof workspaceCourseProjects.$inferSelect;
export type CourseModule = typeof workspaceCourseModules.$inferSelect;
export type Lesson = typeof workspaceCourseLessons.$inferSelect;
export type ApprovedSource = Submission & { approvalExists: boolean };
export const projectReceipt = ({ id, draftId, approvedSubmissionId, status, version, createdAt, updatedAt }: Project) => ({ id, draftId, approvedSubmissionId, status, version, createdAt, updatedAt });
export const moduleReceipt = ({ id, title, description, position, version, createdAt, updatedAt }: CourseModule) => ({ id, title, description, position, version, createdAt, updatedAt });
export const lessonSummary = ({ id, moduleId, title, summary, position, version, createdAt, updatedAt }: Omit<Lesson, 'content'>) => ({ id, moduleId, title, summary, position, version, createdAt, updatedAt });
export const lessonReceipt = (row: Lesson) => ({ ...lessonSummary(row), content: row.content });
export const sourceReceipt = ({ id, submissionNumber, title, category, description, targetLearner, learningOutcomes, outline, tentativePricePaise, currency, reviewCompletedAt }: ApprovedSource) => ({ id, submissionNumber, title, category, description, targetLearner, learningOutcomes, outline, tentativePricePaise, currency, approvedAt: reviewCompletedAt });
export type BuildTree = { project: ReturnType<typeof projectReceipt>; source: ReturnType<typeof sourceReceipt>; modules: ReturnType<typeof moduleReceipt>[]; lessons: ReturnType<typeof lessonSummary>[]; canEdit: boolean; inspection?: { creatorName: string | null; creatorStatus: string } };
export interface BuildTransaction {
  context(): Promise<CreatorContext>;
  source(id: string, draftId: string): Promise<ApprovedSource | null>;
  project(draftId: string): Promise<Project | null>;
  existing(sourceId: string): Promise<Project | null>;
  createProject(source: ApprovedSource, now: Date): Promise<Project>;
  modules(project: Project): Promise<CourseModule[]>;
  lessons(project: Project): Promise<Omit<Lesson, 'content'>[]>;
  module(project: Project, id: string): Promise<CourseModule | null>;
  lesson(project: Project, moduleId: string, id: string): Promise<Lesson | null>;
  createModule(project: Project, content: ModuleContent, position: number, now: Date): Promise<CourseModule>;
  createLesson(project: Project, module: CourseModule, content: LessonContent, position: number, now: Date): Promise<Lesson>;
  updateModule(project: Project, id: string, expected: number, content: ModuleContent, now: Date): Promise<CourseModule | null>;
  updateLesson(project: Project, moduleId: string, id: string, expected: number, content: LessonContent, now: Date): Promise<Lesson | null>;
  deleteModule(project: Project, id: string, expected: number): Promise<boolean>;
  deleteLesson(project: Project, moduleId: string, id: string, expected: number): Promise<boolean>;
  positions(project: Project, kind: 'module' | 'lesson', rows: { id: string; position: number; version: number }[], now: Date): Promise<void>;
}
export interface BuildStore { transaction<T>(userId: string, work: (tx: BuildTransaction) => Promise<T>): Promise<T> }
function approved(source: ApprovedSource | null, project?: Project) {
  if (!source) throw new BuildError('not_found');
  if (source.reviewStatus !== 'approved' || !source.approvalExists || !source.reviewCompletedAt) throw new BuildError('not_approved');
  if (project && (project.userId !== source.userId || project.creatorProfileId !== source.creatorProfileId || project.draftId !== source.draftId || project.approvedSubmissionId !== source.id)) throw new BuildError('not_found');
  return source;
}
async function tree(tx: BuildTransaction, project: Project, source: ApprovedSource, canEdit: boolean): Promise<BuildTree> {
  return { project: projectReceipt(project), source: sourceReceipt(source), modules: (await tx.modules(project)).map(moduleReceipt), lessons: (await tx.lessons(project)).map(lessonSummary), canEdit };
}
export function builderService(store: BuildStore, environment: string | undefined, clock = () => new Date()) {
  async function transaction<T>(userId: string, edit: boolean, work: (tx: BuildTransaction, context: CreatorContext, permit: () => Date) => Promise<T>) {
    buildId(userId);
    return store.transaction(userId, async tx => {
      const context = await tx.context();
      const permit = () => { const now = clock(), c = creatorCapabilities(context.evidence, now, environment, context.financialReview, context.grant); if (context.user.id !== userId || !context.profileId || !(edit ? c.canEditWorkspace : c.canViewCreatorWorkspace)) throw new BuildError('forbidden'); return now; };
      permit(); return work(tx, context, permit);
    });
  }
  async function owned<T>(userId: string, draftId: string, edit: boolean, work: (tx: BuildTransaction, project: Project, source: ApprovedSource, permit: () => Date, canEdit: boolean) => Promise<T>) {
    buildId(draftId);
    return transaction(userId, edit, async (tx, context, permit) => {
      const project = await tx.project(draftId); if (!project || project.userId !== userId || project.creatorProfileId !== context.profileId) throw new BuildError('not_found');
      const source = approved(await tx.source(project.approvedSubmissionId, draftId), project); permit();
      return work(tx, project, source, permit, creatorCapabilities(context.evidence, clock(), environment, context.financialReview, context.grant).canEditWorkspace);
    });
  }
  return {
    start: (userId: string, draftId: string, raw: unknown) => {
      const command = startCommand(raw); buildId(draftId);
      return transaction(userId, true, async (tx, context, permit) => {
        const source = approved(await tx.source(command.approvedSubmissionId, draftId));
        if (source.userId !== userId || source.creatorProfileId !== context.profileId) throw new BuildError('not_found');
        const prior = await tx.existing(source.id); const now = permit();
        if (prior) { approved(source, prior); return { project: projectReceipt(prior), created: false }; }
        const project = await tx.createProject(source, now);
        for (const [position, item] of source.outline.entries()) {
          // Very short approved outline labels remain visible in immutable context;
          // add a module label only to satisfy the builder's two-character minimum.
          const title = item.title.trim().length < 2 ? `Module ${position + 1}: ${item.title}` : item.title;
          await tx.createModule(project, moduleContent({ title, description: item.description }), position, now);
        }
        return { project: projectReceipt(project), created: true };
      });
    },
    read: (userId: string, draftId: string) => owned(userId, draftId, false, (tx, project, source, permit, canEdit) => { permit(); return tree(tx, project, source, canEdit); }),
    lesson: (userId: string, draftId: string, moduleId: string, id: string) => {
      buildId(moduleId); buildId(id);
      return owned(userId, draftId, false, async (tx, project, _source, permit) => { const row = await tx.lesson(project, moduleId, id); if (!row) throw new BuildError('not_found'); permit(); return lessonReceipt(row); });
    },
    mutate: (userId: string, draftId: string, raw: unknown) => {
      const c = buildCommand(raw);
      return owned(userId, draftId, true, async (tx, project, source, permit) => {
        const modules = await tx.modules(project), lessons = await tx.lessons(project);
        const targetModule = 'moduleId' in c ? await tx.module(project, c.moduleId) : null;
        if ('moduleId' in c && !targetModule) throw new BuildError('not_found');
        const lesson = 'lessonId' in c ? await tx.lesson(project, c.moduleId, c.lessonId) : null;
        if ('lessonId' in c && !lesson) throw new BuildError('not_found');
        if ('expectedVersion' in c && (lesson || targetModule)?.version !== c.expectedVersion) throw new BuildError('conflict');
        const now = permit();
        if (c.action === 'create_module') {
          if (modules.length >= MAX_MODULES) throw new BuildError('limit'); await tx.createModule(project, c.content, modules.length, now);
        } else if (c.action === 'create_lesson') {
          const length = lessons.filter(l => l.moduleId === c.moduleId).length;
          if (length >= MAX_LESSONS_PER_MODULE || lessons.length >= MAX_PROJECT_LESSONS) throw new BuildError('limit'); await tx.createLesson(project, targetModule!, c.content, length, now);
        } else if (c.action === 'update_module') {
          if (!await tx.updateModule(project, c.moduleId, c.expectedVersion, c.content, now)) throw new BuildError('conflict');
        } else if (c.action === 'update_lesson') {
          if (!await tx.updateLesson(project, c.moduleId, c.lessonId, c.expectedVersion, c.content, now)) throw new BuildError('conflict');
        } else {
          const kind = 'lessonId' in c ? 'lesson' : 'module';
          const rows = (kind === 'lesson' ? lessons.filter(l => l.moduleId === targetModule!.id) : modules).map(r => ({ id: r.id, position: r.position, version: r.version }));
          const id = 'lessonId' in c ? c.lessonId : c.moduleId, index = rows.findIndex(r => r.id === id);
          if (index < 0) throw new BuildError('not_found');
          if (c.action === 'delete_module' || c.action === 'delete_lesson') {
            if (c.action === 'delete_module' && lessons.some(l => l.moduleId === id)) throw new BuildError('not_empty');
            const removed = c.action === 'delete_module' ? await tx.deleteModule(project, id, c.expectedVersion) : await tx.deleteLesson(project, c.moduleId, id, c.expectedVersion);
            if (!removed) throw new BuildError('conflict'); rows.splice(index, 1);
          } else {
            const target = index + (c.direction === 'up' ? -1 : 1);
            if (target >= 0 && target < rows.length) [rows[index], rows[target]] = [rows[target], rows[index]];
          }
          await tx.positions(project, kind, rows, now);
        }
        return tree(tx, project, source, true);
      });
    },
  };
}
