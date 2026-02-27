"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useFeedbackSheet } from "../contexts/FeedbackSheetContext";
import type { Profile, Solution } from "../types/models";

type Props = {
  postId: string;
  postOwnerId?: string;
  compactSpacing?: boolean;
  showInlineAddButton?: boolean;
};

const parseType = (content: string) => {
  const m = content.match(/^\s*\[([^\]]+)\]\s*(.*)$/s);
  if (m) {
    return { type: m[1], text: m[2] };
  }
  return { type: "Insight", text: content };
};

export default function PostComments({
  postId,
  postOwnerId,
  compactSpacing = false,
  showInlineAddButton = true,
}: Props) {
  const [items, setItems] = useState<Solution[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { open } = useFeedbackSheet();

  const getUsername = (p?: Profile) => p?.username ?? "";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("solutions")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    if (!error) {
      const rows = (data as Solution[]) ?? [];
      setItems(rows);
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ids);
        const map: Record<string, Profile> = {};
        (profs as Profile[] | null)?.forEach((p) => {
          if (!p?.id) return;
          map[p.id] = p;
        });
        setAuthors(map);
      } else {
        setAuthors({});
      }
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    const onInserted = (e: Event) => {
      const ce = e as CustomEvent<Solution>;
      const row = ce.detail;
      if (!row || row.post_id !== postId) return;
      setItems((prev) => [row, ...prev]);
      if (!authors[row.user_id]) {
        supabase
          .from("profiles")
          .select("id, username, email, full_name")
          .eq("id", row.user_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setAuthors((prev) => ({ ...prev, [row.user_id]: data as Profile }));
            }
          });
      }
    };
    window.addEventListener("solutions:inserted", onInserted as EventListener);
    return () => window.removeEventListener("solutions:inserted", onInserted as EventListener);
  }, [postId, authors]);

  const startCreate = () => open(postId);

  const startEdit = () => {
    setMessage("Editing is currently inline here. Submit to replace your previous insight.");
  };

  const canDelete = (s: Solution) =>
    userId === s.user_id || (!!postOwnerId && userId === postOwnerId);

  const onDelete = async (s: Solution) => {
    if (!canDelete(s)) return;
    const previous = items;
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    const { error } = await supabase
      .from("solutions")
      .delete()
      .eq("id", s.id);
    if (error) {
      setItems(previous);
      setMessage(error.message);
    }
  };

  const sectionTopGap = compactSpacing ? "mt-0" : "mt-8";
  const contentTopGap = compactSpacing ? "mt-[clamp(0.5rem,1.2vh,1rem)]" : "mt-4";

  return (
    <div className={sectionTopGap}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Discussion
        </p>
      </div>

      {message && (
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {message}
        </div>
      )}

      <div className={contentTopGap}>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-transparent" />
            Loading feedback...
          </div>
        ) : items.length === 0 ? (
          <div>
            <p className="text-sm text-slate-400">No insights yet.</p>
            {showInlineAddButton && (
              <div className="mt-3 flex justify-end">
                {userId ? (
                  <button
                    type="button"
                    onClick={startCreate}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    Add Insight
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Login to provide insight.</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => {
              const author = authors[s.user_id];
              const { type, text } = parseType(s.content);
              const isMine = userId === s.user_id;
              const ownerDelete = !!postOwnerId && userId === postOwnerId && userId !== s.user_id;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/profile/${s.user_id}`}
                        className="font-semibold text-cyan-200 hover:underline"
                      >
                        {getUsername(author)}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {s.created_at ? new Date(s.created_at).toLocaleString() : "Now"}
                      </span>
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-[2px] text-[10px] font-semibold text-emerald-100">
                        {type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMine && (
                        <button
                          type="button"
                          onClick={startEdit}
                          className="flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-100"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                      {(isMine || ownerDelete) && (
                        <button
                          type="button"
                          onClick={() => onDelete(s)}
                          className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2">{text}</p>
                </div>
              );
            })}
            {showInlineAddButton && (
              <div className="flex justify-end">
                {userId ? (
                  <button
                    type="button"
                    onClick={startCreate}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    Add Insight
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Login to provide insight.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
