import { db } from "@/lib/db";
import { feedPosts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Megaphone, MessageSquare, Heart, Share2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentFeed() {
  let posts: any[] = [];
  try {
    posts = await db.query.feedPosts.findMany({
      with: { author: true },
      orderBy: [desc(feedPosts.createdAt)],
    });
  } catch (err) {
    console.error("Feed error:", err);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Activity Notice Board</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Stay up to date with broadcasts and course announcements from Airbharath LMS.</p>
      </div>

      <div className="space-y-6">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <div key={post.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#014a62]/10 rounded-full flex items-center justify-center font-bold text-[#014a62] uppercase">
                  {post.author?.fullName?.charAt(0) || "A"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {post.author?.fullName || "Airbharath Team"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {post.content}
              </div>

              {post.imageUrl && (
                <div className="rounded-xl overflow-hidden border max-h-[400px]">
                  <img
                    src={post.imageUrl}
                    alt="Notice attachment"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-6 border-t pt-4 text-xs font-semibold text-muted-foreground">
                <button className="flex items-center gap-1.5 hover:text-foreground">
                  <Heart className="h-4 w-4" /> Like
                </button>
                <button className="flex items-center gap-1.5 hover:text-foreground">
                  <MessageSquare className="h-4 w-4" /> Comment
                </button>
                <button className="flex items-center gap-1.5 hover:text-foreground">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-50 p-12 border border-dashed rounded-3xl text-center space-y-4 max-w-lg mx-auto">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="font-bold text-lg text-foreground">Your feed is quiet</h3>
              <p className="text-xs text-muted-foreground">Check back later for course announcements and technical news.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
