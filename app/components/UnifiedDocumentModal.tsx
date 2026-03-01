"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import PostComments from "./PostComments";
import { FlaskConical, Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type ModalPost = {
  id: string;
  user_id: string;
  title: string | null;
  description?: string | null;
  problem_statement?: string | null;
  theory?: string | null;
  explanation?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  feedback_needed?: string[] | string | null;
  external_link?: string | null;
  media_url?: string | null;
  wip_status?: string | null;
  created_at?: string | null;
};

type Props = {
  open: boolean;
  post: ModalPost | null;
  onClose: () => void;
  statusClassName?: string;
  authorName?: string | null;
  onValidate?: () => void;
  isValidated?: boolean;
  validateCount?: number;
  onAddInsight?: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
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

export default function UnifiedDocumentModal({
  open,
  post,
  onClose,
  statusClassName,
  authorName,
  onValidate,
  isValidated = false,
  validateCount,
  onEdit,
  canEdit = false,
  onDelete,
  canDelete = false,
}: Props) {
  const bodyText = post?.description ?? post?.problem_statement ?? "No content available.";
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightType, setInsightType] = useState("Suggest Improvement");
  const [insightText, setInsightText] = useState("");
  const [insightSubmitting, setInsightSubmitting] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightUserId, setInsightUserId] = useState<string | null>(null);
  const insightTypes = [
    "Suggest Improvement",
    "Identify Flaw",
    "Provide Resource",
    "Validate Approach",
    "Offer Collaboration",
  ] as const;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => setInsightUserId(data.user?.id ?? null));
  }, [open]);

  if (!open || !post) return null;

  const submitInsight = async () => {
    if (!insightUserId || !insightText.trim() || insightSubmitting) return;
    setInsightSubmitting(true);
    setInsightError(null);
    const content = `[${insightType}] ${insightText.trim()}`;
    const { data, error } = await supabase
      .from("solutions")
      .insert({ post_id: post.id, user_id: insightUserId, content })
      .select("id, post_id, user_id, content, created_at")
      .single();
    if (error) {
      setInsightError(error.message || "Failed to submit insight.");
      setInsightSubmitting(false);
      return;
    }
    window.dispatchEvent(new CustomEvent("solutions:inserted", { detail: data }));
    setInsightSubmitting(false);
    setInsightText("");
    setInsightType("Suggest Improvement");
    setInsightOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-[700px] max-h-[90vh] flex flex-col bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl">
        <div className="px-4 py-4 md:px-6 md:py-6 border-b border-white/10 md:border-b-0">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-cyan-300">Experiment Log</p>
              <p className="mt-2 text-xl md:text-2xl font-semibold text-white">{post.title ?? "Untitled Experiment"}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                {post.wip_status && (
                  <span
                    className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
                      statusClassName ?? "border-slate-700 text-slate-200"
                    }`}
                  >
                    {post.wip_status}
                  </span>
                )}
                <span>{post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}</span>
                {authorName && <span className="text-cyan-200">{authorName}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800/40 text-slate-200 transition hover:border-slate-500"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6 md:pb-8 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-[700px] text-[16px] leading-[1.7] text-slate-300 space-y-8">
            <section className="space-y-2">
              <p className="text-sm font-medium text-slate-400">Problem</p>
              <p className="text-slate-200 whitespace-pre-wrap [word-break:break-word]">{bodyText}</p>
            </section>
            {post.theory && (
              <section className="space-y-2">
                <p className="text-sm font-medium text-slate-400">Context</p>
                <p className="text-slate-200 whitespace-pre-wrap [word-break:break-word]">{post.theory}</p>
              </section>
            )}
            {(post.approach ?? post.explanation) && (
              <section className="space-y-2">
                <p className="text-sm font-medium text-slate-400">My Approach</p>
                <p className="text-slate-200 whitespace-pre-wrap [word-break:break-word]">
                  {post.approach ?? post.explanation}
                </p>
              </section>
            )}
            {post.observations && (
              <section className="space-y-2">
                <p className="text-sm font-medium text-slate-400">Progress</p>
                <p className="text-slate-200 whitespace-pre-wrap [word-break:break-word]">{post.observations}</p>
              </section>
            )}
            {post.reflection && (
              <section className="space-y-2">
                <p className="text-sm font-medium text-slate-400">Notes</p>
                <p className="text-slate-200 whitespace-pre-wrap [word-break:break-word]">{post.reflection}</p>
              </section>
            )}
            {(post.media_url || post.external_link) && (
              <section className="space-y-3">
                <p className="text-sm font-medium text-slate-400">Evidence</p>
                {post.media_url && (
                  <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <div className="relative aspect-[16/9] max-h-96 w-full">
                      <Image
                        src={post.media_url}
                        alt="Experiment evidence"
                        className="object-cover"
                        fill
                        sizes="(max-width: 768px) 100vw, 768px"
                      />
                    </div>
                  </div>
                )}
                {post.external_link && (
                  <a
                    href={post.external_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                  >
                    {post.external_link}
                  </a>
                )}
              </section>
            )}
            {normalizeFeedback(post.feedback_needed).length > 0 && (
              <section className="space-y-3">
                <p className="text-sm font-medium text-slate-400">Need Feedback</p>
                <div className="flex flex-wrap gap-2">
                  {normalizeFeedback(post.feedback_needed).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
            <div className="border-t border-white/10 pt-8">
              <div className="flex flex-wrap items-center gap-3">
                {typeof validateCount === "number" && onValidate && (
                  <button
                    type="button"
                    onClick={onValidate}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      isValidated
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                        : "border-slate-700 bg-slate-950/70 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-100"
                    }`}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Validate
                    <span className="ml-1 rounded-full border border-emerald-500/30 px-2 py-[1px] text-[10px]">
                      {validateCount}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setInsightError(null);
                    setInsightOpen(true);
                  }}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  Add Insight
                </button>
                {canEdit && onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Edit
                  </button>
                )}
                {canDelete && onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <div className="mt-0">
              <PostComments
                postId={post.id}
                postOwnerId={post.user_id}
                compactSpacing
                showInlineAddButton={false}
              />
            </div>
          </div>
        </div>
        {insightOpen && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Add Insight</p>
                  <p className="mt-1 text-sm text-slate-300">Share a concise, constructive research insight</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (insightSubmitting) return;
                    setInsightOpen(false);
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                  aria-label="Close add insight"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {insightTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInsightType(type)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      insightType === type
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                        : "border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <textarea
                value={insightText}
                onChange={(e) => setInsightText(e.target.value)}
                className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="Write your insight..."
              />
              {insightError && (
                <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {insightError}
                </div>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (insightSubmitting) return;
                    setInsightOpen(false);
                  }}
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitInsight()}
                  disabled={!insightText.trim() || !insightUserId || insightSubmitting}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {insightSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

