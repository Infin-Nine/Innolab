"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useFeedbackSheet } from "../contexts/FeedbackSheetContext";
import { useLoginModal } from "../contexts/LoginModalContext";

const TYPES = [
  "Suggest Improvement",
  "Identify Flaw",
  "Provide Resource",
  "Validate Approach",
  "Offer Collaboration",
] as const;

const composeContent = (type: string, text: string) => `[${type}] ${text}`;

export default function FeedbackBottomSheet() {
  const { isOpen, postId, close } = useFeedbackSheet();
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("Suggest Improvement");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const { openLoginModal } = useLoginModal();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => taRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (!loading) close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, loading, close]);

  const show = isOpen && !!postId;
  const canSubmit = text.trim().length > 0 && !!postId && !loading;

  const onSubmit = async () => {
    if (!canSubmit || !postId) return;
    if (!userId) {
      openLoginModal(() => void onSubmit());
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const u = userData?.user ?? null;
    if (u) {
      const username =
        (u.user_metadata?.username as string | undefined) ||
        (u.user_metadata?.full_name as string | undefined) ||
        (u.email ? u.email.split("@")[0] : undefined) ||
        "Innovator";
      await supabase.from("profiles").upsert({
        id: u.id,
        username,
        full_name: (u.user_metadata?.full_name as string | null) ?? null,
        email: u.email ?? null,
        avatar_url: (u.user_metadata?.avatar_url as string | null) ?? null,
      });
    }
    const content = composeContent(type, text.trim());
    const { data, error } = await supabase
      .from("solutions")
      .insert({ post_id: postId, user_id: userId, content })
      .select()
      .single();
    if (error) {
      setLoading(false);
      setToast(error.message || "Failed to submit insight.");
      return;
    }
    const row = data as { id: string; post_id: string; user_id: string; content: string; created_at: string };
    window.dispatchEvent(new CustomEvent("solutions:inserted", { detail: row }));
    setLoading(false);
    setToast("Insight added");
    setText("");
    setType("Suggest Improvement");
    close();
    setTimeout(() => setToast(null), 1500);
  };

  const autoResize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleClose = () => {
    if (loading) return;
    setText("");
    setType("Suggest Improvement");
    close();
  };

  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[86] transform-gpu transition-transform duration-200 ease-out translate-y-0">
        <div className="mx-auto w-full max-w-2xl rounded-t-3xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Add Insight
              </p>
              <p className="text-sm text-slate-300">
                Share a concise, constructive research insight
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      type === t
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                        : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Details</label>
                <textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setTimeout(autoResize, 0);
                  }}
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <div className="text-right text-xs text-slate-500">{text.trim().length} chars</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[90] rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
