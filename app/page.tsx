"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import ResearchTimeline from "./components/ResearchTimeline";
import CreatePost from "./components/CreatePost";
import LabNotebook from "./components/LabNotebook";
import AboutModal from "./components/AboutModal";
import AboutSection from "./components/AboutSection";
import EditProfileModal from "./components/EditProfileForm";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import { supabase } from "./lib/supabaseClient";
import type { Post } from "./types/models";
import {
  ImageUp,
  MoreHorizontal,
  PencilLine,
} from "lucide-react";
import { useLoginModal } from "./contexts/LoginModalContext";
import { useAuth } from "./contexts/AuthContext";

type Profile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | string | null;
  badges?: string[] | string | null;
  profile_type?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"feed" | "profile">("feed");
  const { session, userId } = useAuth();
  const { openLoginModal } = useLoginModal();
  const profileUserId = userId ?? session?.user?.id ?? null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [, setProfileLoading] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSkills, setProfileSkills] = useState("");
  const [profileType, setProfileType] = useState<"innovator" | "sharer">("innovator");
  const [experimentCount, setExperimentCount] = useState(0);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const envMissing = !supabaseUrl || !supabaseAnonKey;

  const userPosts = useMemo(
    () => posts.filter((post) => post.user_id === profileUserId),
    [posts, profileUserId]
  );

  const handlePostsLoaded = useCallback((loadedPosts: Post[]) => {
    setPosts(loadedPosts);
  }, []);

  const handlePostCreated = () => {
    setPostsRefreshKey((prev) => prev + 1);
    if (profileUserId) {
      void fetchExperimentCount(profileUserId);
    }
    setIsPostModalOpen(false);
    setIsFabMenuOpen(false);
  };

  const fetchExperimentCount = useCallback(async (profileUserId: string) => {
    const { count, error } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profileUserId);
    if (error) {
      console.error("Failed to fetch experiment count:", error.message);
      setExperimentCount(0);
      return;
    }
    setExperimentCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (!profileUserId) {
      return;
    }
    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileUserId)
        .maybeSingle();
      if (!error && data) {
        const nextProfile = data as Profile;
        setProfileData(nextProfile);
        setProfileUsername(nextProfile.username ?? "");
        setProfileBio(nextProfile.bio ?? "");
        const typeFromData = String(nextProfile.profile_type ?? "").toLowerCase();
        if (typeFromData === "sharer" || typeFromData === "problem_sharer") {
          setProfileType("sharer");
        } else if (typeFromData === "innovator" || typeFromData === "builder") {
          setProfileType("innovator");
        } else {
          const parsedBadges = Array.isArray(nextProfile.badges)
            ? nextProfile.badges.map((b) => String(b).toLowerCase())
            : String(nextProfile.badges ?? "")
                .toLowerCase()
                .split(",")
                .map((b) => b.trim());
          if (parsedBadges.some((badge) => badge.includes("sharer"))) setProfileType("sharer");
          if (parsedBadges.some((badge) => badge.includes("innovator") || badge.includes("builder"))) {
            setProfileType("innovator");
          }
        }
        if (Array.isArray(nextProfile.skills)) {
          setProfileSkills(nextProfile.skills.join(", "));
        } else {
          setProfileSkills(nextProfile.skills ?? "");
        }
      }
      setProfileLoading(false);
    };
    fetchProfile();
    void fetchExperimentCount(profileUserId);
  }, [profileUserId, fetchExperimentCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onExperimentCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string }>;
      const createdByUserId = customEvent.detail?.userId ?? null;
      if (!profileUserId) return;
      if (createdByUserId && createdByUserId !== profileUserId) return;
      void fetchExperimentCount(profileUserId);
    };
    window.addEventListener("experiment:created", onExperimentCreated as EventListener);
    return () => window.removeEventListener("experiment:created", onExperimentCreated as EventListener);
  }, [profileUserId, fetchExperimentCount]);

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

  const handleEditProfileSave = async (values?: {
    profileType: "innovator" | "sharer";
    displayName: string;
    about: string;
    areasOfWork: string;
  }) => {
    if (!userId) {
      openLoginModal(() => void handleEditProfileSave(values));
      return;
    }
    const nextDisplayName = (values?.displayName ?? profileUsername).trim();
    const nextAbout = (values?.about ?? profileBio).trim();
    const nextAreas = values?.areasOfWork ?? profileSkills;
    const nextProfileType = values?.profileType ?? profileType;
    const badges = nextProfileType === "sharer" ? ["Problem Sharer"] : ["Innovator"];

    const skills = (nextProfileType === "sharer" ? "" : nextAreas)
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: nextDisplayName,
        bio: nextAbout,
        skills,
        badges,
      })
      .eq("id", userId);
    if (error) {
      console.error("Failed to update profile:", error.message);
      return;
    }
    setProfileData((prev) => ({
      ...(prev ?? { id: userId }),
      username: nextDisplayName,
      bio: nextAbout,
      skills,
      badges,
    }));
    setProfileType(nextProfileType);
    setProfileUsername(nextDisplayName);
    setProfileBio(nextAbout);
    setProfileSkills(nextAreas);
    setIsEditProfileOpen(false);
  };

  const formatSkills = (profile: Profile) => {
    if (Array.isArray(profile.skills)) {
      return profile.skills.map((s) => String(s).trim()).filter(Boolean);
    }
    if (typeof profile.skills === "string") {
      const raw = profile.skills.trim();
      if (raw.startsWith("[") || raw.startsWith("{")) {
        try {
          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed)
            ? parsed
            : Object.values(parsed ?? {});
          return list.map((s) => String(s).trim()).filter(Boolean);
        } catch {
          const cleaned = raw.replace(/[\[\]"']/g, "");
          return cleaned
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        }
      }
      const cleaned = raw.replace(/[\[\]"']/g, "");
      return cleaned
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [];
  };

  const formatBadges = (profile?: Profile | null) => {
    if (!profile) return [];
    if (Array.isArray(profile.badges)) {
      return profile.badges.map((b) => String(b).trim()).filter(Boolean);
    }
    if (typeof profile.badges === "string") {
      const raw = profile.badges.trim();
      if (!raw) return [];
      if (raw.startsWith("[") || raw.startsWith("{")) {
        try {
          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed) ? parsed : Object.values(parsed ?? {});
          return list.map((b) => String(b).trim()).filter(Boolean);
        } catch {
          const cleaned = raw.replace(/[\[\]"']/g, "");
          return cleaned
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        }
      }
      return raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [];
  };

  const resolveProfileType = (profile?: Profile | null): "innovator" | "sharer" => {
    const rawType = String(profile?.profile_type ?? "").trim().toLowerCase();
    if (rawType === "sharer" || rawType === "problem_sharer") return "sharer";
    if (rawType === "innovator" || rawType === "builder") return "innovator";
    const badges = formatBadges(profile).map((badge) => badge.toLowerCase());
    if (badges.some((badge) => badge.includes("sharer"))) return "sharer";
    if (badges.some((badge) => badge.includes("innovator") || badge.includes("builder"))) return "innovator";
    return profileType;
  };

  const getDisplayName = (profile?: Profile | null) =>
    profile?.username?.trim() ||
    profile?.full_name?.trim() ||
    "Unnamed Innovator";

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
    return initials.join("") || "IN";
  };

  const aboutText = profileData?.bio?.trim() || "Work description not added yet.";
  const resolvedProfileType = resolveProfileType(profileData);
  const visibleSkills = profileData && resolvedProfileType === "innovator" ? formatSkills(profileData) : [];
  const openNewExperimentModal = () => {
    if (!userId) {
      openLoginModal(() => {
        setIsFabMenuOpen(false);
        setIsPostModalOpen(true);
      });
      return;
    }
    setIsFabMenuOpen(false);
    setIsPostModalOpen(true);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-owner-menu]")) return;
      setIsMobileProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "required") {
      const mode = params.get("mode");
      openLoginModal(undefined, mode === "signup" ? "signup" : "login");
    }
  }, [openLoginModal]);

  const renderFeedSection = (compact: boolean) => (
    <section className="space-y-4 md:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">The Lab</p>
          <h2 className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}>
            Document Your Work With Clear Evidence
          </h2>
        </div>
        <button
          type="button"
          onClick={openNewExperimentModal}
          className={`flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 font-semibold text-cyan-100 transition hover:bg-cyan-500/20 ${
            compact ? "min-h-11 px-4 text-xs" : "px-4 py-2 text-sm"
          }`}
        >
          <ImageUp className="h-4 w-4" />
          New Experiment
        </button>
      </header>
      <LabNotebook refreshKey={postsRefreshKey} onPostsLoaded={handlePostsLoaded} compact={compact} />
    </section>
  );

  const renderProfileSection = (compact: boolean) => (
    <section className="space-y-4 md:space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Profile</p>
        <h2 className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}>
          Your public profile and work history.
        </h2>
      </header>
      {!session ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
          <p>Sign in to view your trust ledger.</p>
          <div className={`mt-4 flex gap-3 ${compact ? "flex-col" : "flex-row"}`}>
            <Link
              href="/login"
              className={`inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 hover:border-cyan-400/60 ${
                compact ? "w-full min-h-11" : ""
              }`}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className={`inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 ${
                compact ? "w-full min-h-11" : ""
              }`}
            >
              Sign Up
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div
            className={
              compact
                ? "border-b border-white/10 px-4 py-4"
                : "rounded-3xl border border-slate-800 bg-slate-900/60 p-4 md:p-6"
            }
          >
            <div className={`flex ${compact ? "flex-col" : "flex-wrap"} items-start justify-between gap-4`}>
              <div className={compact ? "flex items-start gap-3" : "flex items-center gap-4"}>
                {profileData?.avatar_url ? (
                  <Image
                    src={profileData.avatar_url}
                    alt={getDisplayName(profileData)}
                    width={72}
                    height={72}
                    className="h-16 w-16 rounded-full border border-slate-700/70 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800 text-base font-semibold text-slate-200">
                    {getInitials(getDisplayName(profileData) || session.user.email || "Innovator")}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={compact ? "text-lg font-semibold text-slate-100" : "text-xl font-semibold text-slate-100"}>
                      {getDisplayName(profileData)}
                    </p>
                    {resolvedProfileType === "sharer" ? (
                      <span className="rounded-full border border-blue-800 bg-blue-900/50 px-2 py-1 text-xs text-blue-400">
                        Problem Sharer
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-800 bg-emerald-900/50 px-2 py-1 text-xs text-emerald-400">
                        Innovator
                      </span>
                    )}
                  </div>
                  <AboutSection aboutText={aboutText} onReadMore={() => setIsAboutModalOpen(true)} />
                  {resolvedProfileType === "innovator" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visibleSkills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-slate-500">
                    <p>
                      Experiments: {experimentCount}
                      {" | "}Joined:{" "}
                      {session.user.created_at ? new Date(session.user.created_at).getFullYear() : "—"}
                    </p>
                    {experimentCount === 0 && <p className="mt-1">Start your first experiment</p>}
                  </div>
                </div>
              </div>
              <div className={`flex ${compact ? "w-full flex-wrap items-center" : "items-center"} gap-3`}>
                <button
                  type="button"
                  onClick={openNewExperimentModal}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border border-cyan-500/50 bg-cyan-500/20 font-semibold text-cyan-100 transition hover:bg-cyan-500/30 hover:border-cyan-400/60 ${
                    compact ? "h-11 px-4 text-xs" : "px-5 py-2 text-sm"
                  }`}
                >
                  + New Experiment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProfileOpen(true);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-100 ${
                    compact ? "h-11 px-4 text-xs" : "px-4 py-2 text-xs"
                  }`}
                >
                  <PencilLine className="h-4 w-4" />
                  Edit Profile
                </button>
                {compact ? (
                  <div className="relative ml-auto" data-owner-menu>
                    <button
                      type="button"
                      onClick={() => setIsMobileProfileMenuOpen((prev) => !prev)}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-3 text-slate-200 transition hover:border-slate-500 hover:text-slate-100"
                      aria-label="Open profile actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isMobileProfileMenuOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-36 rounded-2xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileProfileMenuOpen(false);
                            handleSignOutRequest();
                          }}
                          className="flex h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
                        >
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignOutRequest}
                    className="flex items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Log out
                  </button>
                )}
              </div>
            </div>
            <div className={compact ? "mt-4" : "mt-6 border-t border-slate-800 pt-4"} />
          </div>
          <div className={compact ? "mt-6 border-t border-white/10 pt-6" : "rounded-3xl border border-slate-800 bg-slate-900/60 p-4 md:p-6"}>
            <h2 className="text-lg font-semibold">Work Timeline</h2>
            <div className={compact ? "mt-3" : "mt-4"}>
              <ResearchTimeline
                userId={profileUserId ?? ""}
                currentUserId={profileUserId}
                initialPosts={userPosts.length > 0 ? userPosts : undefined}
                showAuthor={false}
                compact={compact}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
  const desktopMainContent = (
    <>
      {envMissing && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live data.
        </div>
      )}
      {activeTab === "feed" ? renderFeedSection(false) : renderProfileSection(false)}
    </>
  );

  const mobileMainContent = (
    <>
      {envMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live data.
        </div>
      )}
      {activeTab === "feed" ? renderFeedSection(true) : renderProfileSection(true)}
    </>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <ResponsiveLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasSession={!!session}
        onOpenAuthConsole={() => setActiveTab("feed")}
        fabMenuOpen={isFabMenuOpen}
        onFabOpen={() => setIsFabMenuOpen(true)}
        onFabClose={() => setIsFabMenuOpen(false)}
        desktopChildren={desktopMainContent}
        mobileChildren={mobileMainContent}
      />
      <CreatePost
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <EditProfileModal
            initialValues={{
              profileType,
              displayName: profileUsername,
              about: profileBio,
              areasOfWork: profileSkills,
            }}
            onClose={() => setIsEditProfileOpen(false)}
            onCancel={() => setIsEditProfileOpen(false)}
            onSave={(values) => void handleEditProfileSave(values)}
          />
        </div>
      )}
      <AboutModal
        open={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        aboutText={aboutText}
      />
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
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




