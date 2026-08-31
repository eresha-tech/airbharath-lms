interface Lesson {
  id: string;
}

interface Module {
  lessons?: Lesson[] | null;
}

export function calculateTotalLessons(modules: Module[] | null): number {
  if (!modules) return 0;
  return modules.reduce(
    (acc, module) => acc + (module.lessons?.length || 0),
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
    mod.lessons?.forEach(les => {
      courseLessonIds.add(les.id);
    });
  });

  const totalCompleted = completedLessonIds.filter(id => courseLessonIds.has(id)).length;

  return Math.min(
    100,
    Math.round((totalCompleted / totalLessons) * 100)
  );
}
