"use client";

import { useEffect } from "react";
import Image from "next/image";
import PostComments from "./PostComments";
import { FlaskConical } from "lucide-react";

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
  onAddInsight,
  onEdit,
  canEdit = false,
  onDelete,
  canDelete = false,
}: Props) {
  const bodyText = post?.description ?? post?.problem_statement ?? "No content available.";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !post) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-6xl h-[90vh] bg-[#0B1220] rounded-2xl border border-white/10 shadow-2xl overflow-y-auto">
        <div className="px-12 py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Research Document</p>
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
              className="rounded-full border border-slate-700/80 bg-slate-800/40 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Close
            </button>
          </div>
        </div>
        <div className="px-14 pb-10">
          <div className="max-w-4xl text-[17px] leading-relaxed text-slate-300 space-y-6">
            <section className="space-y-2">
              <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">What is being explored</p>
              <p className="text-slate-200">{bodyText}</p>
            </section>
            {post.theory && (
              <section className="space-y-2">
                <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Core Idea</p>
                <p className="text-slate-200">{post.theory}</p>
              </section>
            )}
            {(post.approach ?? post.explanation) && (
              <section className="space-y-2">
                <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Approach</p>
                <p className="text-slate-200">{post.approach ?? post.explanation}</p>
              </section>
            )}
            {post.observations && (
              <section className="space-y-2">
                <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Observations</p>
                <p className="text-slate-200">{post.observations}</p>
              </section>
            )}
            {post.reflection && (
              <section className="space-y-2">
                <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Reflection</p>
                <p className="text-slate-200">{post.reflection}</p>
              </section>
            )}
            {(post.media_url || post.external_link) && (
              <section className="space-y-3">
                <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Evidence</p>
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
                <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase">Feedback Requested</p>
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
                {onAddInsight && (
                  <button
                    type="button"
                    onClick={onAddInsight}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    Add Insight
                  </button>
                )}
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
        <div className="border-t border-white/10 px-12 py-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 px-6 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

