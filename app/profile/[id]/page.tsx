"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import CollabButton from "../../components/CollabButton";
import UnifiedDocumentModal from "../../components/UnifiedDocumentModal";
import { useFeedbackSheet } from "../../contexts/FeedbackSheetContext";
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
  research_interest?: string | null;
};

type Post = {
  id: string;
  user_id: string;
  title: string | null;
  description?: string | null;
  problem_statement: string | null;
  theory?: string | null;
  explanation?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  feedback_needed?: string[] | string | null;
  external_link?: string | null;
  media_url?: string | null;
  wip_status: string;
  created_at: string | null;
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
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeValidateCount, setActiveValidateCount] = useState(0);
  const [activeIsValidated, setActiveIsValidated] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { open: openFeedback } = useFeedbackSheet();

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
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      setProfile((profileData as Profile) ?? null);
      const normalizedPosts =
        ((postData as Post[] | null) ?? []).map((post) => ({
          ...post,
          description: post.description ?? post.problem_statement ?? null,
        }));
      setPosts(normalizedPosts);
      setLoading(false);
    };
    fetchProfile();
  }, [profileId]);

  const skills = useMemo(() => formatSkills(profile), [profile]);

  const openPostModal = (postId: string) => {
    setActivePostId(postId);
    // Reuse the unified document modal behavior
  };

  const closePostModal = () => {
    setActivePostId(null);
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

  const handleSignOutRequest = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleSignOutCancel = () => {
    if (isLoggingOut) return;
    setIsLogoutConfirmOpen(false);
  };

  const handleSignOutConfirm = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Failed to delete post:", error.message);
      return;
    }

    setPosts((prev) => prev.filter((post) => post.id !== postId));
    if (activePostId === postId) {
      setActivePostId(null);
    }
  };

  const activePost = posts.find((post) => post.id === activePostId) ?? null;

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
              onClick={handleSignOutRequest}
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
                    {profile?.research_interest && (
                      <div className="mt-3 max-w-[60ch]">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                          Primary Focus Area
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 break-words">
                            {profile.research_interest}
                          </span>
                        </div>
                      </div>
                    )}
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
                        onClick={handleSignOutRequest}
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
              <h2 className="text-lg font-semibold">Work Timeline</h2>
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
                        onClick={() => {
                          void openPostModal(post.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void openPostModal(post.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
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
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDeletePost(post.id);
                                }}
                                className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            )}
                          </div>
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
      <UnifiedDocumentModal
        open={!!activePostId && !!activePost}
        post={activePost}
        statusClassName={
          activePost ? badgeStyles[activePost.wip_status as WipStatus] ?? badgeStyles.Idea : undefined
        }
        onValidate={activePost ? handleToggleValidate : undefined}
        isValidated={activeIsValidated}
        validateCount={activePost ? activeValidateCount : undefined}
        onAddInsight={activePost ? () => openFeedback(activePost.id) : undefined}
        onClose={closePostModal}
      />
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100">Log out?</h3>
            <p className="mt-3 text-sm text-slate-300">
              You will be signed out of your account on this device.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSignOutCancel}
                disabled={isLoggingOut}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSignOutConfirm()}
                disabled={isLoggingOut}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

