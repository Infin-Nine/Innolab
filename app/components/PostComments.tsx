"use client";

import { useEffect, useMemo, useState, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useFeedbackSheet } from "../contexts/FeedbackSheetContext";

type Solution = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
};

type Profile = {
  id: string;
  username?: string | null;
};

type Props = {
  postId: string;
  postOwnerId?: string;
};

const FEEDBACK_TYPES = [
  "Suggest Improvement",
  "Identify Flaw",
  "Provide Resource",
  "Validate Approach",
  "Offer Collaboration",
] as const;

const parseType = (content: string) => {
  const m = content.match(/^\s*\[([^\]]+)\]\s*(.*)$/s);
  if (m) {
    return { type: m[1], text: m[2] };
  }
  return { type: "Insight", text: content };
};

const composeContent = (type: string, text: string) => {
  return `[${type}] ${text}`;
};

export default function PostComments({ postId, postOwnerId }: Props) {
  const [items, setItems] = useState<Solution[]>([]);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<(typeof FEEDBACK_TYPES)[number]>(
    "Suggest Improvement"
  );
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
        (profs as Profile[] | null)?.forEach((p) => (map[p.id] = p));
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

  const startEdit = (s: Solution) => {
    const { type, text } = parseType(s.content);
    setEditingId(s.id);
    setSelectedType(
      FEEDBACK_TYPES.find((t) => t.toLowerCase() === type.toLowerCase()) ??
        "Suggest Improvement"
    );
    setDraft(text);
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!userId) {
      setMessage("Login to provide insight.");
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    const content = composeContent(selectedType, text);
    if (editingId) {
      const prev = items;
      setItems((p) => p.filter((x) => x.id !== editingId));
      const del = await supabase.from("solutions").delete().eq("id", editingId);
      if (del.error) {
        setItems(prev);
        setSubmitting(false);
        setMessage(del.error.message);
        return;
      }
    }
    const { data, error } = await supabase
      .from("solutions")
      .insert({ post_id: postId, user_id: userId, content })
      .select()
      .single();
    if (error) {
      setSubmitting(false);
      setMessage(error.message);
      return;
    }
    const row = data as Solution;
    setItems((prev) => [row, ...prev]);
    if (!authors[userId]) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, email, full_name")
        .eq("id", userId)
        .maybeSingle();
      if (prof) {
        setAuthors((prev) => ({ ...prev, [userId]: prof as Profile }));
      }
    }
    setOpenForm(false);
    setDraft("");
    setSelectedType("Suggest Improvement");
    setEditingId(null);
    setSubmitting(false);
  };

  const typeChips = useMemo(() => FEEDBACK_TYPES, []);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Feedback & Discussion
        </p>
      </div>

      {message && (
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {message}
        </div>
      )}

      {false && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Feedback Type</label>
            <div className="flex flex-wrap gap-2">
              {typeChips.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    selectedType === t
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Details</label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpenForm(false);
                setEditingId(null);
                setDraft("");
              }}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save" : "Submit"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-transparent" />
            Loading feedback...
          </div>
        ) : items.length === 0 ? (
          <div>
            <p className="text-sm text-slate-400">No feedback yet.</p>
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
                          onClick={() => startEdit(s)}
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
          </div>
        )}
      </div>
    </div>
  );
}
