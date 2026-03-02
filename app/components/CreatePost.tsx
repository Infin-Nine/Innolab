"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { ImageUp, Loader2, X } from "lucide-react";
import { useLoginModal } from "../contexts/LoginModalContext";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      setMessage(profileError.message);
      setUploading(false);
      return;
    }
    const username = profileRow?.username?.trim() ?? "";
    if (!username) {
      setMessage("Set your username in profile before publishing.");
      setUploading(false);
      return;
    }
    await supabase.from("profiles").upsert({
      id: user.id,
      username,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });
    let publicUrl: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setMessage(uploadError.message);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      publicUrl = data.publicUrl;
    }
    const payload: {
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
    } = {
      user_id: user.id,
      title: titleValue,
      wip_status: stage,
      media_url: publicUrl,
    };
    if (problem.trim()) payload.problem_statement = problem.trim();
    if (approach.trim()) payload.explanation = approach.trim();
    if (approach.trim()) payload.approach = approach.trim();
    if (observations.trim()) payload.observations = observations.trim();
    if (feedbackNeeded.length) payload.feedback_needed = feedbackNeeded;
    if (externalLink.trim()) payload.external_link = externalLink.trim();
    if (linkedProblemId?.trim()) payload.problem_id = linkedProblemId.trim();
    const { error: insertError } = await supabase.from("posts").insert(payload);
    if (insertError) {
      const fallbackStatus = stageFallback[stage];
      const fallback = await supabase.from("posts").insert({
        user_id: user.id,
        title: titleValue,
        wip_status: fallbackStatus,
        media_url: publicUrl,
      });
      if (fallback.error) {
        setMessage(fallback.error.message);
        setUploading(false);
        return;
      }
    }
    setTitle("");
    setProblem("");
    setApproach("");
    setObservations("");
    setFeedbackNeeded([]);
    setExternalLink("");
    setStage("idea");
    setFile(null);
    setUploading(false);
    onPostCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
              New Experiment
            </p>
            <h3 className="text-lg font-semibold">Share Your Work</h3>
            <p className="text-sm text-slate-400">
              Document what you&apos;re developing, testing, or improving.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
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
                    required
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
                    required
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
          <p className="mt-5 text-xs text-slate-500">
            AperNova is for real experiments, not announcements.
          </p>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !supabaseUrl || !supabaseAnonKey}
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
                  Publish Experiment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
