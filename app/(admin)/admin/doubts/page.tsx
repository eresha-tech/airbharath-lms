"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Trash2,
  CornerDownRight,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  MessageSquareDashed,
  Send,
  User,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  user_name: string;
  user_role?: string;
  lesson_title?: string;
  course_title?: string;
  course_id?: string;
}

export default function AdminDoubtsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnresolved, setFilterUnresolved] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch all comments
  const fetchAllComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/comments");
      if (!res.ok) {
        throw new Error("Failed to fetch from DB API");
      }
      const data = await res.json();
      if (data.fallback) {
        throw new Error("Fallback requested by API");
      }
      setComments(data.comments || []);
      setUsingFallback(false);
    } catch (err) {
      console.warn("Using localStorage scanner fallback for Admin doubts:", err);
      setUsingFallback(true);

      const localComments: Comment[] = [];
      if (typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("irii_comments_")) {
            const lessonId = key.replace("irii_comments_", "");
            try {
              const items = JSON.parse(localStorage.getItem(key) || "[]");
              items.forEach((item: any) => {
                localComments.push({
                  ...item,
                  lesson_title: item.lesson_title || `Lesson #${lessonId.slice(0, 6)}`,
                  course_title: item.course_title || "Technical Course",
                  course_id: item.course_id || "demo",
                });
              });
            } catch (e) {
              console.error("Error parsing local comments", e);
            }
          }
        }
      }
      localComments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setComments(localComments);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllComments();
  }, [fetchAllComments]);

  // Reply handler
  const handlePostReply = async (e: React.FormEvent, parentComment: Comment) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    const text = replyText.trim();
    setReplyText("");
    setReplyToId(null);

    const tempId = Math.random().toString();
    const newReply: Comment = {
      id: tempId,
      lesson_id: parentComment.lesson_id,
      user_id: "admin",
      content: text,
      parent_id: parentComment.id,
      created_at: new Date().toISOString(),
      user_name: "Lead Instructor (Admin)",
      user_role: "admin",
      lesson_title: parentComment.lesson_title,
      course_title: parentComment.course_title,
      course_id: parentComment.course_id,
    };

    if (usingFallback) {
      const storageKey = `irii_comments_${parentComment.lesson_id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [newReply, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setIsSubmitting(false);
      fetchAllComments();
    } else {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: parentComment.lesson_id,
            content: text,
            parentId: parentComment.id,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to post reply to DB");
        }
        await fetchAllComments();
      } catch (err) {
        console.error("Error saving reply:", err);
        const storageKey = `irii_comments_${parentComment.lesson_id}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const updated = [newReply, ...existing];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setUsingFallback(true);
        fetchAllComments();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Delete handler
  const handleDeleteComment = async (comment: Comment) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    const deleteRecursive = (list: Comment[], targetId: string): Comment[] => {
      const childrenIds = list.filter((c) => c.parent_id === targetId).map((c) => c.id);
      let updated = list.filter((c) => c.id !== targetId);
      childrenIds.forEach((childId) => {
        updated = deleteRecursive(updated, childId);
      });
      return updated;
    };

    if (usingFallback) {
      const storageKey = `irii_comments_${comment.lesson_id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = deleteRecursive(existing, comment.id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      fetchAllComments();
    } else {
      try {
        const res = await fetch(`/api/comments?commentId=${comment.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to delete comment");
        }
        await fetchAllComments();
      } catch (err) {
        console.error("Error deleting comment:", err);
        const storageKey = `irii_comments_${comment.lesson_id}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const updated = deleteRecursive(existing, comment.id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setUsingFallback(true);
        fetchAllComments();
      }
    }
  };

  const getCommentReplies = useCallback(
    (parentId: string) => {
      return comments.filter((c) => c.parent_id === parentId);
    },
    [comments]
  );

  const topLevelDoubts = comments.filter((c) => !c.parent_id);

  const filteredDoubts = useMemo(() => {
    return topLevelDoubts.filter((doubt) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        doubt.content.toLowerCase().includes(term) ||
        doubt.user_name.toLowerCase().includes(term) ||
        (doubt.course_title && doubt.course_title.toLowerCase().includes(term)) ||
        (doubt.lesson_title && doubt.lesson_title.toLowerCase().includes(term));

      const replies = getCommentReplies(doubt.id);
      const matchesUnresolved = !filterUnresolved || replies.length === 0;

      return matchesSearch && matchesUnresolved;
    });
  }, [topLevelDoubts, searchTerm, filterUnresolved, getCommentReplies]);

  const totalDoubtsCount = topLevelDoubts.length;
  const unresolvedDoubtsCount = topLevelDoubts.filter(
    (d) => getCommentReplies(d.id).length === 0
  ).length;
  const resolvedDoubtsCount = totalDoubtsCount - unresolvedDoubtsCount;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Student Doubts & QA Moderation
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Answer student questions, resolve technical inquiries, and moderate course discussions.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Questions
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalDoubtsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Submitted student inquiries</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Response
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <HelpCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 font-outfit">
              {unresolvedDoubtsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting instructor reply</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Resolved Answers
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 font-outfit">
              {resolvedDoubtsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Answered by instructors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions by student, course, or lesson content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-input rounded-xl bg-background text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterUnresolved}
            onChange={(e) => setFilterUnresolved(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <span>Show Unresolved Only</span>
        </label>
      </Card>

      {/* Doubts Threaded List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-card border border-border/80 rounded-2xl animate-pulse" />
            <div className="h-32 bg-card border border-border/80 rounded-2xl animate-pulse" />
          </div>
        ) : filteredDoubts.length > 0 ? (
          filteredDoubts.map((doubt) => {
            const replies = getCommentReplies(doubt.id);
            const showReplyInput = replyToId === doubt.id;

            return (
              <Card
                key={doubt.id}
                className="rounded-2xl border-border/80 shadow-2xs p-5 sm:p-6 space-y-4 hover:border-border transition-colors"
              >
                {/* Doubt Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {doubt.user_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-foreground font-outfit">
                        {doubt.user_name}
                      </span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(doubt.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                      <span>{doubt.course_title || "Course"}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground font-normal">
                        {doubt.lesson_title || "Lesson"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doubt.course_id && doubt.lesson_id && (
                      <Link
                        href={`/dashboard/courses/${doubt.course_id}/lessons/${doubt.lesson_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <span>View Lesson</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteComment(doubt)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {doubt.content}
                </p>

                {/* Reply Action Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setReplyToId(doubt.id);
                      setReplyText("");
                    }}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5"
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                    <span>Reply as Instructor</span>
                  </button>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      replies.length === 0
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {replies.length === 0 ? "Awaiting Reply" : `${replies.length} Replies`}
                  </span>
                </div>

                {/* Nested Thread Replies */}
                {replies.length > 0 && (
                  <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3 mt-2">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="flex gap-3 items-start border-b border-border/40 last:border-0 pb-3 last:pb-0"
                      >
                        <div className="h-6 w-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                          {reply.user_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">
                                {reply.user_name}
                              </span>
                              {reply.user_role === "admin" && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-primary/10 text-primary rounded text-[9px] font-bold uppercase">
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  Instructor
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(reply.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteComment(reply)}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Form */}
                {showReplyInput && (
                  <form
                    onSubmit={(e) => handlePostReply(e, doubt)}
                    className="flex gap-2 items-center bg-muted/40 border border-primary/30 rounded-xl p-2 mt-2"
                  >
                    <input
                      type="text"
                      placeholder={`Write your answer to ${doubt.user_name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1 bg-transparent border-0 focus:outline-none text-xs sm:text-sm font-medium px-2 py-1"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!replyText.trim() || isSubmitting}
                      className="rounded-lg text-xs font-bold gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post Answer</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyToId(null)}
                      className="rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                  </form>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-border/80 shadow-2xs p-16 text-center text-muted-foreground">
            <MessageSquareDashed className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No questions found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm
                ? "No questions match your current search query or active filter."
                : "All student questions have been answered or no doubts have been submitted yet."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
