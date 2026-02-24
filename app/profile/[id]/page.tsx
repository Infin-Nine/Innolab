"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import CollabButton from "../../components/CollabButton";
import { ArrowLeft, FlaskConical, Loader2, Trash2 } from "lucide-react";

type WipStatus = "Idea" | "Prototyping" | "Testing" | "Failed" | "Succeeded";

type Profile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | string | null;
};

type Post = {
  id: string;
  user_id: string;
  title: string | null;
  problem_statement: string | null;
  wip_status: string;
  created_at: string | null;
};
type PostDetails = {
  theory?: string | null;
  explanation?: string | null;
  media_url?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const badgeStyles: Record<WipStatus, string> = {
  Idea: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
  Prototyping: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  Testing: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  Failed: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  Succeeded: "bg-amber-500/20 text-amber-200 border-amber-500/40",
};

const formatSkills = (profile: Profile | null) => {
  if (!profile) {
    return [];
  }
  if (Array.isArray(profile.skills)) {
    return profile.skills.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof profile.skills === "string") {
    const raw = profile.skills.trim();
    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : Object.values(parsed ?? {});
        return list.map((s) => String(s).trim()).filter(Boolean);
      } catch {
        const cleaned = raw.replace(/[\[\]"']/g, "");
        return cleaned
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    const cleaned = raw.replace(/[\[\]"']/g, "");
    return cleaned
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const getDisplayName = (profile?: Profile | null) =>
  profile?.username || profile?.email || "Innovator";

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "IN";
};

export default function ProfilePage() {
  const params = useParams();
  const profileId = params?.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>(
    {}
  );
  const [details, setDetails] = useState<Record<string, PostDetails>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setCurrentUserId(newSession?.user.id ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);


  useEffect(() => {
    if (!profileId) {
      return;
    }
    const fetchProfile = async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      const { data: postData } = await supabase
        .from("posts")
        .select("id, user_id, title, problem_statement, wip_status, created_at")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      setProfile((profileData as Profile) ?? null);
      setPosts((postData as Post[]) ?? []);
      setLoading(false);
    };
    fetchProfile();
  }, [profileId]);

  const skills = useMemo(() => formatSkills(profile), [profile]);

  const getMediaPath = (url: string | null) => {
    if (!url) return null;
    const marker = "/post-media/";
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.slice(index + marker.length);
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUserId) {
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this post? This action cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    const { data: mediaRow } = await supabase
      .from("posts")
      .select("media_url, user_id")
      .eq("id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    const mediaPath = getMediaPath((mediaRow as { media_url?: string | null } | null)?.media_url ?? null);
    if (mediaPath) {
      await supabase.storage.from("post-media").remove([mediaPath]);
    }
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", currentUserId);
    if (error) {
      window.alert(error.message);
      const { data: postData } = await supabase
        .from("posts")
        .select("id, user_id, title, problem_statement, wip_status, created_at")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      setPosts((postData as Post[]) ?? []);
    }
  };

  const toggleExpand = async (postId: string) => {
    const isOpen = !!expandedPosts[postId];
    if (isOpen) {
      setExpandedPosts((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    if (!details[postId]) {
      const { data } = await supabase
        .from("posts")
        .select("theory, explanation, media_url")
        .eq("id", postId)
        .maybeSingle();
      const row = data as PostDetails | null;
      if (row) {
        setDetails((prev) => ({
          ...prev,
          [postId]: {
            theory: row.theory ?? null,
            explanation: row.explanation ?? null,
            media_url: row.media_url ?? null,
          },
        }));
      } else {
        setDetails((prev) => ({ ...prev, [postId]: {} }));
      }
    }
    setExpandedPosts((prev) => ({ ...prev, [postId]: true }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lab
          </Link>
          {currentUserId === profileId && (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
            >
              Log out
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile...
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={getDisplayName(profile)}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full border border-slate-700/70 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800 text-lg font-semibold text-slate-200">
                      {getInitials(getDisplayName(profile))}
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-semibold text-slate-100">
                      {getDisplayName(profile)}
                    </p>
                    <p className="text-sm text-slate-400 truncate max-w-[60ch]">
                      {profile?.bio || "This innovator has not added a bio yet."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.length ? (
                        skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          No skills listed yet.
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Experiments: {posts.length}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CollabButton
                    targetProfileId={profileId}
                    currentUserId={currentUserId}
                    className="px-3 py-1 text-xs"
                  />
                  {currentUserId === profileId && (
                    <>
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-500/50 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 hover:border-cyan-400/60"
                      >
                        + New Experiment
                      </Link>
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-100"
                      >
                        Edit Profile
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                      >
                        Log out
                      </button>
                    </>
                  )}
                  <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-xs text-slate-300">
                    <FlaskConical className="h-4 w-4 text-emerald-200" />
                    Researcher Profile
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Research Timeline</h2>
              <div className="mt-4 space-y-3">
                {posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center">
                    <p className="text-base font-semibold text-slate-100">
                      {currentUserId === profileId
                        ? "No experiments published yet."
                        : "This researcher hasn’t shared any experiments yet."}
                    </p>
                    <p className="mt-2 max-w-xl text-sm text-slate-400">
                      {currentUserId === profileId
                        ? "Start documenting your ideas and build your public research profile."
                        : "Check back later for updates."}
                    </p>
                    {currentUserId === profileId && (
                      <Link
                        href="/"
                        className="mt-4 inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/20 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 hover:border-cyan-400/60"
                      >
                        Create First Experiment
                      </Link>
                    )}
                  </div>
                ) : (
                  posts.map((post) => {
                    const dateText = post.created_at
                      ? new Date(post.created_at).toLocaleDateString()
                      : "Recently";
                    const desc =
                      (post.problem_statement ?? "").slice(0, 140) +
                      ((post.problem_statement ?? "").length > 140 ? "…" : "");
                    return (
                      <div
                        key={post.id}
                        className="grid grid-cols-[120px_1fr] items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                      >
                        <div className="text-xs text-slate-400">{dateText}</div>
                        <div className="text-sm text-slate-200">
                          <p className="font-semibold text-slate-100">
                            {post.title ?? "Untitled Experiment"}
                          </p>
                          {post.problem_statement && (
                            <p className="mt-1 text-slate-300">{desc}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                badgeStyles[post.wip_status as WipStatus] ??
                                badgeStyles.Idea
                              }`}
                            >
                              {post.wip_status}
                            </span>
                            {currentUserId === post.user_id && (
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleExpand(post.id)}
                              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                            >
                              {expandedPosts[post.id] ? "Show less" : "Read more"}
                            </button>
                          </div>
                          {expandedPosts[post.id] && (
                            <div className="mt-3 space-y-2">
                              {details[post.id]?.theory && (
                                <div>
                                  <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-400">
                                    Theory
                                  </p>
                                  <p className="text-sm text-slate-200">
                                    {details[post.id]?.theory}
                                  </p>
                                </div>
                              )}
                              {details[post.id]?.explanation && (
                                <div>
                                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                                    Explanation
                                  </p>
                                  <p className="text-sm text-slate-200">
                                    {details[post.id]?.explanation}
                                  </p>
                                </div>
                              )}
                              {details[post.id]?.media_url && (
                                <div className="overflow-hidden rounded-2xl border border-slate-800">
                                  <div className="relative aspect-[16/9] max-h-96 w-full">
                                    <Image
                                      src={details[post.id]?.media_url as string}
                                      alt="Lab upload"
                                      className="object-cover"
                                      fill
                                      sizes="(max-width: 768px) 100vw, 768px"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
