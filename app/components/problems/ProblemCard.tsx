"use client";

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import type { Problem } from "./types";

const frequencyBadge: Record<string, string> = {
  daily: "border-rose-400/60 bg-rose-500/20 text-rose-100",
  weekly: "border-amber-400/60 bg-amber-500/20 text-amber-100",
  monthly: "border-cyan-400/60 bg-cyan-500/20 text-cyan-100",
  occasionally: "border-slate-500/70 bg-slate-700/50 text-slate-100",
  rare: "border-slate-600/70 bg-slate-800/60 text-slate-200",
};

type Props = {
  problem: Problem;
  isOwner: boolean;
  authorName: string;
  onOpen: () => void;
  onProposeSolution: () => void;
  onDelete: () => void;
};

export default function ProblemCard({
  problem,
  isOwner,
  authorName,
  onOpen,
  onProposeSolution,
  onDelete,
}: Props) {
  const freqKey = String(problem.frequency ?? "").toLowerCase();

  return (
    <article
      className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-400/40"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
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
        Submitted {problem.created_at ? new Date(problem.created_at).toLocaleString() : "recently"}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        By{" "}
        <Link
          href={`/profile/${problem.user_id}`}
          onClick={(event) => event.stopPropagation()}
          className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
        >
          {authorName}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onProposeSolution();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          Propose Solution
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
