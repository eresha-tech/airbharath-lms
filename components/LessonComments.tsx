"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Trash2, User, CornerDownRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_role?: string;
  parent_id?: string | null;
}

interface LessonCommentsProps {
  lessonId: string;
  currentUserId: string;
  currentUserName: string;
}

export function LessonComments({
  lessonId,
  currentUserId,
  currentUserName,
}: LessonCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch comments from PostgreSQL
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/comments?lessonId=${lessonId}`);
      if (!res.ok) {
        throw new Error("Failed to load discussions from server");
      }
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err: any) {
      console.error("Error fetching lesson comments:", err);
      setErrorMessage("Couldn't load discussions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (
    e: React.FormEvent,
    parentId: string | null = null
  ) => {
    e.preventDefault();
    const text = parentId ? replyText : inputText;
    if (!text.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          content: text.trim(),
          parentId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to post comment");
      }

      if (parentId) {
        setReplyText("");
        setReplyToId(null);
      } else {
        setInputText("");
      }

      await fetchComments();
    } catch (err: any) {
      console.error("Error saving comment to DB:", err);
      setErrorMessage(err.message || "Couldn't post your question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/comments?commentId=${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete comment");
      }

      await fetchComments();
    } catch (err: any) {
      console.error("Error deleting comment from DB:", err);
      setErrorMessage("Failed to delete comment. Please try again.");
    }
  };

  const getCommentReplies = (parentId: string) => {
    return comments
      .filter((c) => c.parent_id === parentId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  };

  const topLevelComments = comments
    .filter((c) => !c.parent_id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const renderCommentNode = (comment: Comment, depth: number = 0) => {
    const isOwner = comment.user_id === currentUserId;
    const replies = getCommentReplies(comment.id);
    const showReplyBox = replyToId === comment.id;
    const initials =
      comment.user_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "ST";

    return (
      <div key={comment.id} className="space-y-2">
        <div
          className={`flex gap-3 py-3 rounded-xl transition-colors ${
            depth > 0
              ? "pl-4 md:pl-6 border-l-2 border-primary/20 ml-2 md:ml-4 bg-muted/20"
              : ""
          }`}
        >
          <Avatar className="h-8 w-8 rounded-lg border border-border/80 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold rounded-lg font-sans">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground truncate">
                  {comment.user_name}
                </span>
                {comment.user_role === "admin" && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded">
                    Instructor
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {isOwner && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                    title="Delete comment"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed mt-1.5 whitespace-pre-wrap font-sans">
              {comment.content}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setReplyToId(comment.id);
                  setReplyText("");
                }}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CornerDownRight className="h-3 w-3" />
                <span>Reply</span>
              </button>
            </div>

            {/* Inline reply Box */}
            {showReplyBox && (
              <form
                onSubmit={(e) => handlePostComment(e, comment.id)}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  placeholder={`Reply to @${comment.user_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyText.trim() || isSubmitting}
                  className="px-3.5 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyToId(null)}
                  className="px-3 h-8 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Recursive replies */}
        {replies.length > 0 && (
          <div className="space-y-1">
            {replies.map((reply) => renderCommentNode(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xs font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm sm:text-base font-outfit text-foreground">
            Doubts &amp; Discussion
          </h3>
          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-lg">
            {comments.length}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchComments}
          disabled={isLoading}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
          title="Refresh discussions"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Error / Retry Notice */}
      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchComments}
            className="h-7 px-2.5 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/15 rounded-lg cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={(e) => handlePostComment(e, null)} className="flex gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Ask a question or share a thought about this lesson..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 bg-muted/40 border border-input rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all placeholder:text-muted-foreground/70"
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Post</span>
          </Button>
        </div>
      </form>

      {/* Comments Feed */}
      <div className="space-y-4 pt-1">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-14 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-14 bg-muted/40 rounded-2xl animate-pulse" />
          </div>
        ) : topLevelComments.length > 0 ? (
          <div className="space-y-3 divide-y divide-border/40">
            {topLevelComments.map((comment) => renderCommentNode(comment, 0))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 text-muted-foreground space-y-1.5 bg-muted/20 border border-dashed border-border/80 rounded-2xl">
            <MessageSquare className="h-7 w-7 mx-auto text-muted-foreground/40 mb-1" />
            <p className="text-xs font-bold text-foreground">No questions or discussions yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Have a doubt about this lesson? Post it above to get instructor guidance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

