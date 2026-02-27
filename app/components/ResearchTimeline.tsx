"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useEdit } from "../contexts/EditExperimentContext";
import UnifiedDocumentModal from "./UnifiedDocumentModal";
import { useFeedbackSheet } from "../contexts/FeedbackSheetContext";

type WipStatus =
  | "idea"
  | "prototype"
  | "built"
  | "wip"
  | "failed"
  | "exploring"
  | "testing"
  | "completed";

type Post = {
  id: string;
  user_id: string;
  title: string | null;
  problem_statement: string | null;
  theory?: string | null;
  explanation?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  feedback_needed?: string[] | string | null;
  external_link?: string | null;
  media_url?: string | null;
  wip_status: WipStatus | null;
  created_at: string | null;
};

type Props = {
  userId: string;
  currentUserId?: string | null;
  initialPosts?: Post[];
  showAuthor?: boolean;
  authorName?: string | null;
  onCountChange?: (n: number) => void;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const badgeStyles: Record<WipStatus, string> = {
  idea: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
  exploring: "bg-sky-500/20 text-sky-200 border-sky-500/40",
  prototype: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  testing: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  failed: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  built: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  wip: "bg-sky-500/20 text-sky-200 border-sky-500/40",
};

const badgeLabels: Record<WipStatus, string> = {
  idea: "Idea",
  exploring: "Exploring",
  prototype: "Prototype",
  testing: "Testing",
  completed: "Completed",
  failed: "Failed",
  built: "Completed",
  wip: "Exploring",
};

export default function ResearchTimeline({
  userId,
  currentUserId,
  initialPosts,
  showAuthor = false,
  authorName,
  onCountChange,
}: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(!initialPosts);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeValidateCount, setActiveValidateCount] = useState(0);
  const [activeIsValidated, setActiveIsValidated] = useState(false);
  const [deleteTargetPostId, setDeleteTargetPostId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const { openEdit } = useEdit();
  const { open: openFeedback } = useFeedbackSheet();
  const isOwner = (post: Post) => currentUserId === post.user_id;

  useEffect(() => {
    let mounted = true;
    if (!initialPosts) {
      const fetch = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from("posts")
          .select(
            "id,user_id,title,problem_statement,theory,explanation,approach,observations,reflection,feedback_needed,external_link,media_url,wip_status,created_at"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        if (!error) {
          setPosts((data as Post[]) ?? []);
          onCountChange?.((data as Post[])?.length ?? 0);
        }
        setLoading(false);
      };
      fetch();
    } else {
      onCountChange?.(initialPosts.length);
    }
    return () => {
      mounted = false;
    };
  }, [userId, initialPosts, onCountChange]);

  const openModal = (post: Post) => {
    setActivePostId(post.id);
  };
  const closeModal = () => {
    setActivePostId(null);
  };

  const requestDeletePost = (postId: string) => {
    setDeleteTargetPostId(postId);
  };

  const cancelDeletePost = () => {
    if (deletingPost) return;
    setDeleteTargetPostId(null);
  };


  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; payload: Partial<Post> }>;
      const { id, payload } = ce.detail ?? {};
      if (!id) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                title: (payload.title as string | null) ?? p.title,
                wip_status: (payload.wip_status as WipStatus | null) ?? p.wip_status,
                problem_statement:
                  (payload.problem_statement as string | null) ?? p.problem_statement,
                theory: (payload.theory as string | null) ?? p.theory,
                explanation: (payload.explanation as string | null) ?? p.explanation,
                approach: (payload.approach as string | null) ?? p.approach,
                observations:
                  (payload.observations as string | null) ?? p.observations,
                reflection: (payload.reflection as string | null) ?? p.reflection,
                feedback_needed:
                  (payload.feedback_needed as string[] | null) ?? p.feedback_needed,
                external_link:
                  (payload.external_link as string | null) ?? p.external_link,
              }
            : p
        )
      );
    };
    if (typeof window !== "undefined") {
      window.addEventListener("experiment:updated", handler as EventListener);
      return () =>
        window.removeEventListener("experiment:updated", handler as EventListener);
    }
  }, []);

  const openEditGlobal = (post: Post) => {
    setActivePostId(null);
    openEdit(post.id);
  };

  useEffect(() => {
    let active = true;
    const fetchModalValidationState = async () => {
      if (!activePostId) {
        setActiveValidateCount(0);
        setActiveIsValidated(false);
        return;
      }
      const { data } = await supabase
        .from("validations")
        .select("user_id")
        .eq("post_id", activePostId);
      if (!active) return;
      const rows = (data as { user_id: string }[] | null) ?? [];
      setActiveValidateCount(rows.length);
      setActiveIsValidated(!!currentUserId && rows.some((row) => row.user_id === currentUserId));
    };
    void fetchModalValidationState();
    return () => {
      active = false;
    };
  }, [activePostId, currentUserId]);

  const handleToggleValidate = async () => {
    if (!activePost || !currentUserId) return;
    if (activeIsValidated) {
      const { error } = await supabase
        .from("validations")
        .delete()
        .eq("post_id", activePost.id)
        .eq("user_id", currentUserId);
      if (!error) {
        setActiveIsValidated(false);
        setActiveValidateCount((prev) => Math.max(0, prev - 1));
      }
      return;
    }
    const { error } = await supabase
      .from("validations")
      .insert({ post_id: activePost.id, user_id: currentUserId });
    if (!error) {
      setActiveIsValidated(true);
      setActiveValidateCount((prev) => prev + 1);
    }
  };

  const confirmDeletePost = async () => {
    if (!deleteTargetPostId || !currentUserId) return;
    setDeletingPost(true);
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", deleteTargetPostId)
      .eq("user_id", currentUserId);
    if (error) {
      console.error("Failed to delete post:", error.message);
      setDeletingPost(false);
      return;
    }
    setPosts((prev) => prev.filter((post) => post.id !== deleteTargetPostId));
    setDeleteTargetPostId(null);
    setActivePostId((prev) => (prev === deleteTargetPostId ? null : prev));
    setDeletingPost(false);
  };

  const items = useMemo(() => posts, [posts]);
  const activePost = items.find((p) => p.id === activePostId) ?? null;
  const excerpt = (value: string, limit: number) =>
    value.length > limit ? `${value.slice(0, limit)}…` : value;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-transparent" />
        Loading experiments...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center">
            <p className="text-base font-semibold text-slate-100">
              No experiments published yet.
            </p>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Start documenting your ideas and build your public research profile.
            </p>
          </div>
        ) : (
          items.map((post) => {
            const dateText = post.created_at
              ? new Date(post.created_at).toLocaleDateString()
              : "Recently";
            const desc = excerpt(post.problem_statement ?? "", 140);
            return (
              <div
                key={post.id}
                className="grid grid-cols-[120px_1fr] items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                role="button"
                tabIndex={0}
                onClick={() => openModal(post)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openModal(post);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="text-xs text-slate-400">{dateText}</div>
                <div className="text-sm text-slate-200">
                  <p className="font-semibold text-slate-100">
                    {post.title ?? "Untitled Experiment"}
                  </p>
                  {post.problem_statement && (
                    <p className="mt-1 text-slate-300">{desc}</p>
                  )}
                  <div
                    className="mt-2 flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        badgeStyles[(post.wip_status ?? "idea") as WipStatus]
                      }`}
                    >
                      {badgeLabels[(post.wip_status ?? "idea") as WipStatus]}
                    </span>
                    {showAuthor && authorName && (
                      <span className="text-xs text-slate-400">by {authorName}</span>
                    )}
                    {currentUserId === post.user_id && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditGlobal(post);
                          }}
                          className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeletePost(post.id);
                          }}
                          className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <UnifiedDocumentModal
        open={!!activePost}
        post={activePost}
        statusClassName={
          activePost ? badgeStyles[(activePost.wip_status ?? "idea") as WipStatus] : undefined
        }
        authorName={showAuthor ? authorName : null}
        onValidate={activePost ? handleToggleValidate : undefined}
        isValidated={activeIsValidated}
        validateCount={activePost ? activeValidateCount : undefined}
        onAddInsight={activePost ? () => openFeedback(activePost.id) : undefined}
        onEdit={activePost ? () => openEditGlobal(activePost) : undefined}
        canEdit={!!(activePost && isOwner(activePost))}
        onClose={closeModal}
      />
      {deleteTargetPostId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100">Delete this record?</h3>
            <p className="mt-3 text-sm text-slate-300">
              This action cannot be undone. The record and all related insights will be permanently removed.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelDeletePost}
                disabled={deletingPost}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                disabled={deletingPost}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

