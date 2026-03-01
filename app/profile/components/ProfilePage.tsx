"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import CollabButton from "../../components/CollabButton";
import AboutModal from "../../components/AboutModal";
import AboutSection from "../../components/AboutSection";
import ResearchTimeline from "../../components/ResearchTimeline";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Post as ModelPost, WipStatus } from "../../types/models";

type Profile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | string | null;
};

type Post = ModelPost & {
  description?: string | null;
  is_published?: boolean | null;
  published?: boolean | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const formatSkills = (profile: Profile | null) => {
  if (!profile) return [];
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
  profile?.username?.trim() || profile?.full_name?.trim() || profile?.email?.trim() || "Innovator";

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "IN";
};

const normalizeStatus = (value: string | null | undefined): WipStatus => {
  const statuses: WipStatus[] = [
    "idea",
    "prototype",
    "built",
    "wip",
    "failed",
    "exploring",
    "testing",
    "completed",
  ];
  return statuses.includes((value ?? "").toLowerCase() as WipStatus)
    ? ((value ?? "").toLowerCase() as WipStatus)
    : "idea";
};

type Props = {
  routeProfileId?: string | null;
};

export default function ProfilePage({ routeProfileId = null }: Props) {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiments, setExperiments] = useState<Post[]>([]);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const finalUserId = routeProfileId ?? authUserId;
  const isOwnProfile = !!finalUserId && !!authUserId && finalUserId === authUserId;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUserId(data.session?.user.id ?? null);
      setAuthResolved(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuthUserId(newSession?.user.id ?? null);
      setAuthResolved(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authResolved || !finalUserId) return;
    const fetchProfileAndExperiments = async () => {
      setLoadingProfile(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", finalUserId)
        .maybeSingle();
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", finalUserId)
        .order("created_at", { ascending: false });

      setProfile((profileData as Profile) ?? null);
      const normalized =
        ((postData as Post[] | null) ?? []).map((post) => ({
          ...post,
          wip_status: normalizeStatus(post.wip_status as string | null | undefined),
          description: post.description ?? post.problem_statement ?? null,
        })) ?? [];

      const filtered = isOwnProfile
        ? normalized
        : normalized.filter((post) => {
            if (typeof post.is_published === "boolean") return post.is_published;
            if (typeof post.published === "boolean") return post.published;
            return true;
          });

      setExperiments(filtered);
      console.log("Final userId:", finalUserId);
      console.log("Experiments:", filtered);
      setLoadingProfile(false);
    };
    void fetchProfileAndExperiments();
  }, [finalUserId, authResolved, authUserId, isOwnProfile]);

  const skills = useMemo(() => formatSkills(profile), [profile]);
  const aboutText = profile?.bio?.trim() || "This innovator has not added a bio yet.";

  if (!authResolved || !finalUserId || loadingProfile) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lab
          </button>
        </div>

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
                  <p className="text-2xl font-semibold text-slate-100">{getDisplayName(profile)}</p>
                  <AboutSection aboutText={aboutText} onReadMore={() => setIsAboutModalOpen(true)} />
                  <div className="mt-2 flex flex-wrap gap-2">
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
                      <span className="text-xs text-slate-500">No skills listed yet.</span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Experiments: {experiments.length}</p>
                </div>
              </div>
              {!isOwnProfile && (
                <CollabButton
                  targetProfileId={finalUserId}
                  currentUserId={authUserId}
                  className="px-3 py-1 text-xs"
                />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Work Timeline</h2>
            <div className="mt-4">
              {experiments && experiments.length > 0 ? (
                <ResearchTimeline
                  userId={finalUserId}
                  currentUserId={authUserId}
                  initialPosts={experiments}
                  showAuthor={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center">
                  <p className="text-base font-semibold text-slate-100">
                    {isOwnProfile
                      ? "No experiments published yet."
                      : "This researcher hasn't shared any experiments yet."}
                  </p>
                  <p className="mt-2 max-w-xl text-sm text-slate-400">
                    {isOwnProfile
                      ? "Start documenting your ideas and build your public research profile."
                      : "Check back later for updates."}
                  </p>
                  {isOwnProfile && (
                    <Link
                      href="/"
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/20 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 hover:border-cyan-400/60"
                    >
                      Create First Experiment
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AboutModal open={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} aboutText={aboutText} />
    </div>
  );
}
