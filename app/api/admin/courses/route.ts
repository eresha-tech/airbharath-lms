import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, modules, lessons, certificates, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, price, thumbnailUrl, accessDays, isPublished } = await req.json();

    const [newCourse] = await db
      .insert(courses)
      .values({
        title,
        description,
        price: String(price),
        thumbnailUrl: thumbnailUrl || null,
        accessDays: accessDays ? parseInt(accessDays) : null,
        isPublished: isPublished ?? false,
        instructorId: session.id,
      })
      .returning();

    return NextResponse.json({ course: newCourse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, title, description, price, thumbnailUrl, accessDays, isPublished } = await req.json();

    const [updatedCourse] = await db
      .update(courses)
      .set({
        title,
        description,
        price: String(price),
        thumbnailUrl: thumbnailUrl || null,
        accessDays: accessDays ? parseInt(accessDays) : null,
        isPublished,
      })
      .where(eq(courses.id, id))
      .returning();

    return NextResponse.json({ course: updatedCourse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
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
