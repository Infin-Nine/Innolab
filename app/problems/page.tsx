"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { useLoginModal } from "../contexts/LoginModalContext";
import CreatePost from "../components/CreatePost";
import ProblemCard from "../components/problems/ProblemCard";
import ProblemDetailModal from "../components/problems/ProblemDetailModal";
import type { Frequency, Problem, SolutionType } from "../components/problems/types";

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

export default function ProblemsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const { openLoginModal } = useLoginModal();
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
  const [isCreateExperimentOpen, setIsCreateExperimentOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [validatingProblemId, setValidatingProblemId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedGroup, setAffectedGroup] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [currentWorkaround, setCurrentWorkaround] = useState("");
  const [solutionType, setSolutionType] = useState<SolutionType>("software");
  const [isRealConfirmation, setIsRealConfirmation] = useState(false);
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const fetchProblems = useCallback(async (viewerId?: string | null) => {
    const { data: rows } = await supabase
      .from("problems")
      .select(
        "id, user_id, title, description, affected_group, frequency, current_workaround, solution_type, expected_outcome, additional_context, created_at"
      )
      .order("created_at", { ascending: false });
    const nextProblems = ((rows as Problem[]) ?? []).map((problem) => ({
      ...problem,
      validation_count: 0,
      comment_count: 0,
      is_validated: false,
    }));

    const userIds = Array.from(new Set(nextProblems.map((problem) => problem.user_id).filter(Boolean)));
    if (!userIds.length) {
      setAuthors({});
    } else {
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
    }

    const problemIds = nextProblems.map((problem) => problem.id);
    if (!problemIds.length) {
      setProblems(nextProblems);
      return;
    }

    const [{ data: validationRows }, { data: commentRows }, { data: userValidationRows }] = await Promise.all([
      supabase.from("problem_validations").select("problem_id").in("problem_id", problemIds),
      supabase.from("problem_comments").select("problem_id").in("problem_id", problemIds),
      viewerId
        ? supabase
            .from("problem_validations")
            .select("problem_id")
            .in("problem_id", problemIds)
            .eq("user_id", viewerId)
        : Promise.resolve({ data: [] as Array<{ problem_id: string }> }),
    ]);

    const validationCounts = new Map<string, number>();
    ((validationRows as Array<{ problem_id: string }> | null) ?? []).forEach((row) => {
      validationCounts.set(row.problem_id, (validationCounts.get(row.problem_id) ?? 0) + 1);
    });

    const commentCounts = new Map<string, number>();
    ((commentRows as Array<{ problem_id: string }> | null) ?? []).forEach((row) => {
      commentCounts.set(row.problem_id, (commentCounts.get(row.problem_id) ?? 0) + 1);
    });

    const validatedProblemIds = new Set(
      ((userValidationRows as Array<{ problem_id: string }> | null) ?? []).map((row) => row.problem_id)
    );

    setProblems(
      nextProblems.map((problem) => ({
        ...problem,
        validation_count: validationCounts.get(problem.id) ?? 0,
        comment_count: commentCounts.get(problem.id) ?? 0,
        is_validated: validatedProblemIds.has(problem.id),
      }))
    );
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
      const nextUserId = data.session?.user.id ?? null;
      setUserId(nextUserId);
      await fetchProblems(nextUserId);
      if (!mounted) return;
      setLoading(false);
    };
    initialize();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      setUserId(nextUserId);
      void fetchProblems(nextUserId);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [fetchProblems]);

  const updateProblemStats = useCallback(
    (problemId: string, stats: { validationCount?: number; commentCount?: number; isValidated?: boolean }) => {
      setProblems((prev) =>
        prev.map((problem) =>
          problem.id === problemId
            ? {
                ...problem,
                validation_count: stats.validationCount ?? problem.validation_count ?? 0,
                comment_count: stats.commentCount ?? problem.comment_count ?? 0,
                is_validated: stats.isValidated ?? problem.is_validated ?? false,
              }
            : problem
        )
      );
      setActiveProblem((prev) =>
        prev && prev.id === problemId
          ? {
              ...prev,
              validation_count: stats.validationCount ?? prev.validation_count ?? 0,
              comment_count: stats.commentCount ?? prev.comment_count ?? 0,
              is_validated: stats.isValidated ?? prev.is_validated ?? false,
            }
          : prev
      );
    },
    []
  );

  const handleValidate = useCallback(
    async (problemId: string) => {
      if (validatingProblemId === problemId) {
        return;
      }

      if (!userId) {
        openLoginModal();
        return;
      }

      setValidatingProblemId(problemId);
      const currentProblem = problems.find((problem) => problem.id === problemId);
      const currentValidated = !!currentProblem?.is_validated;
      const currentCount = currentProblem?.validation_count ?? 0;
      const optimisticValidated = !currentValidated;
      const optimisticCount = Math.max(0, currentCount + (currentValidated ? -1 : 1));

      updateProblemStats(problemId, {
        validationCount: optimisticCount,
        isValidated: optimisticValidated,
      });

      if (currentValidated) {
        const { error } = await supabase
          .from("problem_validations")
          .delete()
          .eq("problem_id", problemId)
          .eq("user_id", userId);

        if (error) {
          updateProblemStats(problemId, {
            validationCount: currentCount,
            isValidated: currentValidated,
          });
          window.alert(error.message ?? "Unable to update validation.");
          setValidatingProblemId(null);
          return;
        }
      } else {
        const { error } = await supabase
          .from("problem_validations")
          .insert({ problem_id: problemId, user_id: userId });

        if (error) {
          updateProblemStats(problemId, {
            validationCount: currentCount,
            isValidated: currentValidated,
          });
          window.alert(error.message ?? "Unable to update validation.");
          setValidatingProblemId(null);
          return;
        }
      }

      const { data } = await supabase
        .from("problem_validations")
        .select("id")
        .eq("problem_id", problemId)
        .eq("user_id", userId)
        .maybeSingle();

      updateProblemStats(problemId, {
        validationCount: optimisticCount,
        isValidated: !!data?.id,
      });
      setValidatingProblemId(null);
    },
    [openLoginModal, problems, updateProblemStats, userId, validatingProblemId]
  );

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
      openLoginModal();
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
    if (!deleteTargetProblem) return;
    if (!userId) {
      openLoginModal(() => void confirmDeleteProblem());
      return;
    }
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

  const selectedProblemTitle = useMemo(() => {
    if (!selectedProblemId) return null;
    return problems.find((problem) => problem.id === selectedProblemId)?.title ?? null;
  }, [problems, selectedProblemId]);

  const openCreateExperiment = (problemId: string) => {
    if (!userId) {
      router.push("/login");
      return;
    }
    setSelectedProblemId(problemId);
    setActiveProblem(null);
    setIsCreateExperimentOpen(true);
  };

  return (
    <DashboardLayout activeItem="problems">
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Open Problems</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Discover real-world problems people face. Validate them, discuss insights, and build solutions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!userId) {
                openLoginModal(() => {
                  setIsSubmitModalOpen(true);
                });
                return;
              }
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
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            Share Problem
          </button>
        </header>

        <section className="mx-auto max-w-[1040px] space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              Loading problems...
            </div>
          ) : sortedProblems.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              No problems submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortedProblems.map((problem) => {
                return (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    isOwner={problem.user_id === userId}
                    authorName={getAuthorDisplayName(problem.user_id)}
                    validating={validatingProblemId === problem.id}
                    onOpen={() => setActiveProblem(problem)}
                    onValidate={() => void handleValidate(problem.id)}
                    onAddInsight={() => setActiveProblem(problem)}
                    onProposeSolution={() => openCreateExperiment(problem.id)}
                    onEdit={() => openEditModal(problem)}
                    onDelete={() => requestDeleteProblem(problem)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </section>

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
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : editingProblemId ? "Update Problem" : "Submit Problem"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ProblemDetailModal
        problem={activeProblem}
        isOwner={!!(activeProblem && activeProblem.user_id === userId)}
        isAuthenticated={!!userId}
        userId={userId}
        authorName={activeProblem ? getAuthorDisplayName(activeProblem.user_id) : "Member"}
        onClose={() => setActiveProblem(null)}
        onEdit={() => activeProblem && openEditModal(activeProblem)}
        onDelete={() => activeProblem && requestDeleteProblem(activeProblem)}
        onProposeSolution={() => activeProblem && openCreateExperiment(activeProblem.id)}
        onRequireAuth={() => openLoginModal()}
        onProblemStatsChange={updateProblemStats}
      />

      <CreatePost
        isOpen={isCreateExperimentOpen}
        onClose={() => {
          setIsCreateExperimentOpen(false);
          setSelectedProblemId(null);
        }}
        linkedProblemId={selectedProblemId}
        linkedProblemTitle={selectedProblemTitle}
      />

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
    </DashboardLayout>
  );
}
