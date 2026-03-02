"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useLoginModal } from "../contexts/LoginModalContext";

type WipStatus =
  | "idea"
  | "prototype"
  | "built"
  | "wip"
  | "failed"
  | "exploring"
  | "testing"
  | "completed";

type Post = {
  id: string;
  user_id: string;
  title: string | null;
  problem_statement: string | null;
  theory?: string | null;
  explanation?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  feedback_needed?: string[] | string | null;
  external_link?: string | null;
  wip_status: WipStatus | null;
};

type Props = {
  postId: string | null;
  currentUserId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: Partial<Post> & { id: string }) => void;
};

const normalizeFeedback = (value?: string[] | string | null) => {
  if (!value) return [] as string[];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    return [String(value)];
  }
  return [String(value)];
};

export default function ExperimentEditModal({
  postId,
  currentUserId,
  open,
  onClose,
  onSaved,
}: Props) {
  const { openLoginModal } = useLoginModal();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<WipStatus>("idea");
  const [problem, setProblem] = useState("");
  const [coreIdea, setCoreIdea] = useState("");
  const [approach, setApproach] = useState("");
  const [observations, setObservations] = useState("");
  const [reflection, setReflection] = useState("");
  const [feedback, setFeedback] = useState<string[]>([]);
  const [externalLink, setExternalLink] = useState("");

  const feedbackOptions = useMemo(
    () => [
      "Validate my approach",
      "Suggest improvements",
      "Identify possible flaws",
      "Recommend resources",
      "Open to collaboration",
    ],
    []
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!open || !postId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id,user_id,title,problem_statement,theory,explanation,approach,observations,reflection,feedback_needed,external_link,wip_status"
        )
        .eq("id", postId)
        .maybeSingle();
      if (!mounted) return;
      if (!error && data) {
        const p = data as Post;
        setTitle(p.title ?? "");
        setStage((p.wip_status ?? "idea") as WipStatus);
        setProblem(p.problem_statement ?? "");
        setCoreIdea(p.theory ?? "");
        setApproach(p.approach ?? p.explanation ?? "");
        setObservations(p.observations ?? "");
        setReflection(p.reflection ?? "");
        setFeedback(normalizeFeedback(p.feedback_needed));
        setExternalLink(p.external_link ?? "");
      } else if (error) {
        setMessage(error.message);
      }
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [open, postId]);

  const save = async () => {
    let uid = currentUserId;
    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
    }
    if (!postId) return;
    if (!uid) {
      openLoginModal(() => void save());
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      title: title.trim() || "Untitled Experiment",
      wip_status: stage,
      problem_statement: problem.trim() || null,
      theory: coreIdea.trim() || null,
      approach: approach.trim() || null,
      explanation: approach.trim() || null,
      observations: observations.trim() || null,
      reflection: reflection.trim() || null,
      feedback_needed: feedback.length ? feedback : null,
      external_link: externalLink.trim() || null,
    };
    const { data, error } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", postId)
      .eq("user_id", uid)
      .select("id")
      .maybeSingle();
    console.log("Experiment update result", { data, error });
    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("experiment:updated", {
          detail: { id: postId, payload },
        })
      );
    }
    onSaved?.({ id: postId, ...payload });
    setSaving(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
              Edit Experiment
            </p>
            <p className="text-sm text-slate-300">Update the lab record</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-transparent" />
              Loading record...
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Core Overview
                </p>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Stage</label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["idea", "Idea"],
                          ["exploring", "Exploring"],
                          ["prototype", "Prototype"],
                          ["testing", "Testing"],
                          ["completed", "Completed"],
                          ["failed", "Failed"],
                        ] as [WipStatus, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStage(value)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            stage === value
                              ? "border-cyan-500/40 text-cyan-100"
                              : "border-slate-700 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      What is being explored?
                    </label>
                    <textarea
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      className="min-h-[120px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>
              </section>
              <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Thinking Process
                </p>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Core Idea</label>
                    <textarea
                      value={coreIdea}
                      onChange={(e) => setCoreIdea(e.target.value)}
                      className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Approach</label>
                    <textarea
                      value={approach}
                      onChange={(e) => setApproach(e.target.value)}
                      className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Observations</label>
                    <textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>
              </section>
              <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Reflection & Feedback
                </p>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      What did you learn?
                    </label>
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">
                      Feedback Needed
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {feedbackOptions.map((option) => {
                        const checked = feedback.includes(option);
                        return (
                          <label
                            key={option}
                            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                              checked
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                                : "border-slate-800 bg-slate-950/70 text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3 accent-emerald-400"
                              checked={checked}
                              onChange={() =>
                                setFeedback((prev) =>
                                  prev.includes(option)
                                    ? prev.filter((item) => item !== option)
                                    : [...prev, option]
                                )
                              }
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Evidence
                </p>
                <div className="mt-4 space-y-2">
                  <label className="text-xs text-slate-400">External link</label>
                  <input
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </section>
              {message && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
