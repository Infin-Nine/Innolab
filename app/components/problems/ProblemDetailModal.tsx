"use client";

import Link from "next/link";
import { Lightbulb, X } from "lucide-react";
import type { Problem } from "./types";
import ProblemDiscussionSection from "./ProblemDiscussionSection";

const frequencyBadge: Record<string, string> = {
  daily: "border-rose-400/60 bg-rose-500/20 text-rose-100",
  weekly: "border-amber-400/60 bg-amber-500/20 text-amber-100",
  monthly: "border-cyan-400/60 bg-cyan-500/20 text-cyan-100",
  occasionally: "border-slate-500/70 bg-slate-700/50 text-slate-100",
  rare: "border-slate-600/70 bg-slate-800/60 text-slate-200",
};

type Props = {
  problem: Problem | null;
  isOwner: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  authorName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onProposeSolution: () => void;
  onRequireAuth: () => void;
  onProblemStatsChange?: (
    problemId: string,
    stats: { validationCount?: number; commentCount?: number; isValidated?: boolean }
  ) => void;
};

export default function ProblemDetailModal({
  problem,
  isOwner,
  isAuthenticated,
  userId,
  authorName,
  onClose,
  onEdit,
  onDelete,
  onProposeSolution,
  onRequireAuth,
  onProblemStatsChange,
}: Props) {
  if (!problem) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Problem Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <p className="text-xs text-slate-400">Title</p>
            <p className="text-base font-semibold text-slate-100">{problem.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                frequencyBadge[String(problem.frequency).toLowerCase()] ??
                "border-slate-600/70 bg-slate-800/60 text-slate-200"
              }`}
            >
              {problem.frequency}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-200">
              {problem.affected_group}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400">Description</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">
              {problem.description}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Workaround</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">
              {problem.current_workaround}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Preferred Solution Type</p>
            <p className="text-sm text-slate-200">{problem.solution_type}</p>
          </div>
          {problem.expected_outcome && (
            <div>
              <p className="text-xs text-slate-400">Expected Outcome</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">
                {problem.expected_outcome}
              </p>
            </div>
          )}
          {problem.additional_context && (
            <div>
              <p className="text-xs text-slate-400">Additional Context</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">
                {problem.additional_context}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Submitted {problem.created_at ? new Date(problem.created_at).toLocaleString() : "recently"}
          </p>
          <p className="text-xs text-slate-400">
            By{" "}
            <Link
              href={`/profile/${problem.user_id}`}
              className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
            >
              {authorName}
            </Link>
          </p>

          {!isAuthenticated && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Sign in to propose a solution.
            </p>
          )}

          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onProposeSolution}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Propose Solution
          </button>

          <ProblemDiscussionSection
            problemId={problem.id}
            userId={userId}
            initialValidationCount={problem.validation_count ?? 0}
            initialCommentCount={problem.comment_count ?? 0}
            initialIsValidated={!!problem.is_validated}
            onRequireAuth={onRequireAuth}
            onStatsChange={(stats) => onProblemStatsChange?.(problem.id, stats)}
          />
        </div>
      </div>
    </div>
  );
}
