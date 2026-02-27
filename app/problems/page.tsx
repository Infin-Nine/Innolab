"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Lightbulb, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Frequency = "daily" | "weekly" | "monthly" | "occasionally" | "rare";
type SolutionType =
  | "software"
  | "hardware"
  | "service"
  | "policy"
  | "research"
  | "education";

type Problem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  affected_group: string;
  frequency: Frequency | string;
  current_workaround: string;
  solution_type: SolutionType | string;
  expected_outcome?: string | null;
  additional_context?: string | null;
  created_at?: string | null;
};

type ProblemAuthor = {
  id: string;
  username?: string | null;
};

const genericTitleSet = new Set([
  "problem",
  "issue",
  "help",
  "need help",
  "general problem",
  "test problem",
]);

const frequencyBadge: Record<string, string> = {
  daily: "border-rose-400/60 bg-rose-500/20 text-rose-100",
  weekly: "border-amber-400/60 bg-amber-500/20 text-amber-100",
  monthly: "border-cyan-400/60 bg-cyan-500/20 text-cyan-100",
  occasionally: "border-slate-500/70 bg-slate-700/50 text-slate-100",
  rare: "border-slate-600/70 bg-slate-800/60 text-slate-200",
};

export default function ProblemsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [authors, setAuthors] = useState<Record<string, ProblemAuthor>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [deleteTargetProblem, setDeleteTargetProblem] = useState<Problem | null>(null);
  const [deletingProblem, setDeletingProblem] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedGroup, setAffectedGroup] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [currentWorkaround, setCurrentWorkaround] = useState("");
  const [solutionType, setSolutionType] = useState<SolutionType>("software");
  const [isRealConfirmation, setIsRealConfirmation] = useState(false);
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const fetchProblems = useCallback(async () => {
    const { data: rows } = await supabase
      .from("problems")
      .select(
        "id, user_id, title, description, affected_group, frequency, current_workaround, solution_type, expected_outcome, additional_context, created_at"
      )
      .order("created_at", { ascending: false });
    const nextProblems = (rows as Problem[]) ?? [];
    setProblems(nextProblems);

    const userIds = Array.from(new Set(nextProblems.map((problem) => problem.user_id).filter(Boolean)));
    if (!userIds.length) {
      setAuthors({});
      return;
    }
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const authorMap: Record<string, ProblemAuthor> = {};
    (profileRows as ProblemAuthor[] | null)?.forEach((profile) => {
      if (!profile?.id) return;
      authorMap[profile.id] = profile;
    });
    setAuthors(authorMap);
  }, []);

  const getAuthorDisplayName = useCallback(
    (ownerId: string) => {
      const author = authors[ownerId];
      return author?.username || "Member";
    },
    [authors]
  );

  const sortedProblems = useMemo(
    () =>
      [...problems].sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      }),
    [problems]
  );

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
      await fetchProblems();
      if (!mounted) return;
      setLoading(false);
    };
    initialize();
    return () => {
      mounted = false;
    };
  }, [fetchProblems]);

  const validateForm = () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || !description.trim() || !affectedGroup.trim()) {
      return "Please fill all required fields.";
    }
    if (!currentWorkaround.trim() || !solutionType.trim() || !frequency.trim()) {
      return "Please complete all required fields before submitting.";
    }
    if (normalizedTitle.length < 10) {
      return "Title must be at least 10 characters.";
    }
    if (genericTitleSet.has(normalizedTitle.toLowerCase())) {
      return "Please use a specific, non-generic title.";
    }
    if (!isRealConfirmation) {
      return "You must confirm this is a real-world problem.";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!userId) {
      setMessage("Sign in to submit an open problem.");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSubmitting(true);
    const payload = {
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      affected_group: affectedGroup.trim(),
      frequency,
      current_workaround: currentWorkaround.trim(),
      solution_type: solutionType,
      is_real_confirmation: isRealConfirmation,
      expected_outcome: expectedOutcome.trim() || null,
      additional_context: additionalContext.trim() || null,
    };

    const query = editingProblemId
      ? supabase
          .from("problems")
          .update(payload)
          .eq("id", editingProblemId)
          .eq("user_id", userId)
      : supabase.from("problems").insert(payload);
    const { error } = await query;
    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    await fetchProblems();
    setTitle("");
    setDescription("");
    setAffectedGroup("");
    setFrequency("weekly");
    setCurrentWorkaround("");
    setSolutionType("software");
    setIsRealConfirmation(false);
    setExpectedOutcome("");
    setAdditionalContext("");
    setEditingProblemId(null);
    setMessage(null);
    setSubmitting(false);
    setIsSubmitModalOpen(false);
  };

  const openEditModal = (problem: Problem) => {
    setEditingProblemId(problem.id);
    setTitle(problem.title ?? "");
    setDescription(problem.description ?? "");
    setAffectedGroup(problem.affected_group ?? "");
    setFrequency((problem.frequency as Frequency) ?? "weekly");
    setCurrentWorkaround(problem.current_workaround ?? "");
    setSolutionType((problem.solution_type as SolutionType) ?? "software");
    setIsRealConfirmation(true);
    setExpectedOutcome(problem.expected_outcome ?? "");
    setAdditionalContext(problem.additional_context ?? "");
    setMessage(null);
    setActiveProblem(null);
    setIsSubmitModalOpen(true);
  };

  const requestDeleteProblem = (problem: Problem) => {
    setDeleteTargetProblem(problem);
  };

  const cancelDeleteProblem = () => {
    if (deletingProblem) return;
    setDeleteTargetProblem(null);
  };

  const confirmDeleteProblem = async () => {
    if (!userId || !deleteTargetProblem) return;
    setDeletingProblem(true);
    const { error } = await supabase
      .from("problems")
      .delete()
      .eq("id", deleteTargetProblem.id)
      .eq("user_id", userId);
    if (error) {
      setDeletingProblem(false);
      window.alert(error.message);
      return;
    }
    if (activeProblem?.id === deleteTargetProblem.id) {
      setActiveProblem(null);
    }
    await fetchProblems();
    setDeleteTargetProblem(null);
    setDeletingProblem(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Problem Space</p>
            <h1 className="text-2xl font-semibold">Open Problems</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setEditingProblemId(null);
                setTitle("");
                setDescription("");
                setAffectedGroup("");
                setFrequency("weekly");
                setCurrentWorkaround("");
                setSolutionType("software");
                setIsRealConfirmation(false);
                setExpectedOutcome("");
                setAdditionalContext("");
                setIsSubmitModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
            >
              Share Problem
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Lab
            </Link>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Problems</h2>
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              Loading problems...
            </div>
          ) : sortedProblems.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              No problems submitted yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedProblems.map((problem) => {
                const freqKey = String(problem.frequency ?? "").toLowerCase();
                return (
                  <article
                    key={problem.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-100">{problem.title}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          frequencyBadge[freqKey] ?? "border-slate-600/70 bg-slate-800/60 text-slate-200"
                        }`}
                      >
                        {problem.frequency}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200">
                        {problem.affected_group}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300 [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {problem.description}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      Submitted{" "}
                      {problem.created_at ? new Date(problem.created_at).toLocaleString() : "recently"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      By{" "}
                      <Link
                        href={`/profile/${problem.user_id}`}
                        className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
                      >
                        {getAuthorDisplayName(problem.user_id)}
                      </Link>
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveProblem(problem)}
                        className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                      >
                        View Details
                      </button>
                      <Link
                        href={`/lab/new?problemId=${problem.id}&problemTitle=${encodeURIComponent(problem.title)}`}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        Propose Solution
                      </Link>
                      {problem.user_id === userId && (
                        <button
                          type="button"
                          onClick={() => requestDeleteProblem(problem)}
                          className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Submit Problem</h2>
                <p className="text-xs text-slate-400">Share a structured real-world challenge.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Title *</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Describe the problem clearly (max 120 chars)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Description *</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[110px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Explain the real-world context and impact."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Affected Group *</label>
                <input
                  value={affectedGroup}
                  onChange={(event) => setAffectedGroup(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Who is directly affected?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Frequency *</label>
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as Frequency)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="occasionally">Occasionally</option>
                    <option value="rare">Rare</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Preferred Solution Type *</label>
                  <select
                    value={solutionType}
                    onChange={(event) => setSolutionType(event.target.value as SolutionType)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="software">Software</option>
                    <option value="hardware">Hardware</option>
                    <option value="service">Service</option>
                    <option value="policy">Policy</option>
                    <option value="research">Research</option>
                    <option value="education">Education</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Current Workaround *</label>
                <textarea
                  value={currentWorkaround}
                  onChange={(event) => setCurrentWorkaround(event.target.value)}
                  className="min-h-[88px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="What are people currently doing to cope?"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Expected Outcome (optional)</label>
                <textarea
                  value={expectedOutcome}
                  onChange={(event) => setExpectedOutcome(event.target.value)}
                  className="min-h-[72px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="What should improve if solved?"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Additional Context (optional)</label>
                <textarea
                  value={additionalContext}
                  onChange={(event) => setAdditionalContext(event.target.value)}
                  className="min-h-[72px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="References, constraints, or key details."
                />
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isRealConfirmation}
                  onChange={(event) => setIsRealConfirmation(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-cyan-400"
                />
                <span>I confirm this is a real problem observed in practice. *</span>
              </label>

              {message && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !userId}
                className="inline-flex w-full items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : editingProblemId ? "Update Problem" : "Submit Problem"}
              </button>
              {!userId && <p className="text-xs text-slate-500">Sign in from the main lab page to submit.</p>}
            </form>
          </div>
        </div>
      )}

      {activeProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-100">Problem Details</h2>
              <button
                type="button"
                onClick={() => setActiveProblem(null)}
                className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <p className="text-xs text-slate-400">Title</p>
                <p className="text-base font-semibold text-slate-100">{activeProblem.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    frequencyBadge[String(activeProblem.frequency).toLowerCase()] ??
                    "border-slate-600/70 bg-slate-800/60 text-slate-200"
                  }`}
                >
                  {activeProblem.frequency}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200">
                  {activeProblem.affected_group}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400">Description</p>
                <p className="text-sm text-slate-200">{activeProblem.description}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Current Workaround</p>
                <p className="text-sm text-slate-200">{activeProblem.current_workaround}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Preferred Solution Type</p>
                <p className="text-sm text-slate-200">{activeProblem.solution_type}</p>
              </div>
              {activeProblem.expected_outcome && (
                <div>
                  <p className="text-xs text-slate-400">Expected Outcome</p>
                  <p className="text-sm text-slate-200">{activeProblem.expected_outcome}</p>
                </div>
              )}
              {activeProblem.additional_context && (
                <div>
                  <p className="text-xs text-slate-400">Additional Context</p>
                  <p className="text-sm text-slate-200">{activeProblem.additional_context}</p>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Submitted{" "}
                {activeProblem.created_at
                  ? new Date(activeProblem.created_at).toLocaleString()
                  : "recently"}
              </p>
              <p className="text-xs text-slate-400">
                By{" "}
                <Link
                  href={`/profile/${activeProblem.user_id}`}
                  className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
                >
                  {getAuthorDisplayName(activeProblem.user_id)}
                </Link>
              </p>
              {activeProblem.user_id === userId && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(activeProblem)}
                    className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteProblem(activeProblem)}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
              )}
              <Link
                href={`/lab/new?problemId=${activeProblem.id}&problemTitle=${encodeURIComponent(activeProblem.title)}`}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Propose Solution
              </Link>
            </div>
          </div>
        </div>
      )}

      {deleteTargetProblem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-slate-100">Delete this problem?</h3>
            <p className="mt-3 text-sm text-slate-300">
              This action cannot be undone. The problem and all related submissions will be permanently removed.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelDeleteProblem}
                disabled={deletingProblem}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteProblem()}
                disabled={deletingProblem}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
