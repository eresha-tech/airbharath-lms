"use client";

import { useState, useEffect } from "react";
import { Megaphone, Trash2, Image as ImageIcon, Send, Sparkles, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feed");
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrl: imageUrl.trim() }),
      });

      if (res.ok) {
        setContent("");
        setImageUrl("");
        fetchPosts();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to post announcement");
      }
    } catch (err: any) {
      alert(err.message || "Failed to post announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/admin/feed?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete post");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Broadcast & Notice Feed
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Post general bulletins, syllabus release notes, and seminar alerts to the student community.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Create Broadcast Card */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <span>Create Announcement</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Announcement Text
                </label>
                <textarea
                  placeholder="Share live lecture schedules, aerodynamic design updates, or links..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Attached Image URL (Optional)
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full border border-input rounded-xl pl-9 pr-3 py-2 text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl text-xs font-bold gap-2 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Broadcasting..." : "Publish Announcement"}</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Broadcast Feed List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-outfit text-foreground">
              Broadcast History ({posts.length})
            </h3>
          </div>

          {loading ? (
            <Card className="rounded-2xl border-border/80 p-16 text-center text-xs text-muted-foreground">
              Loading announcement feed...
            </Card>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <Card
                key={post.id}
                className="rounded-2xl border-border/80 shadow-2xs p-5 sm:p-6 space-y-4 hover:border-border transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/60">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {post.author?.full_name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-foreground font-outfit">
                        {post.author?.full_name || "Airbharath Team"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePost(post.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                    title="Delete Announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {post.content}
                </div>

                {post.image_url && (
                  <div className="rounded-xl overflow-hidden border border-border/60 max-h-[320px] bg-muted">
                    <img
                      src={post.image_url}
                      alt="Attachment"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl border border-dashed border-border/80 p-16 text-center text-muted-foreground bg-muted/10">
              <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">No broadcast notices yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Post notices to announce live sessions, syllabus updates, or platform news.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
