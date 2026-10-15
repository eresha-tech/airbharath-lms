import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { courses, modules, lessons, certificates, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serverTrack } from "@/lib/analytics-server";

export async function POST(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      title,
      description,
      shortDescription,
      aboutCourse,
      whatYouWillLearn,
      whoIsThisFor,
      prerequisites,
      contentOverview,
      seoTitle,
      seoDescription,
      price,
      thumbnailUrl,
      accessDays,
      isPublished,
    } = await req.json();

    const [newCourse] = await db
      .insert(courses)
      .values({
        title,
        description,
        shortDescription: shortDescription || null,
        aboutCourse: aboutCourse || null,
        whatYouWillLearn: whatYouWillLearn || null,
        whoIsThisFor: whoIsThisFor || null,
        prerequisites: prerequisites || null,
        contentOverview: contentOverview || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        price: String(price),
        thumbnailUrl: thumbnailUrl || null,
        accessDays: accessDays ? parseInt(accessDays) : null,
        isPublished: isPublished ?? false,
        instructorId: session.id,
      })
      .returning();

    await serverTrack(session.id, "admin_course_created", {
      course_id: newCourse.id,
      title: newCourse.title,
      price: Number(newCourse.price) || 0,
      is_published: Boolean(newCourse.isPublished),
    });

    return NextResponse.json({ course: newCourse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      id,
      title,
      description,
      shortDescription,
      aboutCourse,
      whatYouWillLearn,
      whoIsThisFor,
      prerequisites,
      contentOverview,
      seoTitle,
      seoDescription,
      price,
      thumbnailUrl,
      accessDays,
      isPublished,
    } = await req.json();

    const [updatedCourse] = await db
      .update(courses)
      .set({
        title,
        description,
        shortDescription: shortDescription !== undefined ? (shortDescription || null) : undefined,
        aboutCourse: aboutCourse !== undefined ? (aboutCourse || null) : undefined,
        whatYouWillLearn: whatYouWillLearn !== undefined ? (whatYouWillLearn || null) : undefined,
        whoIsThisFor: whoIsThisFor !== undefined ? (whoIsThisFor || null) : undefined,
        prerequisites: prerequisites !== undefined ? (prerequisites || null) : undefined,
        contentOverview: contentOverview !== undefined ? (contentOverview || null) : undefined,
        seoTitle: seoTitle !== undefined ? (seoTitle || null) : undefined,
        seoDescription: seoDescription !== undefined ? (seoDescription || null) : undefined,
        price: String(price),
        thumbnailUrl: thumbnailUrl || null,
        accessDays: accessDays ? parseInt(accessDays) : null,
        isPublished,
      })
      .where(eq(courses.id, id))
      .returning();

    await serverTrack(session.id, "admin_course_updated", {
      course_id: updatedCourse.id,
      title: updatedCourse.title,
      price: Number(updatedCourse.price) || 0,
      is_published: Boolean(updatedCourse.isPublished),
    });

    return NextResponse.json({ course: updatedCourse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(certificates).where(eq(certificates.courseId, id));
    await db.update(orders).set({ courseId: null }).where(eq(orders.courseId, id));
    await db.delete(courses).where(eq(courses.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
