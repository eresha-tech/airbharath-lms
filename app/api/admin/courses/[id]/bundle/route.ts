import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { courses, courseBundleItems } from "@/lib/db/schema";
import { eq, ne, and, inArray } from "drizzle-orm";
import { serverTrack } from "@/lib/analytics-server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // 1. Fetch current bundle items
    const bundleItems = await db.query.courseBundleItems.findMany({
      where: eq(courseBundleItems.bundleCourseId, id),
      with: {
        course: {
          columns: {
            id: true,
            title: true,
            slug: true,
            price: true,
            thumbnailUrl: true,
            isPublished: true,
          },
        },
      },
      orderBy: (bi, { asc }) => [asc(bi.orderIndex)],
    });

    // 2. Fetch all other courses available to be added
    const allCourses = await db.query.courses.findMany({
      where: ne(courses.id, id),
      columns: {
        id: true,
        title: true,
        slug: true,
        price: true,
        thumbnailUrl: true,
        isPublished: true,
        isBundle: true,
      },
      orderBy: (c, { asc }) => [asc(c.title)],
    });

    return NextResponse.json({
      isBundle: Boolean(course.isBundle || bundleItems.length > 0),
      bundleItems: bundleItems.map((bi) => ({
        id: bi.id,
        courseId: bi.courseId,
        orderIndex: bi.orderIndex,
        course: bi.course,
      })),
      availableCourses: allCourses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch bundle items" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isBundle, includedCourseIds } = body as {
      isBundle?: boolean;
      includedCourseIds: string[];
    };

    const targetCourse = await db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!targetCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const rawIds = Array.isArray(includedCourseIds)
      ? includedCourseIds.filter((cId) => Boolean(cId) && cId !== id)
      : [];
    const validIds = Array.from(new Set(rawIds));

    const effectiveIsBundle = isBundle !== undefined ? Boolean(isBundle) : validIds.length > 0;

    // 1. Update course isBundle flag
    await db
      .update(courses)
      .set({ isBundle: effectiveIsBundle })
      .where(eq(courses.id, id));

    // 2. Sync course_bundle_items in transaction/sequence
    await db.delete(courseBundleItems).where(eq(courseBundleItems.bundleCourseId, id));

    if (effectiveIsBundle && validIds.length > 0) {
      const itemsToInsert = validIds.map((cId, idx) => ({
        bundleCourseId: id,
        courseId: cId,
        orderIndex: idx,
      }));

      await db.insert(courseBundleItems).values(itemsToInsert);
    }

    await serverTrack(session.id, "admin_bundle_updated", {
      bundle_course_id: id,
      bundle_title: targetCourse.title,
      is_bundle: effectiveIsBundle,
      included_course_count: validIds.length,
      included_course_ids: validIds,
    });

    // 3. Fetch updated bundle items to return
    const updatedBundleItems = await db.query.courseBundleItems.findMany({
      where: eq(courseBundleItems.bundleCourseId, id),
      with: {
        course: true,
      },
      orderBy: (bi, { asc }) => [asc(bi.orderIndex)],
    });

    return NextResponse.json({
      success: true,
      isBundle: effectiveIsBundle,
      bundleItems: updatedBundleItems,
      message: "Bundle configuration saved successfully",
    });
  } catch (error: any) {
    console.error("ADMIN_BUNDLE_PUT_ERROR", error);
    return NextResponse.json({ error: error.message || "Failed to update bundle configuration" }, { status: 500 });
  }
}
