import React from "react";
import { db } from "@/lib/db";
import { feedPosts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import FeedClient, { FormattedPost } from "@/components/admin/FeedClient";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminFeedPage() {
  const postsList = await db.query.feedPosts.findMany({
    with: { author: true },
    orderBy: [desc(feedPosts.createdAt)],
  });

  const formattedPosts: FormattedPost[] = postsList.map((p: any) => ({
    id: p.id,
    content: p.content,
    image_url: p.imageUrl,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    author: p.author
      ? {
          id: p.author.id,
          full_name: p.author.fullName,
          avatar_url: p.author.avatarUrl,
          role: p.author.role,
        }
      : null,
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <Megaphone className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              Student Feed & Broadcasts
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage announcements, learning updates, and community posts visible to students.
          </p>
        </div>
      </div>

      <FeedClient initialPosts={formattedPosts} />
    </div>
  );
}
