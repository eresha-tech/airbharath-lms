/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Megaphone, Trash2, Image as ImageIcon, Send } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AdminFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feed_posts")
      .select(`
        *,
        author:users!author_id (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("feed_posts").insert({
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      author_id: user?.id,
    });

    setIsSubmitting(false);

    if (error) {
      alert(error.message);
    } else {
      setContent("");
      setImageUrl("");
      fetchPosts();
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    const { error } = await supabase.from("feed_posts").delete().eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      fetchPosts();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Activity Feed Broadcast</h1>
        <p className="text-muted-foreground text-sm">Post announcements and bulletins to all students&apos; personal notice boards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Broadcast Form */}
        <div className="bg-card p-6 border rounded-2xl shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Create Announcement
          </h3>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">ANNOUNCEMENT TEXT</label>
              <textarea
                placeholder="Share updates, links, or notice details here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">ATTACH IMAGE URL (OPTIONAL)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Broadcasting..." : "Post Announcement"}
            </button>
          </form>
        </div>

        {/* Feed Posts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg">Broadcast History</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl shadow-sm">
              Loading announcement feed...
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="bg-card p-6 border rounded-2xl shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary uppercase">
                      {post.author?.full_name?.charAt(0) || "A"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {post.author?.full_name || "Admin"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                {post.image_url && (
                  <div className="rounded-xl overflow-hidden border max-h-[300px]">
                    <img
                      src={post.image_url}
                      alt="Announcement Attachment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground bg-card border rounded-2xl shadow-sm">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No announcements broadcasted yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
