import { NextResponse } from "next/server";
import { getAuthorizedAdminSession } from "@/lib/admin-authorization";
import { db } from "@/lib/db";
import { feedPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const posts = await db.query.feedPosts.findMany({
      with: { author: true },
      orderBy: [desc(feedPosts.createdAt)],
    });

    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      content: post.content,
      image_url: post.imageUrl,
      created_at: post.createdAt,
      author: {
        full_name: post.author?.fullName || "Admin",
        avatar_url: post.author?.avatarUrl,
      },
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthorizedAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { content, imageUrl } = await req.json();

    const [newPost] = await db
      .insert(feedPosts)
      .values({
        content,
        imageUrl: imageUrl || null,
        authorId: session.id,
      })
      .returning();

    return NextResponse.json({ post: newPost });
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

    await db.delete(feedPosts).where(eq(feedPosts.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
