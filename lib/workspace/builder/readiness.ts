import type { BuildTree, lessonReceipt } from './service';
import type { assetReceipt } from '../media/service';
export function structureReadiness(tree: Pick<BuildTree,'modules'|'lessons'>) {
  const issues: string[] = [];
  if(!tree.modules.length) issues.push('Add at least one module.');
  for(const m of tree.modules) if(!tree.lessons.some(l => l.moduleId === m.id)) issues.push(`Add a lesson to ${m.title}.`);
  return issues;
}
export function lessonReadiness(lesson: Pick<ReturnType<typeof lessonReceipt>,'content'>, assets: ReturnType<typeof assetReceipt>[]) {
  const issues: string[] = [];
  if(!lesson.content.trim() && !assets.some(a => a.assetKind === 'video' && a.isAttached && a.status === 'ready')) issues.push('Add saved text or a selected playable video.');
  if(assets.some(a => ['pending_upload','uploaded','verified','processing'].includes(a.status))) issues.push('Finish or cancel pending uploads and processing.');
  if(assets.some(a => a.status === 'failed')) issues.push('Replace or dismiss failed uploads.');
  if(assets.some(a => a.status === 'ready' && !a.isAttached)) issues.push('Attach or detach verified media before final review.');
  return issues;
}
