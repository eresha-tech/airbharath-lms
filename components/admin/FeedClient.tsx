"use client";

import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  Calendar,
  Image as ImageIcon,
  Send,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  Maximize2,
  User,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FormattedPost {
  id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  author?: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null;
}

interface FeedClientProps {
  initialPosts: FormattedPost[];
}

export default function FeedClient({ initialPosts }: FeedClientProps) {
  const [postsList, setPostsList] = useState<FormattedPost[]>(initialPosts || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formContent, setFormContent] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Details Modal State
  const [selectedPost, setSelectedPost] = useState<FormattedPost | null>(null);

  // Lightbox Image State
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Delete Confirmation State
  const [targetDeletePost, setTargetDeletePost] = useState<FormattedPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute real metrics from loaded posts
  const metrics = useMemo(() => {
    const total = postsList.length;
    const withAttachments = postsList.filter((p) => !!p.image_url && p.image_url.trim().length > 0).length;
    const uniqueAuthors = new Set(
      postsList.map((p) => p.author?.full_name || "Admin").filter(Boolean)
    ).size;
    const textOnly = total - withAttachments;

    return {
      total,
      withAttachments,
      uniqueAuthors,
      textOnly,
    };
  }, [postsList]);

  // Filtered and Sorted Posts
  const filteredPosts = useMemo(() => {
    return postsList
      .filter((post) => {
        const term = searchTerm.toLowerCase().trim();
        const contentMatch = post.content.toLowerCase().includes(term);
        const authorMatch = (post.author?.full_name || "Admin").toLowerCase().includes(term);

        const matchesSearch = !term || contentMatch || authorMatch;
        if (!matchesSearch) return false;

        if (filterTab === "attachments") {
          return !!post.image_url && post.image_url.trim().length > 0;
        }
        if (filterTab === "text-only") {
          return !post.image_url || post.image_url.trim().length === 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "author-asc") {
          const authorA = a.author?.full_name || "Admin";
          const authorB = b.author?.full_name || "Admin";
          return authorA.localeCompare(authorB);
        }
        return 0;
      });
  }, [postsList, searchTerm, filterTab, sortBy]);

  // Handle Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      setFormError("Announcement text is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: formContent.trim(),
          imageUrl: formImageUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish announcement");

      if (data.post) {
        setPostsList((prev) => [
          {
            id: data.post.id,
            content: data.post.content,
            image_url: data.post.imageUrl,
            created_at: data.post.createdAt
              ? new Date(data.post.createdAt).toISOString()
              : new Date().toISOString(),
            author: {
              full_name: "Captain Vikram Singh (Admin)",
              avatar_url: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400",
              role: "admin",
            },
          },
          ...prev,
        ]);
      }

      // Reset form and close modal
      setFormContent("");
      setFormImageUrl("");
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to publish announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Post
  const handleDeletePost = async () => {
    if (!targetDeletePost) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/feed?id=${targetDeletePost.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete announcement");
      }

      setPostsList((prev) => prev.filter((p) => p.id !== targetDeletePost.id));
      setTargetDeletePost(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete announcement");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Broadcasts */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Broadcasts
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.total}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block shrink-0" />
            Community notices
          </p>
        </Card>

        {/* With Visual Media */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              With Media
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.withAttachments}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            Image attachments
          </p>
        </Card>

        {/* Text Bulletins */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Text Bulletins
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.textOnly}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block shrink-0" />
            Standard updates
          </p>
        </Card>

        {/* Admin Authors */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Publishers
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground mt-3">
            {metrics.uniqueAuthors}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block shrink-0" />
            Admin accounts
          </p>
        </Card>
      </div>

      {/* Search, Filter & Actions Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search announcements, bulletins, or publishers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-10 rounded-xl text-xs bg-muted/30 border-border/80 focus:bg-background focus:ring-2 focus:ring-primary"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex flex-row items-center gap-2.5 shrink-0">
            {/* Sort Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto h-10 px-3 py-1.5 pr-8 border border-border/80 rounded-xl text-xs font-semibold bg-background hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="author-asc">Publisher: A → Z</option>
              </select>
            </div>

            {/* Primary CTA: Create Announcement */}
            <Button
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              className="h-10 px-3.5 sm:px-4 rounded-xl text-xs font-bold gap-1.5 sm:gap-2 shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Create Post</span>
            </Button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-4 pt-3.5 border-t border-border/40">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
              filterTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            All Broadcasts ({postsList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("attachments")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
              filterTab === "attachments"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            With Media ({metrics.withAttachments})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("text-only")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
              filterTab === "text-only"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Text Only ({metrics.textOnly})
          </button>
        </div>
      </Card>

      {/* Main Broadcast Posts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold font-outfit text-foreground uppercase tracking-wider">
              Broadcast Timeline
            </h2>
            <Badge variant="secondary" className="text-[11px] font-bold">
              {filteredPosts.length} {filteredPosts.length === 1 ? "notice" : "notices"}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Live feed rendered on student portal
          </span>
        </div>

        {filteredPosts.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/80 p-12 sm:p-16 text-center text-muted-foreground bg-muted/10">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-bold text-foreground">
              {searchTerm || filterTab !== "all"
                ? "No broadcasts match your search"
                : "No announcements published yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm || filterTab !== "all"
                ? "Try clearing your search query or switching filter tabs."
                : "Create an announcement to share important syllabus updates, live webinars, and flight school news."}
            </p>
            {searchTerm || filterTab !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterTab("all");
                }}
                className="mt-4 rounded-xl text-xs"
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 rounded-xl text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Publish First Announcement</span>
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="rounded-2xl border-border/80 shadow-2xs p-5 sm:p-6 space-y-4 hover:border-border transition-colors group"
              >
                {/* Header: Author + Timestamp + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border/60">
                      {post.author?.avatar_url && (
                        <AvatarImage src={post.author.avatar_url} alt={post.author.full_name || "Author"} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {post.author?.full_name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground font-outfit">
                          {post.author?.full_name || "Airbharath Super Administrator"}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold py-0 h-4 bg-primary/5 text-primary border-primary/20"
                        >
                          Official Bulletin
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {post.created_at
                            ? new Date(post.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recently"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedPost(post)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTargetDeletePost(post)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Announcement Content */}
                <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {post.content}
                </div>

                {/* Attached Image if present */}
                {post.image_url && (
                  <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/40 group/img">
                    <img
                      src={post.image_url}
                      alt="Broadcast Media"
                      className="w-full h-auto object-cover max-h-[360px]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxImageUrl(post.image_url || null)}
                      className="absolute bottom-3 right-3 px-2.5 py-1 bg-background/90 hover:bg-background backdrop-blur-xs rounded-lg text-[11px] font-bold text-foreground border border-border/80 shadow-xs flex items-center gap-1.5 transition-colors opacity-90 hover:opacity-100 cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Expand Image</span>
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL DIALOG */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Create Broadcast Notice
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Publish an announcement to all students across the platform.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Announcement Content */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Announcement Body <span className="text-destructive">*</span>
                </label>
                <textarea
                  placeholder="Share live lecture schedules, aerodynamic design updates, webinar links, or DGCA exam alerts..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={5}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  required
                />
              </div>

              {/* Attached Image URL */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Media Attachment URL (Optional)
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="pl-9 rounded-xl text-xs font-mono bg-background"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Live Feed Card Preview</span>
                </div>
                <div className="p-4 bg-card border border-border/80 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      C
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Captain Vikram Singh (Admin)
                      </div>
                      <div className="text-[10px] text-muted-foreground">Just now</div>
                    </div>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {formContent || "Your announcement text will appear here formatted nicely for students..."}
                  </p>
                  {formImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-border/60 max-h-36 bg-muted">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-bold shadow-2xs gap-1.5"
                >
                  {isSubmitting ? (
                    "Broadcasting..."
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Publish Announcement</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST DETAILS MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Announcement Details
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Full notice content and student engagement view.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/60">
                  {selectedPost.author?.avatar_url && (
                    <AvatarImage src={selectedPost.author.avatar_url} alt="Author" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {selectedPost.author?.full_name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {selectedPost.author?.full_name || "Airbharath Admin"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPost.created_at
                      ? new Date(selectedPost.created_at).toLocaleString()
                      : "Recently"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl border border-border/60">
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedPost.content}
                </p>
              </div>

              {selectedPost.image_url && (
                <div className="rounded-xl overflow-hidden border border-border/60 bg-muted/40">
                  <img
                    src={selectedPost.image_url}
                    alt="Media Attachment"
                    className="w-full h-auto object-cover max-h-[300px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setSelectedPost(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX IMAGE MODAL */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl p-2">
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-4 right-4 h-8 w-8 bg-background/80 hover:bg-background rounded-full text-foreground flex items-center justify-center shadow-md z-10"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Expanded media preview"
              className="w-full h-full object-contain max-h-[85vh] rounded-xl"
            />
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {targetDeletePost && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground font-outfit">
                  Delete this announcement?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will permanently remove this broadcast bulletin from the student community feed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetDeletePost(null)}
                disabled={isDeleting}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="rounded-xl text-xs font-bold shadow-2xs"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
