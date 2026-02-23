"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import CollabButton from "../../components/CollabButton";
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

type CollabRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
};

type CollabItem = CollabRow & { profile?: Profile };

const getDisplayName = (profile?: Profile | null) =>
  profile?.username || profile?.email || "Innovator";

export default function CollabRequestsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [incoming, setIncoming] = useState<CollabItem[]>([]);
  const [outgoing, setOutgoing] = useState<CollabItem[]>([]);

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
    const fetchRequests = async () => {
      if (!userId) {
        setIncoming([]);
        setOutgoing([]);
        return;
      }
      setLoading(true);
      const { data: incomingRows, error: inErr } = await supabase
        .from("collaborators")
        .select("id, requester_id, receiver_id, status")
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const { data: outgoingRows, error: outErr } = await supabase
        .from("collaborators")
        .select("id, requester_id, receiver_id, status")
        .eq("requester_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      console.log("[requests] incoming err", inErr?.message ?? null);
      console.log("[requests] outgoing err", outErr?.message ?? null);
      const incomingList = (incomingRows as CollabRow[] | null) ?? [];
      const outgoingList = (outgoingRows as CollabRow[] | null) ?? [];
      const incomingIds = incomingList.map((row) => row.requester_id);
      const outgoingIds = outgoingList.map((row) => row.receiver_id);
      const ids = Array.from(new Set([...incomingIds, ...outgoingIds]));
      const profileMap: Record<string, Profile> = {};
      if (ids.length) {
        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, username, email, avatar_url, bio")
          .in("id", ids);
        console.log("[requests] profiles err", profErr?.message ?? null);
        (profileRows as Profile[] | null)?.forEach((profile) => {
          profileMap[profile.id] = profile;
        });
      }
      setIncoming(
        incomingList.map((row) => ({
          ...row,
          profile: profileMap[row.requester_id],
        }))
      );
      setOutgoing(
        outgoingList.map((row) => ({
          ...row,
          profile: profileMap[row.receiver_id],
        }))
      );
      setLoading(false);
    };
    fetchRequests();
  }, [userId]);

  return (
    <CollabLayout
      title="Requests Queue"
      subtitle="Accept incoming collaboration requests or track outgoing ones."
    >
      {!userId ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
          Sign in to manage collaboration requests.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading requests...
        </div>
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-400">
                Incoming
              </p>
              <h2 className="text-lg font-semibold">Pending requests</h2>
            </div>
            {incoming.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
                No incoming requests.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
                {incoming.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
                  >
                    <div className="flex items-center gap-3">
                      {row.profile?.avatar_url ? (
                        <Image
                          src={row.profile.avatar_url}
                          alt={getDisplayName(row.profile)}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200">
                          {getDisplayName(row.profile).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {getDisplayName(row.profile)}
                        </p>
                        <p className="text-xs text-slate-400">
                          wants to collaborate with you.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <CollabButton
                        targetProfileId={row.requester_id}
                        currentUserId={userId}
                      />
                      <Link
                        href={`/profile/${row.requester_id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                Outgoing
              </p>
              <h2 className="text-lg font-semibold">Requests you sent</h2>
            </div>
            {outgoing.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
                No outgoing requests.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
                {outgoing.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
                  >
                    <div className="flex items-center gap-3">
                      {row.profile?.avatar_url ? (
                        <Image
                          src={row.profile.avatar_url}
                          alt={getDisplayName(row.profile)}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200">
                          {getDisplayName(row.profile).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {getDisplayName(row.profile)}
                        </p>
                        <p className="text-xs text-slate-400">
                          awaiting their response.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <CollabButton
                        targetProfileId={row.receiver_id}
                        currentUserId={userId}
                      />
                      <Link
                        href={`/profile/${row.receiver_id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </CollabLayout>
  );
}
