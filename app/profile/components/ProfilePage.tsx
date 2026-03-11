"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/app/contexts/AuthContext";
import { useLoginModal } from "@/app/contexts/LoginModalContext";
import { supabase } from "@/app/lib/supabaseClient";
import CollabButton from "../../components/CollabButton";
import AboutModal from "../../components/AboutModal";
import AboutSection from "../../components/AboutSection";
import EditProfileForm from "../../components/EditProfileForm";
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
  role?: string | null;
  profile_type?: string | null;
  badges?: string[] | string | null;
  skills?: string[] | string | null;
};

type Post = ModelPost & {
  description?: string | null;
  is_published?: boolean | null;
  published?: boolean | null;
};

const formatSkills = (profile: Profile | null) => {
  if (!profile) return [];
  if (Array.isArray(profile.skills)) {
    return profile.skills.map((skill) => String(skill).trim()).filter(Boolean);
  }
  if (typeof profile.skills === "string") {
    const raw = profile.skills.trim();
    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : Object.values(parsed ?? {});
        return list.map((skill) => String(skill).trim()).filter(Boolean);
      } catch {
        return raw
          .replace(/[\[\]"']/g, "")
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);
      }
    }
    return raw
      .replace(/[\[\]"']/g, "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
};

const getDisplayName = (profile?: Profile | null) =>
  profile?.username?.trim() || profile?.full_name?.trim() || profile?.email?.trim() || "Innovator";

const formatBadges = (profile?: Profile | null) => {
  if (!profile) return [];
  if (Array.isArray(profile.badges)) {
    return profile.badges.map((badge) => String(badge).trim()).filter(Boolean);
  }
  if (typeof profile.badges === "string") {
    const raw = profile.badges.trim();
    if (!raw) return [];
    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : Object.values(parsed ?? {});
        return list.map((badge) => String(badge).trim()).filter(Boolean);
      } catch {
        return raw
          .replace(/[\[\]"']/g, "")
          .split(",")
          .map((badge) => badge.trim())
          .filter(Boolean);
      }
    }
    return raw
      .split(",")
      .map((badge) => badge.trim())
      .filter(Boolean);
  }
  return [];
};

const getRoleLabel = (profile?: Profile | null) => {
  const explicitRole = profile?.role?.trim();
  if (explicitRole) {
    return explicitRole.toLowerCase() === "innovator" ? "Builder" : explicitRole;
  }

  const rawType = String(profile?.profile_type ?? "").trim().toLowerCase();
  if (rawType === "sharer") return "Problem Sharer";
  if (rawType === "innovator") return "Builder";

  const badge = formatBadges(profile)[0];
  if (badge) {
    return badge.trim().toLowerCase() === "innovator" ? "Builder" : badge;
  }

  return null;
};

const getRoleBadgeClassName = (roleLabel: string | null) => {
  const normalized = String(roleLabel ?? "").trim().toLowerCase();
  if (normalized.includes("sharer")) {
    return "rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200";
  }
  if (normalized.includes("innovator") || normalized.includes("builder")) {
    return "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200";
  }
  return "rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200";
};

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
  const { userId: authUserId, loading: authLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiments, setExperiments] = useState<Post[]>([]);
  const [experimentCount, setExperimentCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFormMessage, setProfileFormMessage] = useState<string | null>(null);

  const profileUserId = routeProfileId ?? authUserId;
  const isOwnProfile = !!profileUserId && !!authUserId && profileUserId === authUserId;

  const fetchProfileAndExperiments = useCallback(async (userId: string, viewerUserId: string | null) => {
    setLoadingProfile(true);

    try {
      const [{ data: profileData }, { data: postData }, { data: problemData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("problems").select("id").eq("user_id", userId),
      ]);

      setProfile((profileData as Profile) ?? null);

      const normalized = ((postData as Post[] | null) ?? []).map((post) => ({
        ...post,
        wip_status: normalizeStatus(post.wip_status as string | null | undefined),
        description: post.description ?? post.problem_statement ?? null,
      }));

      const viewingOwnProfile = !!viewerUserId && userId === viewerUserId;
      const filtered = viewingOwnProfile
        ? normalized
        : normalized.filter((post) => {
            if (typeof post.is_published === "boolean") return post.is_published;
            if (typeof post.published === "boolean") return post.published;
            return true;
          });

      setExperiments(filtered);
      setExperimentCount(filtered.length);
      setProblemCount(((problemData as { id: string }[] | null) ?? []).length);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!profileUserId) {
      setProfile(null);
      setExperiments([]);
      setExperimentCount(0);
      setProblemCount(0);
      setLoadingProfile(false);
      return;
    }

    void fetchProfileAndExperiments(profileUserId, authUserId);
  }, [authLoading, authUserId, profileUserId, fetchProfileAndExperiments]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleExperimentCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string }>;
      const createdByUserId = customEvent.detail?.userId ?? null;
      if (!profileUserId) return;
      if (createdByUserId && createdByUserId !== profileUserId) return;
      void fetchProfileAndExperiments(profileUserId, authUserId);
    };

    window.addEventListener("experiment:created", handleExperimentCreated as EventListener);
    return () => {
      window.removeEventListener("experiment:created", handleExperimentCreated as EventListener);
    };
  }, [profileUserId, authUserId, fetchProfileAndExperiments]);

  const skills = useMemo(() => formatSkills(profile), [profile]);
  const aboutText = profile?.bio?.trim() || "This innovator has not added a bio yet.";
  const roleLabel = getRoleLabel(profile);
  const roleBadgeClassName = getRoleBadgeClassName(roleLabel);
  const normalizedProfileType = String(profile?.profile_type ?? "").trim().toLowerCase();
  const isBuilderAccount =
    normalizedProfileType === "innovator" ||
    String(roleLabel ?? "").trim().toLowerCase().includes("builder");
  const isProblemSharerAccount =
    normalizedProfileType === "sharer" ||
    String(roleLabel ?? "").trim().toLowerCase().includes("sharer");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveProfile = async (values: {
    profileType: "innovator" | "sharer";
    displayName: string;
    about: string;
    areasOfWork: string;
  }) => {
    if (!profileUserId || !authUserId || profileUserId !== authUserId) return;

    setSavingProfile(true);
    setProfileFormMessage(null);
    try {
      const nextUsername = values.displayName.trim();
      if (!nextUsername) {
        setProfileFormMessage("Display name is required.");
        return;
      }

      const nextSkills = values.areasOfWork
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const nextBadges = [values.profileType === "innovator" ? "Builder" : "Problem Sharer"];

      let { error } = await supabase
        .from("profiles")
        .update({
          username: nextUsername,
          bio: values.about.trim() || null,
          skills: nextSkills,
          badges: nextBadges,
          profile_type: values.profileType,
        })
        .eq("id", profileUserId);

      if (error?.message?.includes("profile_type")) {
        ({ error } = await supabase
          .from("profiles")
          .update({
            username: nextUsername,
            bio: values.about.trim() || null,
            skills: nextSkills,
            badges: nextBadges,
          })
          .eq("id", profileUserId));
      }

      if (error) {
        setProfileFormMessage(error.message || "Failed to save profile.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: nextUsername,
              bio: values.about.trim() || null,
              profile_type: values.profileType,
              skills: nextSkills,
              badges: nextBadges,
            }
          : {
              id: profileUserId,
              username: nextUsername,
              bio: values.about.trim() || null,
              profile_type: values.profileType,
              skills: nextSkills,
              badges: nextBadges,
            }
      );
      setIsEditModalOpen(false);
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <DashboardLayout activeItem="profile">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profileUserId) {
    return (
      <DashboardLayout activeItem="profile">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Profile</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-100 sm:text-3xl">Join to manage your profile</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Sign in or create an account to build solutions, share problems, and manage your work timeline.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openLoginModal(undefined, "login")}
              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => openLoginModal(undefined, "signup")}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Sign Up
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout activeItem="profile">
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Profile not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeItem="profile">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold text-slate-100">{getDisplayName(profile)}</p>
                    {roleLabel ? <span className={roleBadgeClassName}>{roleLabel}</span> : null}
                  </div>
                  <AboutSection aboutText={aboutText} onReadMore={() => setIsAboutModalOpen(true)} />
                  {isBuilderAccount ? (
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
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <p>Solutions: {experimentCount}</p>
                    <p>Problems: {problemCount}</p>
                  </div>
                </div>
              </div>
              {!isOwnProfile ? (
                <CollabButton
                  targetProfileId={profileUserId}
                  currentUserId={authUserId}
                  className="px-3 py-1 text-xs"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {isBuilderAccount ? (
                    <button
                      type="button"
                      onClick={() => router.push("/create")}
                      className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                    >
                      Build Solution
                    </button>
                  ) : null}
                  {isProblemSharerAccount ? (
                    <button
                      type="button"
                      onClick={() => router.push("/problems")}
                      className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                    >
                      Share Problem
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Work Timeline</h2>
            <div className="mt-4">
              <ResearchTimeline
                userId={profileUserId}
                currentUserId={authUserId}
                initialPosts={experiments}
                showAuthor={false}
              />
            </div>
          </div>
        </div>
      </div>
      <AboutModal open={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} aboutText={aboutText} />
      {isEditModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <EditProfileForm
            initialValues={{
              profileType: normalizedProfileType === "innovator" ? "innovator" : "sharer",
              displayName: profile?.username ?? "",
              about: profile?.bio ?? "",
              areasOfWork: skills.join(", "),
            }}
            onClose={() => {
              if (!savingProfile) {
                setProfileFormMessage(null);
                setIsEditModalOpen(false);
              }
            }}
            onCancel={() => {
              if (!savingProfile) {
                setProfileFormMessage(null);
                setIsEditModalOpen(false);
              }
            }}
            onSave={(values) => void handleSaveProfile(values)}
            saving={savingProfile}
            message={profileFormMessage}
          />
        </div>
      ) : null}
    </DashboardLayout>
  );
}
