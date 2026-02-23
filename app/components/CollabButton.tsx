"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type CollabRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at?: string | null;
};

type Props = {
  targetProfileId: string;
  currentUserId?: string | null;
  className?: string;
};

export default function CollabButton({
  targetProfileId,
  currentUserId,
  className,
}: Props) {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [relation, setRelation] = useState<CollabRow | null>(null);
  const [loading, setLoading] = useState(false);
  const userId = currentUserId ?? authUserId;

  useEffect(() => {
    if (currentUserId !== undefined) {
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAuthUserId(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user.id ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [currentUserId]);

  const loadRelation = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from("collaborators")
        .select("id, requester_id, receiver_id, status, created_at")
        .or(
          `and(requester_id.eq.${uid},receiver_id.eq.${targetProfileId}),and(requester_id.eq.${targetProfileId},receiver_id.eq.${uid})`
        )
        .order("created_at", { ascending: false })
        .limit(1);
      return ((data as CollabRow[] | null)?.[0] as CollabRow | null) ?? null;
    },
    [targetProfileId]
  );

  useEffect(() => {
    if (!userId || !targetProfileId || userId === targetProfileId) {
      Promise.resolve().then(() => setRelation(null));
      return;
    }
    Promise.resolve().then(() => setLoading(true));
    loadRelation(userId).then((row) => {
      setRelation(row);
      setLoading(false);
    });
  }, [loadRelation, targetProfileId, userId]);

  const handleClick = async () => {
    if (!userId || !targetProfileId || userId === targetProfileId) {
      return;
    }
    setLoading(true);
    const latest = await loadRelation(userId);
    if (latest?.status === "pending") {
      if (latest.receiver_id === userId) {
        const { error } = await supabase
          .from("collaborators")
          .update({ status: "accepted" })
          .eq("id", latest.id);
        if (!error) {
          setRelation({ ...latest, status: "accepted" });
        } else {
          setRelation(latest);
        }
      } else {
        setRelation(latest);
      }
      setLoading(false);
      return;
    }
    if (latest?.status === "accepted") {
      const confirmed = window.confirm("Stop collaborating with this user?");
      if (confirmed) {
        const { error } = await supabase
          .from("collaborators")
          .delete()
          .eq("id", latest.id);
        if (!error) {
          setRelation(null);
        } else {
          setRelation(latest);
        }
      } else {
        setRelation(latest);
      }
      setLoading(false);
      return;
    }
    if (latest?.status === "rejected") {
      setRelation(latest);
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("collaborators").insert({
      requester_id: userId,
      receiver_id: targetProfileId,
      status: "pending",
    });
    if (!error) {
      setRelation({
        id: crypto.randomUUID(),
        requester_id: userId,
        receiver_id: targetProfileId,
        status: "pending",
      });
    }
    setLoading(false);
  };

  const isSelf = userId === targetProfileId;

  const label = useMemo(() => {
    if (!relation || relation.status === "rejected") {
      return "Collab";
    }
    if (relation.status === "accepted") {
      return "Stop Collaborating";
    }
    if (relation.status === "pending") {
      return relation.requester_id === userId ? "Requested" : "Accept";
    }
    return "Collab";
  }, [relation, userId]);

  if (isSelf) {
    return null;
  }

  const disabled =
    loading ||
    !userId ||
    relation?.status === "rejected" ||
    (relation?.status === "pending" && relation.requester_id === userId);

  const style =
    label === "Accept"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
      : label === "Requested"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : label === "Stop Collaborating"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${style} ${className ?? ""}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}
