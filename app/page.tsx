"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import ResearchTimeline from "./components/ResearchTimeline";
import CreatePost from "./components/CreatePost";
import LabNotebook from "./components/LabNotebook";
import AboutModal from "./components/AboutModal";
import AboutSection from "./components/AboutSection";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import { supabase } from "./lib/supabaseClient";
import type { Post } from "./types/models";
import {
  ImageUp,
  MoreHorizontal,
  PencilLine,
  X,
} from "lucide-react";
import { useLoginModal } from "./contexts/LoginModalContext";

type Profile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | string | null;
  badges?: string[] | string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"feed" | "profile">("feed");
  const [session, setSession] = useState<Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"]>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { openLoginModal } = useLoginModal();

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
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSkills, setProfileSkills] = useState("");
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const envMissing = !supabaseUrl || !supabaseAnonKey;

  const userPosts = useMemo(
    () => posts.filter((post) => post.user_id === userId),
    [posts, userId]
  );


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUserId(data.session?.user.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUserId(newSession?.user.id ?? null);
      if (!newSession) {
        setProfileData(null);
        setProfileUsername("");
        setProfileBio("");
        setProfileSkills("");
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handlePostsLoaded = useCallback((loadedPosts: Post[]) => {
    setPosts(loadedPosts);
  }, []);

  const handlePostCreated = () => {
    setPostsRefreshKey((prev) => prev + 1);
    setIsPostModalOpen(false);
    setIsFabMenuOpen(false);
  };
  useEffect(() => {
    if (!userId) {
      return;
    }
    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (!error && data) {
        setProfileData(data as Profile);
        setProfileUsername(data.username ?? "");
        setProfileBio(data.bio ?? "");
        if (Array.isArray(data.skills)) {
          setProfileSkills(data.skills.join(", "));
        } else {
          setProfileSkills(data.skills ?? "");
        }
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [userId]);

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

  const handleEditProfileSave = async () => {
    if (!userId) {
      openLoginModal(() => void handleEditProfileSave());
      return;
    }
    setProfileMessage(null);
    const skills = profileSkills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: profileUsername.trim(),
        bio: profileBio.trim(),
        skills,
      })
      .eq("id", userId);
    if (error) {
      setProfileMessage(error.message);
      return;
    }
    setProfileData((prev) => ({
      ...(prev ?? { id: userId }),
      username: profileUsername.trim(),
      bio: profileBio.trim(),
      skills,
    }));
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
  const openNewExperimentModal = () => {
    if (!userId) {
      openLoginModal(() => openNewExperimentModal());
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
      openLoginModal();
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
          Sign in to view your trust ledger.
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
                  <p className={compact ? "text-lg font-semibold text-slate-100" : "text-xl font-semibold text-slate-100"}>
                    {getDisplayName(profileData)}
                  </p>
                  <AboutSection aboutText={aboutText} onReadMore={() => setIsAboutModalOpen(true)} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileData && formatSkills(profileData).length ? (
                      formatSkills(profileData)
                        .slice(0, 3)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200"
                          >
                            {skill}
                          </span>
                        ))
                    ) : (
                      <span className="text-xs text-slate-500">Role not specified.</span>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    <p>
                      Experiments: {userPosts.length === 0 ? "—" : userPosts.length}
                      {" | "}Joined:{" "}
                      {session.user.created_at ? new Date(session.user.created_at).getFullYear() : "—"}
                    </p>
                    {userPosts.length === 0 && <p className="mt-1">Start your first experiment</p>}
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
                    setProfileMessage(null);
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
                userId={userId ?? ""}
                currentUserId={userId}
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
          <div className="flex w-full max-w-lg max-h-[90vh] flex-col overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                  Edit Profile
                </p>
                <p className="text-base font-semibold text-slate-100">
                  Edit Your Profile
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Display Name</label>
                <p className="text-xs text-slate-500">
                  The name others will see when reading your work.
                </p>
                <input
                  value={profileUsername}
                  onChange={(event) => setProfileUsername(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Nova Innovator"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">About</label>
                <textarea
                  value={profileBio}
                  onChange={(event) => setProfileBio(event.target.value)}
                  className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Briefly describe what you work on and the kind of problems you care about."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Areas of Work</label>
                <input
                  value={profileSkills}
                  onChange={(event) => setProfileSkills(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="How do you usually contribute?"
                />
              </div>
              {profileMessage && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                  {profileMessage}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditProfileSave}
                  className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                >
                  <PencilLine className="h-4 w-4" />
                  Save Profile
                </button>
              </div>
            </div>
          </div>
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




