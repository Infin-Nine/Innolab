"use client";

import { FlaskConical, MessageSquare } from "lucide-react";

type Props = {
  validationCount: number;
  commentCount: number;
  isValidated: boolean;
  validating: boolean;
  onValidate: () => void;
  onAddInsight: () => void;
};

export default function ProblemEngagementBar({
  validationCount,
  commentCount,
  isValidated,
  validating,
  onValidate,
  onAddInsight,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={validating}
        onClick={(event) => {
          event.stopPropagation();
          onValidate();
        }}
        className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isValidated
            ? "border-emerald-500/60 bg-emerald-500/16 text-emerald-100"
            : "border-slate-700 bg-slate-950/70 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-100"
        }`}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        {isValidated ? "Validated" : "Validate"}
        <span className="ml-1 rounded-full border border-emerald-500/30 px-2 py-[1px] text-[10px]">
          {validationCount}
        </span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddInsight();
        }}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-700 px-3.5 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Add Insight
        {commentCount > 0 ? (
          <span className="ml-1 rounded-full border border-slate-600 px-2 py-[1px] text-[10px] text-slate-300">
            {commentCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
