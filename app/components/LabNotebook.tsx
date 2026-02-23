"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
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

type Profile = {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  id?: string;
  email?: string | null;
};

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
  wip_status: WipStatus | null;
  media_url: string | null;
  created_at: string | null;
  profiles?: Profile | Profile[] | null;
  validations?: { count: number }[];
  solutions?: { count: number }[];
};

type Props = {
  refreshKey?: number;
  onPostsLoaded?: (posts: Post[]) => void;
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

export default function LabNotebook({ refreshKey = 0, onPostsLoaded }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, { v: number; s: number }>>({});
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const { openEdit } = useEdit();
  const { open: openFeedback } = useFeedbackSheet();
  const [mySolutionPosts, setMySolutionPosts] = useState<Record<string, boolean>>({});
  const [collaboratorIds, setCollaboratorIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [newAvailable, setNewAvailable] = useState(false);
  const [latestCreatedAt, setLatestCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
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
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchPosts = async () => {
      setLoading(true);
      const from = page * 15;
      const to = from + 15 - 1;
      let rows: Post[] = [];
      const baseSelect =
        "id, user_id, title, problem_statement, theory, explanation, approach, observations, reflection, feedback_needed, external_link, media_url, wip_status, created_at, validations(count), solutions(count)";
      const res = await supabase
        .from("posts")
        .select(baseSelect)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (!res.error) {
        rows = ((res.data as Post[]) ?? []);
      }
      if (!mounted) return;
      const cc: Record<string, { v: number; s: number }> = {};
      rows.forEach((r) => {
        const v = r.validations?.[0]?.count ?? 0;
        const s = r.solutions?.[0]?.count ?? 0;
        cc[r.id] = { v, s };
      });
      setCounts((prev) => (page === 0 ? cc : { ...prev, ...cc }));
      setPosts((prev) => (page === 0 ? rows : [...prev, ...rows]));
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
          map[p.id] = p as Profile;
        });
        setAuthors((prev) => ({ ...prev, ...map }));
      }
      onPostsLoaded?.(page === 0 ? rows : [...(posts ?? []), ...rows]);
      setLoading(false);
    };
    fetchPosts();
    return () => {
      mounted = false;
    };
  }, [refreshKey, onPostsLoaded, page]);

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
  const getExcerpt = (value: string, limit: number) =>
    value.length > limit ? `${value.slice(0, limit)}…` : value;
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
          {items.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              No experiments yet.
            </div>
          )}
          {sections.collab.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active Collaborations</p>
              {sections.collab.map((post) => {
                const p = authors[post.user_id];
                const displayName = getDisplayName(p, post.user_id);
                const expanded = expandedPosts[post.id] ?? false;
                const limit = 220;
                const approach = post.approach ?? post.explanation;
                const feedbackList = normalizeFeedback(post.feedback_needed);
                const hasLong =
                  (post.problem_statement?.length ?? 0) > limit ||
                  (post.theory?.length ?? 0) > limit;
                const hasExtraSections =
                  !!approach ||
                  !!post.observations ||
                  !!post.reflection ||
                  !!post.media_url ||
                  !!post.external_link ||
                  feedbackList.length > 0;
                const showExpand = hasLong || hasExtraSections;
                return (
                  <article key={post.id} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-slate-100">
                            {post.title ?? "Untitled Experiment"}
                          </h3>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              badgeStyles[(post.wip_status ?? "idea") as WipStatus]
                            }`}
                          >
                            {badgeLabels[(post.wip_status ?? "idea") as WipStatus]}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <Link href={`/profile/${post.user_id}`} className="text-cyan-200 hover:underline">
                            {displayName}
                          </Link>
                          <span>•</span>
                          <span>
                            {post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}
                          </span>
                        </div>
                      </div>
                      {userId === post.user_id && (
                        <button
                          type="button"
                          onClick={() => openEdit(post.id)}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="mt-6 space-y-5">
                      {post.problem_statement && (
                        <section className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            What is being explored
                          </p>
                          <p className="text-sm text-slate-200">
                            {expanded ? post.problem_statement : getExcerpt(post.problem_statement, limit)}
                          </p>
                        </section>
                      )}
                      {post.theory && (
                        <section className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Core Idea</p>
                          <p className="text-sm text-slate-200">
                            {expanded ? post.theory : getExcerpt(post.theory, limit)}
                          </p>
                        </section>
                      )}
                      {expanded && (
                        <>
                          {approach && (
                            <section className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Approach</p>
                              <p className="text-sm text-slate-200">{approach}</p>
                            </section>
                          )}
                          {post.observations && (
                            <section className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Observations</p>
                              <p className="text-sm text-slate-200">{post.observations}</p>
                            </section>
                          )}
                          {post.reflection && (
                            <section className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Reflection</p>
                              <p className="text-sm text-slate-200">{post.reflection}</p>
                            </section>
                          )}
                          {(post.media_url || post.external_link) && (
                            <section className="space-y-3">
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Evidence</p>
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
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Feedback Requested</p>
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
                        </>
                      )}
                      {showExpand && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPosts((prev) => ({
                              ...prev,
                              [post.id]: !expanded,
                            }))
                          }
                          className="w-fit rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/10"
                        >
                          {expanded ? "Collapse record" : "View full record"}
                        </button>
                      )}
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
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
                    {expanded && (
                      <div className="mt-6 border-t border-slate-800 pt-6">
                        <PostComments postId={post.id} postOwnerId={post.user_id} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {sections.discuss.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ongoing Discussions</p>
              {sections.discuss.map((post) => {
                const p = authors[post.user_id];
                const displayName = getDisplayName(p, post.user_id);
                const expanded = expandedPosts[post.id] ?? false;
                const limit = 220;
                const approach = post.approach ?? post.explanation;
                const feedbackList = normalizeFeedback(post.feedback_needed);
                const hasLong =
                  (post.problem_statement?.length ?? 0) > limit ||
                  (post.theory?.length ?? 0) > limit;
                const hasExtraSections =
                  !!approach ||
                  !!post.observations ||
                  !!post.reflection ||
                  !!post.media_url ||
                  !!post.external_link ||
                  feedbackList.length > 0;
                const showExpand = hasLong || hasExtraSections;
                return (
                  <article
                    key={post.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-slate-100">
                            {post.title ?? "Untitled Experiment"}
                          </h3>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              badgeStyles[(post.wip_status ?? "idea") as WipStatus]
                            }`}
                          >
                            {badgeLabels[(post.wip_status ?? "idea") as WipStatus]}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <Link
                            href={`/profile/${post.user_id}`}
                            className="text-cyan-200 hover:underline"
                          >
                            {displayName}
                          </Link>
                          <span>•</span>
                          <span>
                            {post.created_at
                              ? new Date(post.created_at).toLocaleString()
                              : "Recently"}
                          </span>
                        </div>
                      </div>
                      {userId === post.user_id && (
                        <button
                          type="button"
                          onClick={() => openEdit(post.id)}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="mt-6 space-y-5">
                      {post.problem_statement && (
                        <section className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            What is being explored
                          </p>
                          <p className="text-sm text-slate-200">
                            {expanded
                              ? post.problem_statement
                              : getExcerpt(post.problem_statement, limit)}
                          </p>
                        </section>
                      )}
                      {post.theory && (
                        <section className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">
                            Core Idea
                          </p>
                          <p className="text-sm text-slate-200">
                            {expanded ? post.theory : getExcerpt(post.theory, limit)}
                          </p>
                        </section>
                      )}
                      {expanded && (
                        <>
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
                              <p className="text-sm text-slate-200">{post.reflection}</p>
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
                        </>
                      )}
                      {showExpand && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPosts((prev) => ({
                              ...prev,
                              [post.id]: !expanded,
                            }))
                          }
                          className="w-fit rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/10"
                        >
                          {expanded ? "Collapse record" : "View full record"}
                        </button>
                      )}
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
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
                    {expanded && (
                      <div className="mt-6 border-t border-slate-800 pt-6">
                        <PostComments postId={post.id} postOwnerId={post.user_id} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {sections.explore.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Explore Research</p>
              {sections.explore.map((post) => {
            const p = authors[post.user_id];
            const displayName = getDisplayName(p, post.user_id);
            const expanded = expandedPosts[post.id] ?? false;
            const limit = 220;
            const approach = post.approach ?? post.explanation;
            const feedbackList = normalizeFeedback(post.feedback_needed);
            const hasLong =
              (post.problem_statement?.length ?? 0) > limit ||
              (post.theory?.length ?? 0) > limit;
            const hasExtraSections =
              !!approach ||
              !!post.observations ||
              !!post.reflection ||
              !!post.media_url ||
              !!post.external_link ||
              feedbackList.length > 0;
            const showExpand = hasLong || hasExtraSections;
            return (
              <article
                key={post.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-100">
                        {post.title ?? "Untitled Experiment"}
                      </h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          badgeStyles[(post.wip_status ?? "idea") as WipStatus]
                        }`}
                      >
                        {badgeLabels[(post.wip_status ?? "idea") as WipStatus]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <Link
                        href={`/profile/${post.user_id}`}
                        className="text-cyan-200 hover:underline"
                      >
                        {displayName}
                      </Link>
                      <span>•</span>
                      <span>
                        {post.created_at
                          ? new Date(post.created_at).toLocaleString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>
                  {userId === post.user_id && (
                    <button
                      type="button"
                      onClick={() => openEdit(post.id)}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="mt-6 space-y-5">
                  {post.problem_statement && (
                    <section className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        What is being explored
                      </p>
                      <p className="text-sm text-slate-200">
                        {expanded
                          ? post.problem_statement
                          : getExcerpt(post.problem_statement, limit)}
                      </p>
                    </section>
                  )}
                  {post.theory && (
                    <section className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">
                        Core Idea
                      </p>
                      <p className="text-sm text-slate-200">
                        {expanded ? post.theory : getExcerpt(post.theory, limit)}
                      </p>
                    </section>
                  )}
                  {expanded && (
                    <>
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
                          <p className="text-sm text-slate-200">{post.reflection}</p>
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
                    </>
                  )}
                  {showExpand && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPosts((prev) => ({
                          ...prev,
                          [post.id]: !expanded,
                        }))
                      }
                      className="w-fit rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/10"
                    >
                      {expanded ? "Collapse record" : "View full record"}
                    </button>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => toggleValidate(post.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${validated[post.id]
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
                {expanded && (
                  <div className="mt-6 border-t border-slate-800 pt-6">
                    <PostComments postId={post.id} postOwnerId={post.user_id} />
                  </div>
                )}
              </article>
              );
              })}
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
      
    </>
  );
}
