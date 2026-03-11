"use client";

import Link from "next/link";
import { Lightbulb, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import type { Problem } from "./types";
import ProblemEngagementBar from "./ProblemEngagementBar";

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
  validating: boolean;
  onOpen: () => void;
  onValidate: () => void;
  onAddInsight: () => void;
  onProposeSolution: () => void;
  onEdit?: () => void;
  onDelete: () => void;
};

export default function ProblemCard({
  problem,
  isOwner,
  authorName,
  validating,
  onOpen,
  onValidate,
  onAddInsight,
  onProposeSolution,
  onEdit,
  onDelete,
}: Props) {
  const freqKey = String(problem.frequency ?? "").toLowerCase();
  const createdAtText = problem.created_at ? new Date(problem.created_at).toLocaleDateString() : "Recently";
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-owner-menu]")) return;
      setActionMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <article
      className="flex h-full cursor-pointer flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-cyan-400/35"
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>
              By{" "}
              <Link
                href={`/profile/${problem.user_id}`}
                onClick={(event) => event.stopPropagation()}
                className="font-semibold text-cyan-300 transition hover:text-cyan-100 hover:underline"
              >
                {authorName}
              </Link>
            </span>
            <span className="text-slate-600">/</span>
            <span>{createdAtText}</span>
          </div>
          <h3 className="mt-3 max-w-xl text-lg font-semibold leading-snug text-slate-100">{problem.title}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            frequencyBadge[freqKey] ?? "border-slate-600/70 bg-slate-800/60 text-slate-200"
          }`}
        >
          {problem.frequency}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
          onClick={(event) => event.stopPropagation()}
        >
          {problem.affected_group}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-300 [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
        {problem.description}
      </p>
      <div className="mt-5">
        <ProblemEngagementBar
          validationCount={problem.validation_count ?? 0}
          commentCount={problem.comment_count ?? 0}
          isValidated={!!problem.is_validated}
          validating={validating}
          onValidate={onValidate}
          onAddInsight={onAddInsight}
        />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onProposeSolution();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          Propose Solution
        </button>
        {isOwner && (
          <>
            <div className="relative sm:hidden" data-owner-menu>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActionMenuOpen((prev) => !prev);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 px-3 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                aria-label="Open problem actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {actionMenuOpen && (
                <div className="absolute right-0 top-full z-[70] mt-2 w-36 rounded-2xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
                  {onEdit ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActionMenuOpen(false);
                        onEdit();
                      }}
                      className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
                    >
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionMenuOpen(false);
                      onDelete();
                    }}
                    className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="hidden flex-wrap items-center gap-2 sm:flex">
              {onEdit ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}
                  className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
