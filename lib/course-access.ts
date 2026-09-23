import { db } from '@/lib/db';
import { courses, enrollments, courseBundleItems, users } from '@/lib/db/schema';
import { eq, and, inArray, or, isNull, gt } from 'drizzle-orm';

export interface CourseAccessResult {
  hasAccess: boolean;
  accessType: 'direct' | 'bundle' | 'admin' | null;
  bundleCourseId?: string;
  bundleTitle?: string;
  isExpired: boolean;
  expiresAt?: Date | null;
}

/**
 * Authoritative Server-side Course Access Resolver
 * Resolves course access via:
 * 1. Admin superuser privileges
 * 2. Direct active enrollment in the course
 * 3. Bundle entitlement (active enrollment in a bundle that includes this course)
 *
 * @param userId User UUID
 * @param courseId Target course UUID
 * @param userRole Optional user role (if already known from session)
 */
export async function hasCourseAccess(
  userId: string,
  courseId: string,
  userRole?: string
): Promise<CourseAccessResult> {
  if (!userId || !courseId) {
    return { hasAccess: false, accessType: null, isExpired: false };
  }

  // 1. Admin superuser privilege
  if (userRole === 'admin') {
    return { hasAccess: true, accessType: 'admin', isExpired: false };
  }

  // If userRole not provided, check user's actual role in DB
  if (userRole === undefined) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });
    if (user?.role === 'admin') {
      return { hasAccess: true, accessType: 'admin', isExpired: false };
    }
  }

  const now = new Date();

  // 2. Direct course enrollment check
  const directEnrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.userId, userId),
      eq(enrollments.courseId, courseId)
    ),
  });

  if (directEnrollment) {
    const isDirectExpired =
      directEnrollment.status === 'expired' ||
      (directEnrollment.expiresAt !== null && new Date(directEnrollment.expiresAt) <= now);

    if (!isDirectExpired && directEnrollment.status === 'active') {
      return {
        hasAccess: true,
        accessType: 'direct',
        isExpired: false,
        expiresAt: directEnrollment.expiresAt,
      };
    }
  }

  // 3. Bundle entitlement check
  // Find all bundles that include this target course
  const parentBundleItems = await db.query.courseBundleItems.findMany({
    where: eq(courseBundleItems.courseId, courseId),
    with: {
      bundle: {
        columns: {
          id: true,
          title: true,
          isPublished: true,
        },
      },
    },
  });

  if (parentBundleItems.length > 0) {
    const bundleCourseIds = parentBundleItems.map((bi) => bi.bundleCourseId);

    // Query active enrollments in any of these parent bundles
    const bundleEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.userId, userId),
        inArray(enrollments.courseId, bundleCourseIds)
      ),
    });

    for (const bEnroll of bundleEnrollments) {
      const isBundleExpired =
        bEnroll.status === 'expired' ||
        (bEnroll.expiresAt !== null && new Date(bEnroll.expiresAt) <= now);

      if (!isBundleExpired && bEnroll.status === 'active') {
        const matchingBundle = parentBundleItems.find(
          (bi) => bi.bundleCourseId === bEnroll.courseId
        );
        return {
          hasAccess: true,
          accessType: 'bundle',
          bundleCourseId: bEnroll.courseId,
          bundleTitle: matchingBundle?.bundle?.title || 'Course Bundle',
          isExpired: false,
          expiresAt: bEnroll.expiresAt,
        };
      }
    }
  }

  const isExpired = Boolean(directEnrollment?.status === 'expired' || (directEnrollment?.expiresAt && new Date(directEnrollment.expiresAt) <= now));

  return {
    hasAccess: false,
    accessType: null,
    isExpired,
  };
}

/**
 * Returns complete access map for a user across all courses.
 * Efficiently computes effective course access in minimal queries (no N+1).
 */
export async function getUserAccessSummary(userId: string) {
  if (!userId) {
    return {
      directCourseIds: [] as string[],
      bundleCourseIds: [] as string[],
      effectiveCourseIds: [] as string[],
      bundleToCoursesMap: {} as Record<string, string[]>,
      courseToBundleMap: {} as Record<string, { bundleId: string; bundleTitle: string; expiresAt?: Date | null }>,
    };
  }

  const now = new Date();

  // Fetch all user enrollments in one query
  const userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, userId),
  });

  const activeEnrollments = userEnrollments.filter((e) => {
    const isExpired = e.status === 'expired' || (e.expiresAt !== null && new Date(e.expiresAt) <= now);
    return !isExpired && e.status === 'active';
  });

  const activeCourseIds = activeEnrollments.map((e) => e.courseId);

  if (activeCourseIds.length === 0) {
    return {
      directCourseIds: [],
      bundleCourseIds: [],
      effectiveCourseIds: [],
      bundleToCoursesMap: {},
      courseToBundleMap: {},
    };
  }

  // Fetch all bundle items for any enrolled course that might be a bundle
  const bundleItems = await db.query.courseBundleItems.findMany({
    where: inArray(courseBundleItems.bundleCourseId, activeCourseIds),
    with: {
      bundle: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: (bi, { asc }) => [asc(bi.orderIndex)],
  });

  const bundleToCoursesMap: Record<string, string[]> = {};
  const courseToBundleMap: Record<string, { bundleId: string; bundleTitle: string; expiresAt?: Date | null }> = {};
  const effectiveCourseIdSet = new Set<string>(activeCourseIds);
  const bundleCourseIdsSet = new Set<string>();

  for (const item of bundleItems) {
    bundleCourseIdsSet.add(item.bundleCourseId);
    if (!bundleToCoursesMap[item.bundleCourseId]) {
      bundleToCoursesMap[item.bundleCourseId] = [];
    }
    bundleToCoursesMap[item.bundleCourseId].push(item.courseId);
    effectiveCourseIdSet.add(item.courseId);

    const parentEnrollment = activeEnrollments.find((e) => e.courseId === item.bundleCourseId);
    courseToBundleMap[item.courseId] = {
      bundleId: item.bundleCourseId,
      bundleTitle: item.bundle?.title || 'Bundle Pass',
      expiresAt: parentEnrollment?.expiresAt,
    };
  }

  const directCourseIds = activeCourseIds.filter((id) => !bundleCourseIdsSet.has(id));
  const bundleCourseIds = Array.from(bundleCourseIdsSet);
  const effectiveCourseIds = Array.from(effectiveCourseIdSet);

  return {
    directCourseIds,
    bundleCourseIds,
    effectiveCourseIds,
    bundleToCoursesMap,
    courseToBundleMap,
  };
}

/**
 * Retrieves the list of included courses for a bundle
 */
export async function getBundleIncludedCourses(bundleCourseId: string) {
  const items = await db.query.courseBundleItems.findMany({
    where: eq(courseBundleItems.bundleCourseId, bundleCourseId),
    with: {
      course: {
        with: {
          modules: {
            with: {
              lessons: true,
            },
          },
        },
      },
    },
    orderBy: (bi, { asc }) => [asc(bi.orderIndex)],
  });

  return items.map((item) => ({
    id: item.course.id,
    title: item.course.title,
    slug: item.course.slug,
    description: item.course.description,
    thumbnailUrl: item.course.thumbnailUrl,
    price: Number(item.course.price) || 0,
    accessDays: item.course.accessDays,
    isPublished: item.course.isPublished,
    orderIndex: item.orderIndex,
    modules: item.course.modules || [],
  }));
}
