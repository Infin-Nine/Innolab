"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { Loader2, Trash2 } from "lucide-react";

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
  full_name?: string | null;
  email?: string | null;
};

type Props = {
  postId: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SolutionSection({ postId }: Props) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, Profile>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchSolutions = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("solutions")
        .select("id, post_id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setSolutions((data as Solution[]) ?? []);
      const ids = Array.from(new Set(((data as Solution[]) ?? []).map((s) => s.user_id)));
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
      setLoading(false);
    };
    fetchSolutions();
    return () => {
      mounted = false;
    };
  }, [postId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!user) {
      setMessage("Sign in to propose a solution.");
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    const username =
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Innovator";
    await supabase.from("profiles").upsert({
      id: user.id,
      username,
      full_name: user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });
    const { error, data } = await supabase
      .from("solutions")
      .insert({ post_id: postId, user_id: user.id, content: text })
      .select()
      .single();
    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }
    const row = data as Solution;
    setSolutions((prev) => [row, ...prev]);
    if (user) {
      setAuthors((prev) => ({
        ...prev,
        [user.id]: {
          id: user.id,
          username: user.user_metadata?.username ?? null,
          full_name: user.user_metadata?.full_name ?? null,
          email: user.email ?? null,
        },
      }));
    }
    setDraft("");
    setSubmitting(false);
  };

  const handleDeleteSolution = async (solution: Solution) => {
    if (!user || user.id !== solution.user_id) {
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this comment? This action cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    const previous = solutions;
    setSolutions((prev) => prev.filter((item) => item.id !== solution.id));
    const { error } = await supabase
      .from("solutions")
      .delete()
      .eq("id", solution.id)
      .eq("user_id", user.id);
    if (error) {
      setSolutions(previous);
      setMessage(error.message);
    }
  };

  const displayName = (p?: Profile) =>
    p?.username || p?.full_name || p?.email || "Innovator";

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
        Peer Reviews
      </p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Draft your hypothesis/solution..."
          className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/20 px-4 text-sm font-semibold text-emerald-100 disabled:opacity-60"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting
            </span>
          ) : (
            "Submit"
          )}
        </button>
      </form>
      {message && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {message}
        </div>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading solutions...
        </div>
      ) : solutions.length === 0 ? (
        <p className="text-sm text-slate-400">No solutions yet.</p>
      ) : (
        <div className="space-y-3">
          {solutions.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  <a
                    href={`/profile/${s.user_id}`}
                    className="text-cyan-200 hover:underline"
                  >
                    {displayName(authors[s.user_id])}
                  </a>{" "}
                  • {s.created_at ? new Date(s.created_at).toLocaleString() : "Now"}
                </p>
                {user?.id === s.user_id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSolution(s)}
                    className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-1">{s.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
