"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import CollabLayout from "../components/CollabLayout";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  username?: string | null;
};

type CollabRow = {
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  requester?: { username?: string | null } | null;
  receiver?: { username?: string | null } | null;
};

export default function MyCollaboratorsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

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

  useEffect(() => {
    const fetchAccepted = async () => {
      if (!userId) {
        setProfiles([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("collaborators")
        .select(
          "requester_id, receiver_id, status, requester:profiles!collaborators_requester_id_fkey(username), receiver:profiles!collaborators_receiver_id_fkey(username)"
        )
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");
      const rows = (data as CollabRow[] | null) ?? [];
      const result = rows.map((row) => {
        const isRequester = row.requester_id === userId;
        const id = isRequester ? row.receiver_id : row.requester_id;
        const username = isRequester
          ? row.receiver?.username ?? null
          : row.requester?.username ?? null;
        return { id, username };
      });
      setProfiles(result);
      setLoading(false);
    };
    fetchAccepted();
  }, [userId]);

  return (
    <CollabLayout
      title="My Collaborators"
      subtitle="Everyone you are collaborating with right now."
    >
      {!userId ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
          Sign in to view collaborators.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading collaborators...
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
          No accepted collaborators yet.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <p className="text-sm font-semibold text-slate-100">
                {profile.username ?? ""}
              </p>
              <Link
                href={`/profile/${profile.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
              >
                View Profile
              </Link>
            </div>
          ))}
        </div>
      )}
    </CollabLayout>
  );
}
