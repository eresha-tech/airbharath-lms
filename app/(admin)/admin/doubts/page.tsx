/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  CornerDownRight, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink,
  MessageSquareDashed
} from "lucide-react";
import Link from "next/link";

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

  // Fetch all comments (admin view)
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
      
      // Scan all localStorage keys starting with irii_comments_
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
                  course_title: item.course_title || "Demo Course",
                  course_id: item.course_id || "demo"
                });
              });
            } catch (e) {
              console.error("Error parsing local comments", e);
            }
          }
        }
      }
      // Sort all comments descending
      localComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    const text = replyText;
    setReplyText("");
    setReplyToId(null);

    const tempId = Math.random().toString();
    const newReply: Comment = {
      id: tempId,
      lesson_id: parentComment.lesson_id,
      user_id: "admin", // Placeholder or dynamic if needed
      content: text,
      parent_id: parentComment.id,
      created_at: new Date().toISOString(),
      user_name: "Instructor (Admin)",
      user_role: "admin",
      lesson_title: parentComment.lesson_title,
      course_title: parentComment.course_title,
      course_id: parentComment.course_id
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
            parentId: parentComment.id
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to post reply to DB");
        }
        await fetchAllComments();
      } catch (err) {
        console.error("Error saving reply:", err);
        // Fallback local save
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

    // Helper to delete recursively from local list
    const deleteRecursive = (list: Comment[], targetId: string): Comment[] => {
      const childrenIds = list.filter(c => c.parent_id === targetId).map(c => c.id);
      let updated = list.filter(c => c.id !== targetId);
      childrenIds.forEach(childId => {
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
        // Fallback local delete
        const storageKey = `irii_comments_${comment.lesson_id}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const updated = deleteRecursive(existing, comment.id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setUsingFallback(true);
        fetchAllComments();
      }
    }
  };

  // Filter computations
  const getCommentReplies = (parentId: string) => {
    return comments.filter(c => c.parent_id === parentId);
  };

  const topLevelDoubts = comments.filter(c => !c.parent_id);

  const filteredDoubts = topLevelDoubts.filter(doubt => {
    const matchesSearch = 
      doubt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doubt.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doubt.course_title && doubt.course_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doubt.lesson_title && doubt.lesson_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const replies = getCommentReplies(doubt.id);
    const matchesUnresolved = !filterUnresolved || replies.length === 0;

    return matchesSearch && matchesUnresolved;
  });

  const totalDoubtsCount = topLevelDoubts.length;
  const unresolvedDoubtsCount = topLevelDoubts.filter(d => getCommentReplies(d.id).length === 0).length;
  const resolvedDoubtsCount = totalDoubtsCount - unresolvedDoubtsCount;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Student Doubts & Questions</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Answer questions, resolve conceptual doubts, and moderate discussion boards.
          </p>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border/80 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Questions</p>
            <h3 className="text-3xl font-black mt-2 text-foreground">{totalDoubtsCount}</h3>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border border-border/80 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unresolved Doubts</p>
            <h3 className="text-3xl font-black mt-2 text-amber-500">{unresolvedDoubtsCount}</h3>
          </div>
          <div className="h-12 w-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border border-border/80 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolved Questions</p>
            <h3 className="text-3xl font-black mt-2 text-emerald-500">{resolvedDoubtsCount}</h3>
          </div>
          <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search doubts, students, courses, or modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/40 border border-border/80 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-end">
          <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterUnresolved}
              onChange={(e) => setFilterUnresolved(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Show Unresolved Only</span>
          </label>
        </div>
      </div>

      {/* Doubts Threaded List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-28 bg-card border rounded-2xl animate-pulse" />
            <div className="h-28 bg-card border rounded-2xl animate-pulse" />
          </div>
        ) : filteredDoubts.length > 0 ? (
          filteredDoubts.map((doubt) => {
            const replies = getCommentReplies(doubt.id);
            const showReplyInput = replyToId === doubt.id;

            return (
              <div 
                key={doubt.id}
                className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4 hover:border-border transition-colors"
              >
                {/* Doubt Meta info header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-foreground">{doubt.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doubt.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary">
                      <span>{doubt.course_title}</span>
                      <span>/</span>
                      <span className="text-muted-foreground">{doubt.lesson_title}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doubt.course_id && (
                      <Link 
                        href={`/dashboard/courses/${doubt.course_id}/lessons/${doubt.lesson_id}`}
                        target="_blank"
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg border border-border/40 text-[10px] font-bold flex items-center gap-1"
                        title="View lesson content"
                      >
                        <ExternalLink className="h-3 w-3" /> View Lesson
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteComment(doubt)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent"
                      title="Delete doubt"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                    {doubt.content}
                  </p>
                </div>

                {/* Action panel & Reply Toggle */}
                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={() => {
                      setReplyToId(doubt.id);
                      setReplyText("");
                    }}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                  >
                    <CornerDownRight className="h-3.5 w-3.5" /> Reply to student
                  </button>

                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {replies.length === 0 ? "⚠️ Unresolved" : `✅ ${replies.length} replies`}
                  </span>
                </div>

                {/* Sub-replies threads */}
                {replies.length > 0 && (
                  <div className="bg-muted/30 border border-border/40 rounded-xl p-4 mt-2 space-y-4">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 items-start border-b border-border/20 last:border-0 pb-3 last:pb-0">
                        <div className="h-6 w-6 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                          {reply.user_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-foreground">
                                {reply.user_name}
                              </span>
                              {reply.user_role === "admin" && (
                                <span className="px-1.5 py-0.5 bg-[#004D61]/10 text-[#004D61] border border-[#004D61]/25 rounded text-[8px] font-black uppercase tracking-wider">
                                  Instructor
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(reply.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <button
                                onClick={() => handleDeleteComment(reply)}
                                className="text-muted-foreground hover:text-red-500 p-0.5 rounded transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 whitespace-pre-wrap">
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
                    className="flex gap-2 items-center bg-muted/40 border border-border/60 rounded-xl p-2 mt-2"
                  >
                    <input
                      type="text"
                      placeholder={`Write your answer to ${doubt.user_name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs font-semibold px-2 py-1.5"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSubmitting}
                      className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Post Answer
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyToId(null)}
                      className="px-3 py-1.5 rounded-lg bg-card text-muted-foreground border border-border/80 hover:bg-muted text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-muted-foreground shadow-sm">
            <MessageSquareDashed className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-bold text-foreground">No Doubts Found</h3>
            <p className="text-xs max-w-sm mx-auto mt-1">
              {searchTerm 
                ? "No questions match your current search query or active filters." 
                : "Great job! All student questions have been answered or no questions have been asked yet."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
