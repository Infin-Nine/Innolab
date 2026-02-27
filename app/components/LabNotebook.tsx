"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Paperclip } from "lucide-react";
import { useEdit } from "../contexts/EditExperimentContext";
import UnifiedDocumentModal from "./UnifiedDocumentModal";
import { useFeedbackSheet } from "../contexts/FeedbackSheetContext";
import { supabase } from "../lib/supabaseClient";
import type { Post, Profile, WipStatus } from "../types/models";

type Props = {
  refreshKey?: number;
  onPostsLoaded?: (posts: Post[]) => void;
};

const badgeStyles = {
  idea: "bg-slate-800/80 text-slate-200 border-slate-600/70",
  exploring: "bg-slate-800/80 text-slate-200 border-slate-600/70",
  prototype: "bg-cyan-500/10 text-cyan-200 border-cyan-400/40",
  testing: "bg-amber-500/20 text-amber-100 border-amber-400/60",
  completed: "bg-emerald-500/30 text-emerald-50 border-emerald-300/80 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]",
  failed: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  built: "bg-emerald-500/30 text-emerald-50 border-emerald-300/80 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]",
  wip: "bg-slate-800/80 text-slate-200 border-slate-600/70",
} as const satisfies Record<WipStatus, string>;

const badgeLabels = {
  idea: "Idea",
  exploring: "Exploring",
  prototype: "Prototype",
  testing: "Testing",
  completed: "Completed",
  failed: "Failed",
  built: "Completed",
  wip: "Exploring",
} as const satisfies Record<WipStatus, string>;

export default function LabNotebook({ refreshKey = 0, onPostsLoaded }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lastFetchCount, setLastFetchCount] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, { v: number; s: number }>>({});
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const { openEdit } = useEdit();
  const { open: openFeedback } = useFeedbackSheet();
  const [mySolutionPosts, setMySolutionPosts] = useState<Record<string, boolean>>({});
  const [collaboratorIds, setCollaboratorIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [newAvailable, setNewAvailable] = useState(false);
  const [latestCreatedAt, setLatestCreatedAt] = useState<string | null>(null);
  const [deleteTargetPostId, setDeleteTargetPostId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolveAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const u = data.session?.user ?? null;
        setUserId(u?.id ?? null);
        if (u) {
          const username =
            u.user_metadata?.username ||
            u.user_metadata?.full_name ||
            u.email?.split("@")[0] ||
            "Innovator";
          setAuthors((prev) => ({
            ...prev,
            [u.id]: {
              id: u.id,
              username,
              full_name: u.user_metadata?.full_name ?? null,
              email: u.email ?? null,
              avatar_url: u.user_metadata?.avatar_url ?? null,
            },
          }));
        }
      } finally {
        if (mounted) setAuthResolved(true);
      }
    };
    resolveAuth();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthResolved(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    let mounted = true;
    const fetchPosts = async () => {
      setLoading(true);
      setFeedError(null);
      const from = page * 15;
      const to = from + 15 - 1;
      const { data, error } = await supabase
        .from("posts")
        .select("*, validations(count), solutions(count)")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        console.error(error);
      }
      if (!mounted) return;
      if (error) {
        setFeedError(error.message);
        setHasMore(false);
        setLoading(false);
        return;
      }
      const rawRows = (data as Post[]) ?? [];
      const problemIds = Array.from(
        new Set(rawRows.map((post) => post.problem_id).filter((id): id is string => !!id))
      );
      const problemTitleMap: Record<string, string> = {};
      if (problemIds.length) {
        const { data: problemRows, error: problemsError } = await supabase
          .from("problems")
          .select("id, title")
          .in("id", problemIds);
        if (problemsError) {
          console.error(problemsError);
        } else {
          ((problemRows as { id: string; title: string | null }[] | null) ?? []).forEach(
            (problem) => {
              if (problem.id) {
                problemTitleMap[problem.id] = problem.title ?? "";
              }
            }
          );
        }
      }
      const rows = rawRows.map((post) => {
        const linkedTitle = post.problem_id ? problemTitleMap[post.problem_id] : null;
        return {
          ...post,
          problems: post.problem_id
            ? {
                id: post.problem_id,
                title: linkedTitle ?? null,
              }
            : null,
          problem_title: linkedTitle ?? null,
        };
      });
      setLastFetchCount((prev) => (page === 0 ? rows.length : prev));
      const cc: Record<string, { v: number; s: number }> = {};
      rows.forEach((r) => {
        const v = r.validations?.[0]?.count ?? 0;
        const s = r.solutions?.[0]?.count ?? 0;
        cc[r.id] = { v, s };
      });
      setCounts((prev) => (page === 0 ? cc : { ...prev, ...cc }));
      let nextPosts: Post[] = [];
      setPosts((prev) => {
        nextPosts = page === 0 ? rows : [...prev, ...rows];
        return nextPosts;
      });
      if (page === 0 && rows.length > 0) {
        setLatestCreatedAt(rows[0].created_at ?? null);
      }
      setHasMore(rows.length === 15);
      const ids = rows.map((r) => r.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", Array.from(new Set(ids)));
        const map: Record<string, Profile> = {};
        ((profs as Profile[]) ?? []).forEach((p) => {
           if (p.id) {
          map[p.id] = p;
          }
        });
        setAuthors((prev) => ({ ...prev, ...map }));
      }
      onPostsLoaded?.(nextPosts);
      setLoading(false);
    };
    fetchPosts();
    return () => {
      mounted = false;
    };
  }, [refreshKey, onPostsLoaded, page, authResolved]);

  useEffect(() => {
    let mounted = true;
    const fetchMyValidations = async () => {
      if (!userId) {
        setValidated({});
        return;
      }
      const { data } = await supabase
        .from("validations")
        .select("post_id")
        .eq("user_id", userId);
      if (!mounted) return;
      const map: Record<string, boolean> = {};
      (data as { post_id: string }[] | null)?.forEach((row) => {
        map[row.post_id] = true;
      });
      setValidated(map);
    };
    fetchMyValidations();
    return () => {
      mounted = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    let mounted = true;
    const fetchMySolutions = async () => {
      if (!userId) {
        setMySolutionPosts({});
        return;
      }
      const { data } = await supabase
        .from("solutions")
        .select("post_id")
        .eq("user_id", userId);
      if (!mounted) return;
      const map: Record<string, boolean> = {};
      (data as { post_id: string }[] | null)?.forEach((row) => {
        map[row.post_id] = true;
      });
      setMySolutionPosts(map);
    };
    fetchMySolutions();
    return () => {
      mounted = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    let mounted = true;
    const fetchCollaborators = async () => {
      if (!userId) {
        setCollaboratorIds(new Set());
        return;
      }
      const { data, error } = await supabase
        .from("collaborators")
        .select("requester_id, receiver_id, status")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");
      if (!mounted) return;
      if (error) return;
      const setIds = new Set<string>();
      (data as { requester_id: string; receiver_id: string }[] | null)?.forEach((row) => {
        const other = row.requester_id === userId ? row.receiver_id : row.requester_id;
        setIds.add(other);
      });
      setCollaboratorIds(setIds);
    };
    fetchCollaborators();
    return () => {
      mounted = false;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!latestCreatedAt) return;
    const id = setInterval(async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,created_at")
        .gt("created_at", latestCreatedAt)
        .limit(1);
      const rows = (data as { id: string; created_at: string }[] | null) ?? [];
      if (!error && rows.length > 0) {
        setNewAvailable(true);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [latestCreatedAt]);

  const toggleValidate = async (postId: string) => {
    if (!userId) return;
    const isActive = !!validated[postId];
    if (isActive) {
      const { error } = await supabase
        .from("validations")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      if (!error) {
        setValidated((prev) => ({ ...prev, [postId]: false }));
        setCounts((prev) => ({
          ...prev,
          [postId]: { v: Math.max(0, (prev[postId]?.v ?? 1) - 1), s: prev[postId]?.s ?? 0 },
        }));
      }
    } else {
      const { error } = await supabase
        .from("validations")
        .insert({ post_id: postId, user_id: userId });
      if (!error) {
        setValidated((prev) => ({ ...prev, [postId]: true }));
        setCounts((prev) => ({
          ...prev,
          [postId]: { v: (prev[postId]?.v ?? 0) + 1, s: prev[postId]?.s ?? 0 },
        }));
      }
    }
  };

  const requestDeletePost = (postId: string) => {
    setDeleteTargetPostId(postId);
  };

  const cancelDeletePost = () => {
    if (deletingPost) return;
    setDeleteTargetPostId(null);
  };

  const confirmDeletePost = async () => {
    if (!deleteTargetPostId || !userId) return;
    setDeletingPost(true);
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", deleteTargetPostId)
      .eq("user_id", userId);
    if (error) {
      console.error("Failed to delete post:", error.message);
      setDeletingPost(false);
      return;
    }
    setPosts((prev) => prev.filter((post) => post.id !== deleteTargetPostId));
    setValidated((prev) => {
      const next = { ...prev };
      delete next[deleteTargetPostId];
      return next;
    });
    setCounts((prev) => {
      const next = { ...prev };
      delete next[deleteTargetPostId];
      return next;
    });
    setDeleteTargetPostId(null);
    setDeletingPost(false);
  };

  const items = useMemo(() => posts, [posts]);
  const scored = useMemo(() => {
    const nowBase =
      items.reduce((max, p) => {
        const t = p.created_at ? new Date(p.created_at).getTime() : 0;
        return t > max ? t : max;
      }, 0) || (latestCreatedAt ? new Date(latestCreatedAt).getTime() : 0);
    return items.map((p) => {
      let score = 0;
      if (collaboratorIds.has(p.user_id)) score += 80;
      if (validated[p.id] || mySolutionPosts[p.id]) score += 60;
      const created = p.created_at ? new Date(p.created_at).getTime() : nowBase;
      if (nowBase - created < 24 * 60 * 60 * 1000) score += 40;
      const c = counts[p.id] ?? { v: 0, s: 0 };
      if (c.v > 5) score += 20;
      if (c.s > 3) score += 10;
      const days = Math.max(0, Math.floor((nowBase - created) / (24 * 60 * 60 * 1000)));
      score -= days * 5;
      return { post: p, score, v: c.v, s: c.s, created };
    });
  }, [items, collaboratorIds, validated, mySolutionPosts, counts, latestCreatedAt]);

  const sections = useMemo(() => {
    const sorted = [...scored].sort((a, b) => b.score - a.score || b.created - a.created);
    const collabPosts = sorted.filter((x) => collaboratorIds.has(x.post.user_id));
    const nowBase =
      items.reduce((max, p) => {
        const t = p.created_at ? new Date(p.created_at).getTime() : 0;
        return t > max ? t : max;
      }, 0) || (latestCreatedAt ? new Date(latestCreatedAt).getTime() : 0);
    const recentOrInteracted = collabPosts.filter(
      (x) =>
        nowBase - x.created < 3 * 24 * 60 * 60 * 1000 || validated[x.post.id] || mySolutionPosts[x.post.id]
    );
    const section1 = recentOrInteracted.slice(0, 5);
    const used = new Set(section1.map((x) => x.post.id));
    const discussions = sorted.filter(
      (x) => !used.has(x.post.id) && ((x.v ?? 0) > 0 || (x.s ?? 0) > 0)
    );
    const section2 = discussions.slice(0, 5);
    section2.forEach((x) => used.add(x.post.id));
    const explore = sorted.filter((x) => !used.has(x.post.id));
    const remainingSlots = 15 - section1.length - section2.length;
    const section3 = explore.slice(0, Math.max(0, remainingSlots));
    return {
      collab: section1.map((x) => x.post),
      discuss: section2.map((x) => x.post),
      explore: section3.map((x) => x.post),
    };
  }, [scored, collaboratorIds, validated, mySolutionPosts, items, latestCreatedAt]);
  const fallbackName = (id?: string) =>
    id ? `User-${id.slice(0, 6).toUpperCase()}` : "User";
  const getDisplayName = (p?: Profile, id?: string) =>
    p?.username || fallbackName(id);
  const normalizeFeedback = (value?: string[] | string | null) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).filter(Boolean);
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      return [value];
    }
    return [value];
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
                observations: (payload.observations as string | null) ?? p.observations,
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


  const renderFeedCard = (post: Post) => {
    const p = authors[post.user_id];
    const displayName = getDisplayName(p, post.user_id);
    const approach = post.approach ?? post.explanation;
    const feedbackList = normalizeFeedback(post.feedback_needed);
    const hasMedia = !!post.media_url || !!post.external_link;
    const problemRelation = Array.isArray(post.problems) ? post.problems[0] : post.problems;
    const problemTitle = problemRelation?.title?.trim();
    const preview = (
      post.problem_statement ??
      post.theory ??
      approach ??
      post.observations ??
      post.reflection ??
      ""
    ).trim();
    const advancedCount = items.filter((item) => {
      if (item.user_id !== post.user_id) return false;
      const status = (item.wip_status ?? "idea") as WipStatus;
      return status === "prototype" || status === "testing" || status === "completed" || status === "built";
    }).length;
    const isActiveContributor = advancedCount >= 3;
    const showExpand =
      !!post.problem_statement ||
      !!post.theory ||
      !!approach ||
      !!post.observations ||
      !!post.reflection ||
      hasMedia ||
      feedbackList.length > 0;

    return (
      <article key={post.id} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActivePostId(post.id)}
                className="text-left text-xl font-semibold text-slate-100 transition hover:text-cyan-100"
              >
                {post.title ?? "Untitled Experiment"}
              </button>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  badgeStyles[(post.wip_status ?? "idea") as WipStatus]
                }`}
              >
                {badgeLabels[(post.wip_status ?? "idea") as WipStatus]}
              </span>
              {hasMedia && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                  <Paperclip className="h-3 w-3" />
                  Includes Evidence
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <Link href={`/profile/${post.user_id}`} className="text-cyan-200 hover:underline">
                {displayName}
              </Link>
              {isActiveContributor && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                  Active Contributor
                </span>
              )}
              <span>&middot;</span>
              <span>{post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}</span>
            </div>
          </div>
          {userId === post.user_id && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEdit(post.id)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => requestDeletePost(post.id)}
                className="rounded-full border border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:border-rose-400/60 hover:text-rose-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="mt-6 space-y-4">
          {post.problem_id && post.problems && problemTitle && (
            <Link
              href={`/problems?problemId=${post.problem_id}`}
              className="inline-flex text-xs font-semibold text-amber-200 underline-offset-2 hover:underline"
            >
              Solving: {problemTitle}
            </Link>
          )}
          <p className="text-sm text-slate-300 [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
            {preview || "No preview available."}
          </p>
          {showExpand && (
            <button
              type="button"
              onClick={() => setActivePostId(post.id)}
              className="w-fit rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/10"
            >
              View full record
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => toggleValidate(post.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              validated[post.id]
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : "border-slate-700 bg-slate-950/70 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-100"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Validate
            <span className="ml-1 rounded-full border border-emerald-500/30 px-2 py-[1px] text-[10px]">
              {counts[post.id]?.v ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => openFeedback(post.id)}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Add Insight
          </button>
        </div>
      </article>
    );
  };
  const activePost = useMemo(
    () => items.find((post) => post.id === activePostId) ?? null,
    [items, activePostId]
  );
  return (
    <>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-transparent" />
          Loading lab notes...
        </div>
      ) : (
        <div className="grid gap-5">
          {newAvailable && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <div className="flex items-center justify-between">
                <span>New Research Available</span>
                <button
                  type="button"
                  onClick={() => {
                    setPage(0);
                    setNewAvailable(false);
                  }}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold hover:bg-emerald-500/30"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
          {lastFetchCount !== null && lastFetchCount === 0 && !feedError && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              No experiments yet.
            </div>
          )}
          {sections.collab.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active Collaborations</p>
              {sections.collab.map(renderFeedCard)}
            </div>
          )}
          {sections.discuss.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent Work</p>
              {sections.discuss.map(renderFeedCard)}
            </div>
          )}
          {sections.explore.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Explore Research</p>
              {sections.explore.map(renderFeedCard)}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
              >
                Load More Research
              </button>
            </div>
          )}
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="mt-2 hidden" />
      )}
      <UnifiedDocumentModal
        open={!!activePost}
        post={activePost}
        statusClassName={
          activePost ? badgeStyles[(activePost.wip_status ?? "idea") as WipStatus] : undefined
        }
        onValidate={activePost ? () => toggleValidate(activePost.id) : undefined}
        isValidated={activePost ? !!validated[activePost.id] : false}
        validateCount={activePost ? counts[activePost.id]?.v ?? 0 : undefined}
        onAddInsight={activePost ? () => openFeedback(activePost.id) : undefined}
        onClose={() => setActivePostId(null)}
      />
      {deleteTargetPostId && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          onClick={cancelDeletePost}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
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
