"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { useEdit } from "../contexts/EditExperimentContext";
import PostComments from "./PostComments";
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

const normalizeFeedback = (value?: string[] | string | null) => {
  if (!value) return [] as string[];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    return [String(value)];
  }
  return [String(value)];
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

  const items = useMemo(() => posts, [posts]);
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
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {activePostId && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
        >
          <div
            className="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const post = items.find((p) => p.id === activePostId);
              if (!post) return null;
              const owner = isOwner(post);
              const approach = post.approach ?? post.explanation ?? null;
              const feedbackList = normalizeFeedback(post.feedback_needed);
              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
                        Research Record
                      </p>
                      <p className="text-lg font-semibold text-slate-100">
                        {post.title ?? "Untitled Experiment"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        {showAuthor && authorName && (
                          <>
                            <span className="text-cyan-200">{authorName}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          {post.created_at
                            ? new Date(post.created_at).toLocaleString()
                            : "Recently"}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            badgeStyles[(post.wip_status ?? "idea") as WipStatus]
                          }`}
                        >
                          {badgeLabels[(post.wip_status ?? "idea") as WipStatus]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFeedback(post.id)}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                      >
                        Add Insight
                      </button>
                      {owner && (
                        <button
                          type="button"
                          className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                          onClick={() => openEditGlobal(post)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    {
                      <div className="space-y-5">
                        {post.problem_statement && (
                          <section className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                              What is being explored
                            </p>
                            <p className="text-sm text-slate-200">
                              {post.problem_statement}
                            </p>
                          </section>
                        )}
                        {post.theory && (
                          <section className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">
                              Core Idea
                            </p>
                            <p className="text-sm text-slate-200">{post.theory}</p>
                          </section>
                        )}
                        {approach && (
                          <section className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                              Approach
                            </p>
                            <p className="text-sm text-slate-200">{approach}</p>
                          </section>
                        )}
                        {post.observations && (
                          <section className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                              Observations
                            </p>
                            <p className="text-sm text-slate-200">
                              {post.observations}
                            </p>
                          </section>
                        )}
                        {post.reflection && (
                          <section className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
                              Reflection
                            </p>
                            <p className="text-sm text-slate-200">
                              {post.reflection}
                            </p>
                          </section>
                        )}
                        {(post.media_url || post.external_link) && (
                          <section className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                              Evidence
                            </p>
                            {post.media_url && (
                              <div className="overflow-hidden rounded-2xl border border-slate-800">
                                <div className="relative aspect-[16/9] max-h-96 w-full">
                                  <Image
                                    src={post.media_url}
                                    alt="Experiment evidence"
                                    className="object-cover"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 768px"
                                  />
                                </div>
                              </div>
                            )}
                            {post.external_link && (
                              <a
                                href={post.external_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                              >
                                {post.external_link}
                              </a>
                            )}
                          </section>
                        )}
                        {feedbackList.length > 0 && (
                          <section className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                              Feedback Requested
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {feedbackList.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>
                    }
                  </div>
                </>
              );
            })()}
          </div>
          {(() => {
            const post = items.find((p) => p.id === activePostId);
            if (!post) return null;
            return (
              <div className="border-t border-slate-800 px-6 py-6">
                <PostComments postId={post.id} postOwnerId={post.user_id} />
              </div>
            );
          })()}
        </div>
      )}
      
    </>
  );
}
