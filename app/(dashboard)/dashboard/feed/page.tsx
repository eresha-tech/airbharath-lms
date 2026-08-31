import { createClient } from "@/lib/supabase-server";
import { Megaphone, MessageSquare, Heart, Share2 } from "lucide-react";

export default async function StudentFeed() {
  const supabase = await createClient();

  // Fetch feed posts
  const { data: posts } = await supabase
    .from("feed_posts")
    .select(`
      *,
      author:users!author_id (
        full_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Activity Notice Board</h1>
        <p className="text-muted-foreground text-sm">Stay up to date with the latest broadcasts, course schedules, and placements alerts from the IRII team.</p>
      </div>

      {/* Feed list */}
      <div className="space-y-6">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary uppercase">
                  {post.author?.full_name?.charAt(0) || "A"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {post.author?.full_name || "Admin Portal"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>

              {post.image_url && (
                <div className="rounded-xl overflow-hidden border max-h-[400px]">
                  <img
                    src={post.image_url}
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
          <div className="bg-card p-12 border rounded-3xl text-center space-y-4 max-w-lg mx-auto">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="font-bold text-lg">Your feed is quiet</h3>
              <p className="text-sm text-muted-foreground">Check back later for course announcements and campus placement news.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
