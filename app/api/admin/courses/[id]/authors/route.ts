import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courseAuthors } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    if (!courseId) {
      return NextResponse.json({ error: "Missing course id" }, { status: 400 });
    }

    const authors = await db
      .select()
      .from(courseAuthors)
      .where(eq(courseAuthors.courseId, courseId))
      .orderBy(asc(courseAuthors.orderIndex), asc(courseAuthors.createdAt));

    return NextResponse.json({ authors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: courseId } = await params;
    if (!courseId) {
      return NextResponse.json({ error: "Missing course id" }, { status: 400 });
    }

    const body = await req.json();
    const { name, photoUrl, designation, bio, profileUrl, orderIndex } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Author name is required." }, { status: 400 });
    }

    const [newAuthor] = await db
      .insert(courseAuthors)
      .values({
        courseId,
        name: name.trim(),
        photoUrl: photoUrl?.trim() || null,
        designation: designation?.trim() || null,
        bio: bio?.trim() || null,
        profileUrl: profileUrl?.trim() || null,
        orderIndex: typeof orderIndex === "number" ? orderIndex : 0,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ author: newAuthor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: courseId } = await params;
    if (!courseId) {
      return NextResponse.json({ error: "Missing course id" }, { status: 400 });
    }

    const body = await req.json();

    // Check for reorder batch
    if (Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.id && typeof item.orderIndex === "number") {
          await db
            .update(courseAuthors)
            .set({ orderIndex: item.orderIndex, updatedAt: new Date() })
            .where(eq(courseAuthors.id, item.id));
        }
      }
      return NextResponse.json({ success: true });
    }

    // Single author update
    const { id: authorId, name, photoUrl, designation, bio, profileUrl, orderIndex } = body;
    if (!authorId) {
      return NextResponse.json({ error: "Author ID is required." }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Author name is required." }, { status: 400 });
    }

    const [updatedAuthor] = await db
      .update(courseAuthors)
      .set({
        name: name.trim(),
        photoUrl: photoUrl !== undefined ? (photoUrl?.trim() || null) : undefined,
        designation: designation !== undefined ? (designation?.trim() || null) : undefined,
        bio: bio !== undefined ? (bio?.trim() || null) : undefined,
        profileUrl: profileUrl !== undefined ? (profileUrl?.trim() || null) : undefined,
        orderIndex: typeof orderIndex === "number" ? orderIndex : undefined,
        updatedAt: new Date(),
      })
      .where(eq(courseAuthors.id, authorId))
      .returning();

    return NextResponse.json({ author: updatedAuthor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get("id");

    if (!authorId) {
      return NextResponse.json({ error: "Missing author id" }, { status: 400 });
    }

    await db.delete(courseAuthors).where(eq(courseAuthors.id, authorId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
