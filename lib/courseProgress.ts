interface Lesson {
  id: string;
  workspaceRetired?: boolean;
}

interface Module {
  workspaceRetired?: boolean;
  lessons?: Lesson[] | null;
}

export function calculateTotalLessons(modules: Module[] | null): number {
  if (!modules) return 0;
  return modules.reduce(
    (acc, module) => acc + (module.workspaceRetired ? 0 : module.lessons?.filter(l => !l.workspaceRetired).length || 0),
    0
  );
}

export function calculateCourseProgress(
  modules: Module[] | null,
  completedLessonIds: string[]
): number {
  if (!modules) return 0;
  const totalLessons = calculateTotalLessons(modules);
  if (totalLessons === 0) return 0;

  const courseLessonIds = new Set<string>();
  modules.forEach(mod => {
    if (mod.workspaceRetired) return;
    mod.lessons?.forEach(les => {
      if (!les.workspaceRetired) courseLessonIds.add(les.id);
    });
  });

  const totalCompleted = completedLessonIds.filter(id => courseLessonIds.has(id)).length;

  return Math.min(
    100,
    Math.round((totalCompleted / totalLessons) * 100)
  );
}
