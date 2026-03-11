"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { ProblemComment } from "./types";

type Props = {
  problemId: string;
  userId: string | null;
  initialValidationCount: number;
  initialCommentCount: number;
  initialIsValidated: boolean;
  onRequireAuth: () => void;
  onStatsChange?: (stats: {
    validationCount?: number;
    commentCount?: number;
    isValidated?: boolean;
  }) => void;
};

type ApiResponse = {
  error?: string;
  commentCount?: number;
  comments?: ProblemComment[];
};

function getDisplayName(comment: ProblemComment) {
  return comment.author?.username || comment.author?.email || "Innovator";
}

function getInitials(comment: ProblemComment) {
  const label = getDisplayName(comment).trim();
  if (!label) return "IN";
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function attachPermissions(comments: ProblemComment[], userId: string | null): ProblemComment[] {
  return comments.map((comment) => ({
    ...comment,
    canEdit: comment.user_id === userId,
    replies: comment.replies.map((reply) => ({
      ...reply,
      canEdit: reply.user_id === userId,
    })),
  }));
}

async function requestProblemComments(problemId: string) {
  const response = await fetch(`/api/problems/${problemId}/comments`, {
    method: "GET",
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as ApiResponse;
  return { response, payload };
}

export default function ProblemDiscussionSection({
  problemId,
  userId,
  initialValidationCount,
  initialCommentCount,
  initialIsValidated,
  onRequireAuth,
  onStatsChange,
}: Props) {
  const [validationCount, setValidationCount] = useState(initialValidationCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isValidated, setIsValidated] = useState(initialIsValidated);
  const [validating, setValidating] = useState(false);
  const [comments, setComments] = useState<ProblemComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const { response, payload } = await requestProblemComments(problemId);
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load insights.");
      setLoadingComments(false);
      return;
    }
    setComments(attachPermissions(payload.comments ?? [], userId));
    setLoadingComments(false);
  }, [problemId, userId]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialComments = async () => {
      const { response, payload } = await requestProblemComments(problemId);
      if (cancelled) return;
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to load insights.");
        setLoadingComments(false);
        return;
      }
      setComments(attachPermissions(payload.comments ?? [], userId));
      setLoadingComments(false);
    };

    void loadInitialComments();

    return () => {
      cancelled = true;
    };
  }, [problemId, userId]);

  useEffect(() => {
    const commentsChannel = supabase
      .channel(`problem-comments:${problemId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "problem_comments", filter: `problem_id=eq.${problemId}` },
        async () => {
          await fetchComments();
          const { count } = await supabase
            .from("problem_comments")
            .select("*", { count: "exact", head: true })
            .eq("problem_id", problemId);
          const nextCount = count ?? 0;
          setCommentCount(nextCount);
          onStatsChange?.({ commentCount: nextCount });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(commentsChannel);
    };
  }, [fetchComments, onStatsChange, problemId]);

  const handleValidate = async () => {
    if (validating) {
      return;
    }

    if (!userId) {
      onRequireAuth();
      return;
    }

    setValidating(true);
    setMessage(null);
    const previousValidated = isValidated;
    const previousCount = validationCount;
    const optimisticValidated = !previousValidated;
    const optimisticCount = Math.max(0, previousCount + (previousValidated ? -1 : 1));

    setValidationCount(optimisticCount);
    setIsValidated(optimisticValidated);
    onStatsChange?.({ validationCount: optimisticCount, isValidated: optimisticValidated });

    if (previousValidated) {
      const { error } = await supabase
        .from("problem_validations")
        .delete()
        .eq("problem_id", problemId)
        .eq("user_id", userId);

      if (error) {
        setValidationCount(previousCount);
        setIsValidated(previousValidated);
        onStatsChange?.({ validationCount: previousCount, isValidated: previousValidated });
        setMessage(error.message ?? "Unable to update validation.");
        setValidating(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("problem_validations")
        .insert({ problem_id: problemId, user_id: userId });

      if (error) {
        setValidationCount(previousCount);
        setIsValidated(previousValidated);
        onStatsChange?.({ validationCount: previousCount, isValidated: previousValidated });
        setMessage(error.message ?? "Unable to update validation.");
        setValidating(false);
        return;
      }
    }

    const { data } = await supabase
      .from("problem_validations")
      .select("id")
      .eq("problem_id", problemId)
      .eq("user_id", userId)
      .maybeSingle();

    setValidationCount(optimisticCount);
    setIsValidated(!!data?.id);
    onStatsChange?.({ validationCount: optimisticCount, isValidated: !!data?.id });
    setValidating(false);
  };

  const handleCommentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId) {
      onRequireAuth();
      return;
    }

    const content = commentDraft.trim();
    if (!content) return;

    setSubmittingComment(true);
    setMessage(null);
    const response = await fetch(`/api/problems/${problemId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to add insight.");
      setSubmittingComment(false);
      return;
    }

    const nextCount = payload.commentCount ?? commentCount;
    setCommentCount(nextCount);
    onStatsChange?.({ commentCount: nextCount });
    setCommentDraft("");
    setSubmittingComment(false);
    await fetchComments();
  };

  const handleReplySubmit = async (event: FormEvent, parentId: string) => {
    event.preventDefault();
    if (!userId) {
      onRequireAuth();
      return;
    }

    const content = replyDrafts[parentId]?.trim() ?? "";
    if (!content) return;

    setSubmittingReplyId(parentId);
    setMessage(null);
    const response = await fetch(`/api/comments/${parentId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to add reply.");
      setSubmittingReplyId(null);
      return;
    }

    const nextCount = payload.commentCount ?? commentCount;
    setCommentCount(nextCount);
    onStatsChange?.({ commentCount: nextCount });
    setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
    setReplyingTo(null);
    setSubmittingReplyId(null);
    await fetchComments();
  };

  const beginEditComment = (comment: ProblemComment) => {
    setEditingCommentId(comment.id);
    setEditDrafts((prev) => ({
      ...prev,
      [comment.id]: comment.content,
    }));
  };

  const handleEditComment = async (event: FormEvent, commentId: string) => {
    event.preventDefault();
    const content = editDrafts[commentId]?.trim() ?? "";
    if (!content) return;

    setSavingCommentId(commentId);
    setMessage(null);
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to update insight.");
      setSavingCommentId(null);
      return;
    }

    setEditingCommentId(null);
    setSavingCommentId(null);
    await fetchComments();
  };

  const handleDeleteComment = async (comment: ProblemComment) => {
    if (!window.confirm("Delete this insight? This will also remove nested replies.")) {
      return;
    }

    setDeletingCommentId(comment.id);
    setMessage(null);
    const response = await fetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to delete insight.");
      setDeletingCommentId(null);
      return;
    }

    const nextCount = payload.commentCount ?? commentCount;
    setCommentCount(nextCount);
    onStatsChange?.({ commentCount: nextCount });
    setDeletingCommentId(null);
    await fetchComments();
  };

  const renderCommentActions = (comment: ProblemComment) => (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {!comment.parent_id && (
        <button
          type="button"
          onClick={() => {
            if (!userId) {
              onRequireAuth();
              return;
            }
            setReplyingTo((prev) => (prev === comment.id ? null : comment.id));
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition hover:text-cyan-100"
        >
          <Reply className="h-3.5 w-3.5" />
          Reply
        </button>
      )}
      {comment.canEdit && editingCommentId !== comment.id && (
        <>
          <button
            type="button"
            onClick={() => beginEditComment(comment)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 transition hover:text-slate-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            disabled={deletingCommentId === comment.id}
            onClick={() => void handleDeleteComment(comment)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 transition hover:text-rose-100 disabled:opacity-60"
          >
            {deletingCommentId === comment.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </button>
        </>
      )}
    </div>
  );

  const renderEditor = (commentId: string, compact = false) => (
    <form onSubmit={(event) => void handleEditComment(event, commentId)} className="mt-3 space-y-2">
      <textarea
        value={editDrafts[commentId] ?? ""}
        onChange={(event) =>
          setEditDrafts((prev) => ({
            ...prev,
            [commentId]: event.target.value,
          }))
        }
        className={`w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
          compact ? "min-h-[80px]" : "min-h-[88px]"
        }`}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditingCommentId(null)}
          className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={savingCommentId === commentId}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingCommentId === commentId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </button>
      </div>
    </form>
  );

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Discussion</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-emerald-300" />
              {validationCount} {validationCount === 1 ? "validation" : "validations"}
            </span>
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-300" />
              {commentCount} {commentCount === 1 ? "Insight" : "Insights"}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={validating}
          onClick={() => void handleValidate()}
          className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isValidated
              ? "border-emerald-500/60 bg-emerald-500/16 text-emerald-100"
              : "border-slate-700 bg-slate-950/70 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-100"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {isValidated ? "Validated" : "Validate"}
          <span className="rounded-full border border-emerald-400/30 bg-slate-950/40 px-2 py-[1px] text-[10px] leading-none text-emerald-100">
            {validationCount}
          </span>
        </button>
      </div>

      <form onSubmit={handleCommentSubmit} className="space-y-3">
        <textarea
          value={commentDraft}
          onChange={(event) => setCommentDraft(event.target.value)}
          placeholder="Add an insight, example, or constraint..."
          className="min-h-[96px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Replies are limited to one nested level.</p>
          <button
            type="submit"
            disabled={submittingComment}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Add Insight
          </button>
        </div>
      </form>

      {message && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          {message}
        </div>
      )}

      {loadingComments ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading insights...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400">No insights yet. Start the discussion.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold text-cyan-100">
                  {getInitials(comment)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <Link
                      href={`/profile/${comment.user_id}`}
                      className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
                    >
                      {getDisplayName(comment)}
                    </Link>
                    <span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : "Recently"}</span>
                  </div>

                  {editingCommentId === comment.id ? (
                    renderEditor(comment.id)
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{comment.content}</p>
                  )}

                  {renderCommentActions(comment)}

                  {replyingTo === comment.id && (
                    <form onSubmit={(event) => void handleReplySubmit(event, comment.id)} className="mt-3 space-y-2">
                      <textarea
                        value={replyDrafts[comment.id] ?? ""}
                        onChange={(event) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [comment.id]: event.target.value,
                          }))
                        }
                        placeholder="Add a reply..."
                        className="min-h-[80px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingReplyId === comment.id}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submittingReplyId === comment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Reply
                        </button>
                      </div>
                    </form>
                  )}

                  {comment.replies.length > 0 && (
                    <div className="mt-4 space-y-3 border-l border-slate-700 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] font-semibold text-slate-200">
                              {getInitials(reply)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                <Link
                                  href={`/profile/${reply.user_id}`}
                                  className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
                                >
                                  {getDisplayName(reply)}
                                </Link>
                                <span>
                                  {reply.created_at ? new Date(reply.created_at).toLocaleString() : "Recently"}
                                </span>
                              </div>

                              {editingCommentId === reply.id ? (
                                renderEditor(reply.id, true)
                              ) : (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{reply.content}</p>
                              )}

                              {renderCommentActions(reply)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
