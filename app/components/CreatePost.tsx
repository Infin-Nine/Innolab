"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { ChevronDown, ImageUp, Loader2, X } from "lucide-react";

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
  "Validate my approach",
  "Suggest improvements",
  "Identify possible flaws",
  "Recommend resources",
  "Open to collaboration",
];

export default function CreatePost({ isOpen, onClose, onPostCreated }: Props) {
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [stage, setStage] = useState<Stage>("idea");
  const [coreIdea, setCoreIdea] = useState("");
  const [approach, setApproach] = useState("");
  const [observations, setObservations] = useState("");
  const [reflection, setReflection] = useState("");
  const [feedbackNeeded, setFeedbackNeeded] = useState<string[]>([]);
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!user) {
      setMessage("Sign in to publish a lab note.");
      return;
    }
    const titleValue = title.trim() || "New Experiment";
    setUploading(true);
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
    if (coreIdea.trim()) payload.theory = coreIdea.trim();
    if (approach.trim()) payload.explanation = approach.trim();
    if (approach.trim()) payload.approach = approach.trim();
    if (observations.trim()) payload.observations = observations.trim();
    if (reflection.trim()) payload.reflection = reflection.trim();
    if (feedbackNeeded.length) payload.feedback_needed = feedbackNeeded;
    if (externalLink.trim()) payload.external_link = externalLink.trim();
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
    setCoreIdea("");
    setApproach("");
    setObservations("");
    setReflection("");
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
            <h3 className="text-lg font-semibold">Document your experiment</h3>
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Core Overview
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    Required foundation
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Quantum Sensor Calibration"
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
                  <label className="text-xs text-slate-400">
                    What are you exploring?
                  </label>
                  <p className="text-xs text-slate-500">
                    Describe the specific problem, question, or curiosity you are
                    working on.
                  </p>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="min-h-[120px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="State the core focus of the experiment."
                  />
                </div>
              </div>
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setThinkingOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Thinking Process
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    Optional deep dive
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-300 transition ${
                    thinkingOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {thinkingOpen && (
                <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Core Idea</label>
                      <p className="text-xs text-slate-500">
                        What do you think might work, and why?
                      </p>
                      <textarea
                        value={coreIdea}
                        onChange={(e) => setCoreIdea(e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                        placeholder="Share the intuition behind the idea."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Approach</label>
                      <p className="text-xs text-slate-500">
                        What steps, tools, or setup are you using?
                      </p>
                      <textarea
                        value={approach}
                        onChange={(e) => setApproach(e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        placeholder="Outline the methods or workflow."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">
                        Observations
                      </label>
                      <p className="text-xs text-slate-500">
                        What has happened so far? What worked or failed?
                      </p>
                      <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Capture outcomes and signals."
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setReflectionOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Reflection & Feedback
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    Optional insights
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-300 transition ${
                    reflectionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {reflectionOpen && (
                <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">
                        What did you learn?
                      </label>
                      <textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Summarize the key takeaway."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">
                        Feedback Needed
                      </label>
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
                  </div>
                </div>
              )}
            </section>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Evidence
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
