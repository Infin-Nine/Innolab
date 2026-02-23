"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import CollabButton from "../../components/CollabButton";
import ResearchTimeline from "../../components/ResearchTimeline";
import { ArrowLeft, FlaskConical, Loader2, Trash2 } from "lucide-react";

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

export default function ProfilePage() {
  const params = useParams();
  const profileId = params?.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
        .select(
          "id, user_id, title, problem_statement, theory, explanation, approach, observations, reflection, feedback_needed, external_link, media_url, wip_status, created_at"
        )
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

  const openRecord = (postId: string) => {
    setActivePostId(postId);
  };

  const closeRecord = () => {
    setActivePostId(null);
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
              <div className="mt-4">
                <ResearchTimeline
                  userId={profileId}
                  currentUserId={currentUserId}
                  initialPosts={posts}
                  showAuthor={true}
                  authorName={getDisplayName(profile)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Timeline modal is handled inside ResearchTimeline */}
    </div>
  );
}
