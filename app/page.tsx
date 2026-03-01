"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
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
  Atom,
  ImageUp,
  Loader2,
  LogIn,
  MoreHorizontal,
  PencilLine,
  ShieldOff,
  Users,
  Zap,
  X,
} from "lucide-react";

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
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthMessage(error.message);
      } else {
        setAuthMessage("Welcome back to InnoLab.");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthMessage(error.message);
      } else {
        const displayName =
          authName || authEmail.split("@")[0] || "Innovator";
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            username: displayName,
          });
        }
        setAuthMessage("Check your inbox to confirm your account.");
      }
    }
    setAuthLoading(false);
  };

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthMessage(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
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

  const handleEditProfileSave = async () => {
    if (!userId) {
      setProfileMessage("Sign in to update your profile.");
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
    if (!userId) return;
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

  if (!session) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_60%)]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[120px]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                <Atom className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">InnoLab</p>
                <p className="text-xs text-slate-400">Open Research & Innovation Network</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
            >
              Login
            </button>
          </div>

          {envMissing && (
            <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
              enable live data.
            </div>
          )}

          <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
                Future Lab Network
              </p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Where Innovation Meets Adrenaline.
              </h1>
              <p className="text-sm text-slate-400">
                Where independent research becomes visible.
              </p>
              <p className="text-base text-slate-300 sm:text-lg">
                The social network for inventors, makers, and researchers. Share
                your messy experiments, find your co-founder, and get funded—without
                the academic pressure.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openAuthModal("signup")}
                  className="rounded-full border border-cyan-400/60 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
                >
                  Join the Revolution
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="rounded-full border border-slate-700 bg-slate-950/70 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                >
                  Login
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-cyan-500/30 px-3 py-1">
                  Supabase Auth
                </span>
                <span className="rounded-full border border-fuchsia-500/30 px-3 py-1">
                  Proof of Creation
                </span>
                <span className="rounded-full border border-emerald-500/30 px-3 py-1">
                  Collab Network
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-500/10">
              <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-400">
                Live Lab Pulse
              </p>
              <div className="mt-6 space-y-4">
                {[
                  "Prototype neural-sensing wearables in public.",
                  "Collaborate with deep-tech founders.",
                  "Turn WIP notes into funding signals.",
                ].map((line) => (
                  <div
                    key={line}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-20">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">
                  Why InnoLab?
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  A future lab built for momentum.
                </h2>
              </div>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-cyan-500/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  Make Science Social.
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Research should not be boring. Share your work like you share
                  your life—videos, quick updates, and raw ideas.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-fuchsia-500/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Find Your Tribe.</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Stop working in isolation. Connect with mentors, collaborators,
                  and investors who get your vision.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-emerald-500/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                  <ShieldOff className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Zero Pressure.</h3>
                <p className="mt-2 text-sm text-slate-300">
                  No need to look perfect. We celebrate Work in Progress. Fail
                  fast, learn faster, and ship things that matter.
                </p>
              </div>
            </div>
          </section>
        </div>

        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-10">
            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl shadow-slate-900/80">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
                    Auth Console
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {authMode === "login"
                      ? "Login to InnoLab"
                      : "Join the Revolution"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeAuthModal}
                  className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form
                onSubmit={handleAuthSubmit}
                className="mt-5 space-y-4"
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      authMode === "login"
                        ? "bg-cyan-500/20 text-cyan-100"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      authMode === "signup"
                        ? "bg-fuchsia-500/20 text-fuchsia-100"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      Display name
                    </label>
                    <input
                      value={authName}
                      onChange={(event) => setAuthName(event.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                      placeholder="Nova Innovator"
                      type="text"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Email</label>
                  <input
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="you@lab.com"
                    type="email"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Password</label>
                  <input
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="••••••••"
                    type="password"
                    required
                  />
                </div>
                {authMessage && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                    {authMessage}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={authLoading || envMissing}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      {authMode === "login" ? "Log In" : "Create Account"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

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




