"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import CollabLayout from "../components/CollabLayout";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  skills?: string[] | string | null;
};

const getDisplayName = (profile: Profile) =>
  profile.username || profile.email || "Innovator";

const formatSkills = (profile: Profile) => {
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

export default function CollabDiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const normalizedQuery = query.trim();
  const normalizedLower = normalizedQuery.toLowerCase();
  useEffect(() => {
    let active = true;
    const fetchProfiles = async () => {
      setLoading(true);
      console.log("[discover] userId", userId);
      let request = supabase.from("profiles").select("*");
      if (userId) {
        request = request.neq("id", userId);
      }
      const { data, error } = await request;
      console.log("[discover] query", normalizedQuery);
      console.log("[discover] error", error?.message ?? null);
      console.log("[discover] rows", (data as Profile[] | null)?.length ?? 0);
      if (!active) return;
      let list = (data as Profile[] | null) ?? [];
      if (normalizedQuery) {
        list = list.filter((p) => {
          const name = [p.username ?? "", p.email ?? ""]
            .join(" ")
            .toLowerCase();
          const skills = formatSkills(p).join(" ").toLowerCase();
          const bio = (p.bio ?? "").toLowerCase();
          return (
            name.includes(normalizedLower) ||
            skills.includes(normalizedLower) ||
            bio.includes(normalizedLower)
          );
        });
      }
      setProfiles(list);
      setLoading(false);
    };
    fetchProfiles();
    return () => {
      active = false;
    };
  }, [userId, normalizedQuery, normalizedLower]);

  return (
    <CollabLayout
      title="Explore Members"
      subtitle="Browse profiles and signal your collaboration intent."
    >
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username, skills, or email"
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            type="text"
          />
          {normalizedQuery ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : (
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              {profiles.length} user{profiles.length === 1 ? "" : "s"}
            </span>
          )}
          {normalizedQuery && (
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              {profiles.length} result
              {profiles.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading collaborators...
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
          No profiles match your search.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={getDisplayName(profile)}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200">
                    {getDisplayName(profile).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {getDisplayName(profile)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(profile.bio ?? "").slice(0, 80)}
                    {(profile.bio ?? "").length > 80 ? "…" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/profile/${profile.id}`}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollabLayout>
  );
}
