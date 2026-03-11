"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ImageUp, Loader2, X } from "lucide-react";
import { useLoginModal } from "../contexts/LoginModalContext";
import { supabase } from "../lib/supabaseClient";

type Stage = "idea" | "exploring" | "prototype" | "testing" | "completed" | "failed";
type WipStatus =
  | "idea"
  | "prototype"
  | "built"
  | "wip"
  | "failed"
  | "exploring"
  | "testing"
  | "completed";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
  linkedProblemId?: string | null;
  linkedProblemTitle?: string | null;
};

type PostInsertPayload = {
  user_id: string;
  title: string;
  wip_status: WipStatus;
  media_url: string | null;
  problem_id?: string;
  problem_statement?: string;
  theory?: string;
  explanation?: string;
  approach?: string;
  observations?: string;
  reflection?: string;
  feedback_needed?: string[] | string;
  external_link?: string;
};

const stageStyles: Record<Stage, string> = {
  idea: "border-fuchsia-500/40 text-fuchsia-200",
  exploring: "border-sky-500/40 text-sky-200",
  prototype: "border-cyan-500/40 text-cyan-200",
  testing: "border-amber-500/40 text-amber-200",
  completed: "border-emerald-500/40 text-emerald-200",
  failed: "border-rose-500/40 text-rose-200",
};

const stageFallback: Record<Stage, WipStatus> = {
  idea: "idea",
  exploring: "wip",
  prototype: "prototype",
  testing: "wip",
  completed: "built",
  failed: "failed",
};

const feedbackOptions = [
  "Validate",
  "Suggest improvements",
  "Identify flaws",
  "Open to collaborate",
];

const omitProblemId = (payload: PostInsertPayload) => {
  const next = { ...payload };
  delete next.problem_id;
  return next;
};

const toLegacyCompatiblePayload = (payload: PostInsertPayload): PostInsertPayload => {
  const next: PostInsertPayload = {
    user_id: payload.user_id,
    title: payload.title,
    wip_status: payload.wip_status,
    media_url: payload.media_url,
  };

  if (payload.problem_statement) next.problem_statement = payload.problem_statement;
  if (payload.explanation) next.explanation = payload.explanation;

  return next;
};

const buildPublishAttempts = (
  payload: PostInsertPayload,
  fallbackStatus: WipStatus
): PostInsertPayload[] => {
  const attempts: PostInsertPayload[] = [payload];

  if (payload.problem_id) {
    attempts.push(omitProblemId(payload));
  }

  if (fallbackStatus !== payload.wip_status) {
    const fallbackPayload = { ...payload, wip_status: fallbackStatus };
    attempts.push(fallbackPayload);
    if (fallbackPayload.problem_id) {
      attempts.push(omitProblemId(fallbackPayload));
    }
  }

  const legacyPayload = toLegacyCompatiblePayload(payload);
  attempts.push(legacyPayload);
  if (fallbackStatus !== payload.wip_status) {
    attempts.push({ ...legacyPayload, wip_status: fallbackStatus });
  }

  return attempts;
};

export default function CreatePost({
  isOpen,
  onClose,
  onPostCreated,
  linkedProblemId,
  linkedProblemTitle,
}: Props) {
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [stage, setStage] = useState<Stage>("idea");
  const [approach, setApproach] = useState("");
  const [observations, setObservations] = useState("");
  const [feedbackNeeded, setFeedbackNeeded] = useState<string[]>([]);
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { openLoginModal } = useLoginModal();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const submitPost = async () => {
    setMessage(null);
    if (!user) {
      openLoginModal();
      return;
    }
    const titleValue = title.trim();
    const problemValue = problem.trim();
    const approachValue = approach.trim();
    if (!titleValue || !problemValue || !approachValue) {
      setMessage("Title, Problem, and My Approach are required.");
      return;
    }

    setUploading(true);

    try {
      let publicUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          setMessage(uploadError.message);
          return;
        }

        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        publicUrl = data.publicUrl;
      }

      const payload: PostInsertPayload = {
        user_id: user.id,
        title: titleValue,
        problem_statement: problemValue,
        explanation: approachValue,
        approach: approachValue,
        observations: observations.trim() || undefined,
        feedback_needed: feedbackNeeded.length ? feedbackNeeded : undefined,
        external_link: externalLink.trim() || undefined,
        wip_status: stage,
        media_url: publicUrl,
      };

      if (linkedProblemId?.trim()) {
        payload.problem_id = linkedProblemId.trim();
      }

      const fallbackStatus = stageFallback[stage];
      const publishAttempts = buildPublishAttempts(payload, fallbackStatus);

      let publishError: string | null = null;
      let published = false;

      for (const attempt of publishAttempts) {
        const { error } = await supabase.from("posts").insert(attempt);
        if (!error) {
          published = true;
          break;
        }
        publishError = error.message;
      }

      if (!published) {
        setMessage(publishError ?? "Failed to publish solution.");
        return;
      }

      setTitle("");
      setProblem("");
      setApproach("");
      setObservations("");
      setFeedbackNeeded([]);
      setExternalLink("");
      setStage("idea");
      setFile(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("experiment:created", {
            detail: { userId: user.id },
          })
        );
      }

      onPostCreated?.();
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to publish solution.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
              Build Solution
            </p>
            <h3 className="text-lg font-semibold">Share Your Solution</h3>
            <p className="text-sm text-slate-400">
              Document your prototype, idea, or working solution.
            </p>
            {linkedProblemId && (
              <p className="mt-2 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                Linked to Problem: {linkedProblemTitle?.trim() || linkedProblemId}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitPost();
          }}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Quantum Sensor Calibration"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Stage</label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["idea", "Idea"],
                        ["exploring", "Exploring"],
                        ["prototype", "Prototype"],
                        ["testing", "Testing"],
                        ["completed", "Completed"],
                        ["failed", "Failed"],
                      ] as [Stage, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStage(value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          stage === value
                            ? stageStyles[value]
                            : "border-slate-700 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-100"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Problem</label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="min-h-[120px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="What exact problem are you trying to solve?"
                  />
                  {problem.trim().length > 0 && problem.trim().length < 150 && (
                    <p className="text-xs text-amber-300/90">
                      Your problem description seems too short. Clear problems get better feedback.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">My Approach</label>
                  <textarea
                    value={approach}
                    onChange={(e) => setApproach(e.target.value)}
                    className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="What are you trying, and why this approach?"
                  />
                  {approach.trim().length > 0 && approach.trim().length < 150 && (
                    <p className="text-xs text-amber-300/90">
                      Your approach description seems too short. Clear approaches get better feedback.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Progress <span className="text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="What progress have you made so far?"
                  />
                </div>
              </div>
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Need Feedback</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {feedbackOptions.map((option) => {
                    const checked = feedbackNeeded.includes(option);
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
                            setFeedbackNeeded((prev) =>
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
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-medium text-slate-300">Evidence</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload supporting media, documentation, or progress snapshots.
              </p>
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Image upload</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-cyan-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">
                    External link (optional)
                  </label>
                  <input
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="GitHub, video, or documentation link"
                  />
                </div>
              </div>
            </section>
            {message && (
              <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-100">
                {message}
              </div>
            )}
          </div>
          <p className="mt-5 text-xs text-slate-500">InoLabium is for real experiments, not announcements.</p>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitPost()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageUp className="h-4 w-4" />
                  Publish Solution
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
