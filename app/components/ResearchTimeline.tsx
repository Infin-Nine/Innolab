"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { MoreHorizontal } from "lucide-react";
import { useEdit } from "../contexts/EditExperimentContext";
import UnifiedDocumentModal from "./UnifiedDocumentModal";
import { useFeedbackSheet } from "../contexts/FeedbackSheetContext";
import { useLoginModal } from "../contexts/LoginModalContext";
import CreatePost from "./CreatePost";

type WipStatus =
  | "idea"
  | "prototype"
  | "built"
  | "wip"
  | "failed"
  | "exploring"
  | "testing"
  | "completed";
type Frequency = "daily" | "weekly" | "monthly" | "occasionally" | "rare";
type SolutionType = "software" | "hardware" | "service" | "policy" | "research" | "education";
type TimelineType = "experiments" | "problems";

type Post = {
  id: string;
  user_id: string;
  title: string | null;
  problem_statement: string | null;
  theory?: string | null;
  explanation?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  feedback_needed?: string[] | string | null;
  external_link?: string | null;
  media_url?: string | null;
  wip_status: WipStatus | null;
  created_at: string | null;
};

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
  created_at: string | null;
};

type ProblemDraft = {
  title: string;
  description: string;
  affected_group: string;
  frequency: Frequency;
  current_workaround: string;
  solution_type: SolutionType;
  expected_outcome: string;
  additional_context: string;
};

type Props = {
  userId: string;
  currentUserId?: string | null;
  initialPosts?: Post[];
  showAuthor?: boolean;
  authorName?: string | null;
  onCountChange?: (n: number) => void;
  compact?: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

const badgeStyles: Record<WipStatus, string> = {
  idea: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
  exploring: "bg-sky-500/20 text-sky-200 border-sky-500/40",
  prototype: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  testing: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  failed: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  built: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  wip: "bg-sky-500/20 text-sky-200 border-sky-500/40",
};

const toDraft = (p: Problem): ProblemDraft => ({
  title: p.title ?? "",
  description: p.description ?? "",
  affected_group: p.affected_group ?? "",
  frequency: (p.frequency as Frequency) ?? "weekly",
  current_workaround: p.current_workaround ?? "",
  solution_type: (p.solution_type as SolutionType) ?? "software",
  expected_outcome: p.expected_outcome ?? "",
  additional_context: p.additional_context ?? "",
});

type ProblemCardProps = {
  problem: Problem;
  compact: boolean;
  isOwner: boolean;
  actionMenuOpen: boolean;
  onOpen: () => void;
  onToggleActionMenu: () => void;
  onEdit: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onDelete: (event: ReactMouseEvent<HTMLButtonElement>) => void;
};

function ProblemCard({
  problem,
  compact,
  isOwner,
  actionMenuOpen,
  onOpen,
  onToggleActionMenu,
  onEdit,
  onDelete,
}: ProblemCardProps) {
  const dateText = problem.created_at ? new Date(problem.created_at).toLocaleDateString() : "Recently";
  const desc = problem.description.length > 140 ? `${problem.description.slice(0, 140)}...` : problem.description;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      className={`items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 ${compact ? "flex flex-col p-4" : "grid grid-cols-[120px_1fr] p-4"}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      style={{ cursor: "pointer" }}
    >
      <div className="text-xs text-slate-400">{dateText}</div>
      <div className="w-full text-sm text-slate-200">
        <p className="font-semibold text-slate-100">{problem.title}</p>
        <p className="mt-1 text-slate-300 whitespace-pre-wrap [word-break:break-word]">{desc}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
            PROBLEM
          </span>
          {isOwner &&
            (compact ? (
              <div className="relative ml-auto" data-owner-menu>
                <button
                  type="button"
                  onClick={onToggleActionMenu}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 px-3 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {actionMenuOpen && (
                  <div className="absolute right-0 bottom-full z-[70] mb-2 w-36 rounded-2xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
                    <button type="button" onClick={onEdit} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-slate-100 transition hover:bg-slate-800">
                      Edit
                    </button>
                    <button type="button" onClick={onDelete} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button type="button" onClick={onEdit} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20">
                  Edit
                </button>
                <button type="button" onClick={onDelete} className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20">
                  Delete
                </button>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}

type ProblemDetailModalProps = {
  open: boolean;
  problem: Problem | null;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onProposeSolution: () => void;
};

function ProblemDetailModal({
  open,
  problem,
  isOwner,
  onClose,
  onEdit,
  onDelete,
  onProposeSolution,
}: ProblemDetailModalProps) {
  if (!open || !problem) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-100">Problem Details</h3>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
            Close
          </button>
        </div>
        <div className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5">
          <div><p className="text-xs text-slate-400">Problem Title</p><p className="text-base font-semibold text-slate-100">{problem.title}</p></div>
          <div><p className="text-xs text-slate-400">Problem Description</p><p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">{problem.description}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs text-slate-400">Domain / Category</p><p className="text-sm text-slate-200">{problem.affected_group || "Not specified"}</p></div>
            <div><p className="text-xs text-slate-400">Frequency</p><p className="text-sm text-slate-200">{problem.frequency || "Not specified"}</p></div>
          </div>
          <div><p className="text-xs text-slate-400">Existing Attempts / Context</p><p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">{problem.current_workaround || "Not specified"}</p></div>
          <div><p className="text-xs text-slate-400">Preferred Solution Type</p><p className="text-sm text-slate-200">{problem.solution_type || "Not specified"}</p></div>
          <div><p className="text-xs text-slate-400">Impact / Why this problem matters</p><p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">{problem.expected_outcome || "Not specified"}</p></div>
          <div><p className="text-xs text-slate-400">Additional Context / Tags</p><p className="text-sm text-slate-200 whitespace-pre-wrap [word-break:break-word]">{problem.additional_context || "Not specified"}</p></div>
          <p className="text-xs text-slate-400">Date: {problem.created_at ? new Date(problem.created_at).toLocaleString() : "Recently"}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button type="button" onClick={onProposeSolution} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20">
              Propose Solution
            </button>
            {isOwner && (
              <>
                <button type="button" onClick={onEdit} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20">Edit</button>
                <button type="button" onClick={onDelete} className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20">Delete</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type FullProblemEditModalProps = {
  open: boolean;
  draft: ProblemDraft;
  message: string | null;
  saving: boolean;
  onChange: (next: Partial<ProblemDraft>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

function FullProblemEditModal({ open, draft, message, saving, onChange, onClose, onSubmit }: FullProblemEditModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-100">Edit Problem</h3>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100">Close</button>
        </div>
        <form onSubmit={onSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1"><label className="text-xs text-slate-400">Problem Title *</label><input value={draft.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
          <div className="space-y-1"><label className="text-xs text-slate-400">Problem Description *</label><textarea value={draft.description} onChange={(e) => onChange({ description: e.target.value })} className="min-h-[110px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
          <div className="space-y-1"><label className="text-xs text-slate-400">Domain / Category *</label><input value={draft.affected_group} onChange={(e) => onChange({ affected_group: e.target.value })} className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1"><label className="text-xs text-slate-400">Frequency *</label><select value={draft.frequency} onChange={(e) => onChange({ frequency: e.target.value as Frequency })} className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="occasionally">Occasionally</option><option value="rare">Rare</option></select></div>
            <div className="space-y-1"><label className="text-xs text-slate-400">Preferred Solution Type *</label><select value={draft.solution_type} onChange={(e) => onChange({ solution_type: e.target.value as SolutionType })} className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"><option value="software">Software</option><option value="hardware">Hardware</option><option value="service">Service</option><option value="policy">Policy</option><option value="research">Research</option><option value="education">Education</option></select></div>
          </div>
          <div className="space-y-1"><label className="text-xs text-slate-400">Existing Attempts / Context *</label><textarea value={draft.current_workaround} onChange={(e) => onChange({ current_workaround: e.target.value })} className="min-h-[88px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
          <div className="space-y-1"><label className="text-xs text-slate-400">Impact / Why this problem matters</label><textarea value={draft.expected_outcome} onChange={(e) => onChange({ expected_outcome: e.target.value })} className="min-h-[72px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
          <div className="space-y-1"><label className="text-xs text-slate-400">Additional Context / Tags</label><textarea value={draft.additional_context} onChange={(e) => onChange({ additional_context: e.target.value })} className="min-h-[72px] w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
          {message && <p className="text-xs text-rose-300">{message}</p>}
          <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResearchTimeline({
  userId,
  currentUserId,
  initialPosts,
  showAuthor = false,
  authorName,
  onCountChange,
  compact = false,
}: Props) {
  const [timelineType, setTimelineType] = useState<TimelineType>("experiments");
  const [posts, setPosts] = useState<Post[]>(initialPosts ?? []);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(!initialPosts);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [activeValidateCount, setActiveValidateCount] = useState(0);
  const [activeIsValidated, setActiveIsValidated] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: TimelineType } | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [actionMenuKey, setActionMenuKey] = useState<string | null>(null);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [problemDraft, setProblemDraft] = useState<ProblemDraft>({
    title: "",
    description: "",
    affected_group: "",
    frequency: "weekly",
    current_workaround: "",
    solution_type: "software",
    expected_outcome: "",
    additional_context: "",
  });
  const [problemFormMessage, setProblemFormMessage] = useState<string | null>(null);
  const [savingProblem, setSavingProblem] = useState(false);
  const [isCreateExperimentOpen, setIsCreateExperimentOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblemTitle, setSelectedProblemTitle] = useState<string | null>(null);
  const { openEdit } = useEdit();
  const { open: openFeedback } = useFeedbackSheet();
  const { openLoginModal } = useLoginModal();
  const isOwnerUser = (ownerId: string) => currentUserId === ownerId;

  useEffect(() => {
    let mounted = true;
    const fetchExperiments = async () => {
      if (initialPosts) {
        if (!mounted) return;
        setPosts(initialPosts);
        onCountChange?.(initialPosts.length);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("posts")
        .select("id,user_id,title,problem_statement,theory,explanation,approach,observations,reflection,feedback_needed,external_link,media_url,wip_status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      const next = (data as Post[]) ?? [];
      setPosts(next);
      onCountChange?.(next.length);
      setLoading(false);
    };
    const fetchProblems = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("problems")
        .select("id,user_id,title,description,affected_group,frequency,current_workaround,solution_type,expected_outcome,additional_context,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      const next = (data as Problem[]) ?? [];
      setProblems(next);
      onCountChange?.(next.length);
      setLoading(false);
    };
    if (timelineType === "experiments") void fetchExperiments();
    else void fetchProblems();
    return () => {
      mounted = false;
    };
  }, [timelineType, userId, initialPosts, onCountChange]);

  useEffect(() => {
    const handler = (event: Event) => {
      const ce = event as CustomEvent<{ id: string; payload: Partial<Post> }>;
      const { id, payload } = ce.detail ?? {};
      if (!id) return;
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id
            ? {
                ...post,
                title: (payload.title as string | null) ?? post.title,
                wip_status: (payload.wip_status as WipStatus | null) ?? post.wip_status,
                problem_statement: (payload.problem_statement as string | null) ?? post.problem_statement,
              }
            : post
        )
      );
    };
    if (typeof window === "undefined") return;
    window.addEventListener("experiment:updated", handler as EventListener);
    return () => window.removeEventListener("experiment:updated", handler as EventListener);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-owner-menu]")) return;
      setActionMenuKey(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!activePostId) {
        setActiveValidateCount(0);
        setActiveIsValidated(false);
        return;
      }
      const { data } = await supabase.from("validations").select("user_id").eq("post_id", activePostId);
      if (!active) return;
      const rows = (data as { user_id: string }[] | null) ?? [];
      setActiveValidateCount(rows.length);
      setActiveIsValidated(!!currentUserId && rows.some((r) => r.user_id === currentUserId));
    };
    void run();
    return () => {
      active = false;
    };
  }, [activePostId, currentUserId]);

  const activePost = useMemo(() => posts.find((p) => p.id === activePostId) ?? null, [posts, activePostId]);
  const activeProblem = useMemo(() => problems.find((p) => p.id === activeProblemId) ?? null, [problems, activeProblemId]);
  const excerpt = (value: string, limit: number) => (value.length > limit ? `${value.slice(0, limit)}...` : value);

  const handleToggleValidate = async () => {
    if (!activePost) return;
    if (!currentUserId) {
      openLoginModal(() => void handleToggleValidate());
      return;
    }
    if (activeIsValidated) {
      const { error } = await supabase.from("validations").delete().eq("post_id", activePost.id).eq("user_id", currentUserId);
      if (!error) {
        setActiveIsValidated(false);
        setActiveValidateCount((prev) => Math.max(0, prev - 1));
      }
      return;
    }
    const { error } = await supabase.from("validations").insert({ post_id: activePost.id, user_id: currentUserId });
    if (!error) {
      setActiveIsValidated(true);
      setActiveValidateCount((prev) => prev + 1);
    }
  };

  const openEditProblem = (problem: Problem) => {
    setActiveProblemId(null);
    setProblemFormMessage(null);
    setEditingProblemId(problem.id);
    setProblemDraft(toDraft(problem));
  };

  const submitProblemEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingProblemId) return;
    if (!currentUserId) {
      openLoginModal();
      return;
    }
    const t = problemDraft.title.trim();
    const d = problemDraft.description.trim();
    const g = problemDraft.affected_group.trim();
    const w = problemDraft.current_workaround.trim();
    if (!t || !d || !g || !w) {
      setProblemFormMessage("Please complete all required fields.");
      return;
    }
    setSavingProblem(true);
    setProblemFormMessage(null);
    const { error } = await supabase
      .from("problems")
      .update({
        title: t,
        description: d,
        affected_group: g,
        frequency: problemDraft.frequency,
        current_workaround: w,
        solution_type: problemDraft.solution_type,
        expected_outcome: problemDraft.expected_outcome.trim() || null,
        additional_context: problemDraft.additional_context.trim() || null,
      })
      .eq("id", editingProblemId)
      .eq("user_id", currentUserId);
    if (error) {
      setProblemFormMessage(error.message);
      setSavingProblem(false);
      return;
    }
    setProblems((prev) =>
      prev.map((p) =>
        p.id === editingProblemId
          ? { ...p, title: t, description: d, affected_group: g, frequency: problemDraft.frequency, current_workaround: w, solution_type: problemDraft.solution_type, expected_outcome: problemDraft.expected_outcome.trim() || null, additional_context: problemDraft.additional_context.trim() || null }
          : p
      )
    );
    setSavingProblem(false);
    setEditingProblemId(null);
  };

  const requestDelete = (id: string, type: TimelineType) => {
    setDeleteTarget({ id, type });
    setActionMenuKey(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!currentUserId) {
      openLoginModal(() => void confirmDelete());
      return;
    }
    setDeletingItem(true);
    if (deleteTarget.type === "experiments") {
      const { error } = await supabase.from("posts").delete().eq("id", deleteTarget.id).eq("user_id", currentUserId);
      if (error) return void setDeletingItem(false);
      setPosts((prev) => {
        const next = prev.filter((p) => p.id !== deleteTarget.id);
        onCountChange?.(next.length);
        return next;
      });
      setActivePostId((prev) => (prev === deleteTarget.id ? null : prev));
    } else {
      const { error } = await supabase.from("problems").delete().eq("id", deleteTarget.id).eq("user_id", currentUserId);
      if (error) return void setDeletingItem(false);
      setProblems((prev) => {
        const next = prev.filter((p) => p.id !== deleteTarget.id);
        onCountChange?.(next.length);
        return next;
      });
      setActiveProblemId((prev) => (prev === deleteTarget.id ? null : prev));
    }
    setDeleteTarget(null);
    setDeletingItem(false);
  };

  const openCreateExperiment = (problem: Problem) => {
    const openModal = () => {
      setSelectedProblemId(problem.id);
      setSelectedProblemTitle(problem.title);
      setActiveProblemId(null);
      setIsCreateExperimentOpen(true);
    };
    if (!currentUserId) return openLoginModal(openModal);
    openModal();
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex w-fit items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
          <button type="button" onClick={() => setTimelineType("experiments")} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${timelineType === "experiments" ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-100" : "border border-transparent text-slate-300 hover:text-slate-100"}`}>Experiments</button>
          <button type="button" onClick={() => setTimelineType("problems")} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${timelineType === "problems" ? "border border-amber-500/40 bg-amber-500/20 text-amber-100" : "border border-transparent text-slate-300 hover:text-slate-100"}`}>Problems</button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/50 border-t-transparent" />
            {timelineType === "experiments" ? "Loading experiments..." : "Loading problems..."}
          </div>
        ) : timelineType === "experiments" ? (
          posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center"><p className="text-base font-semibold text-slate-100">No experiments yet.</p></div>
          ) : (
            posts.map((post) => {
              const dateText = post.created_at ? new Date(post.created_at).toLocaleDateString() : "Recently";
              const desc = excerpt(post.problem_statement ?? "", 140);
              const actionKey = `experiments:${post.id}`;
              return (
                <div key={post.id} className={`items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 ${compact ? "flex flex-col p-4" : "grid grid-cols-[120px_1fr] p-4"}`} role="button" tabIndex={0} onClick={() => setActivePostId(post.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setActivePostId(post.id); }} style={{ cursor: "pointer" }}>
                  <div className="text-xs text-slate-400">{dateText}</div>
                  <div className="w-full text-sm text-slate-200">
                    <p className="font-semibold text-slate-100">{post.title ?? "Untitled Experiment"}</p>
                    {post.problem_statement && <p className="mt-1 whitespace-pre-wrap text-slate-300 [word-break:break-word]">{desc}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeStyles.prototype}`}>PROTOTYPE</span>
                      {showAuthor && authorName && <span className="text-xs text-slate-400">by {authorName}</span>}
                      {isOwnerUser(post.user_id) &&
                        (compact ? (
                          <div className="relative ml-auto" data-owner-menu>
                            <button type="button" onClick={() => setActionMenuKey((prev) => (prev === actionKey ? null : actionKey))} className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 px-3 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"><MoreHorizontal className="h-4 w-4" /></button>
                            {actionMenuKey === actionKey && (
                              <div className="absolute right-0 bottom-full z-[70] mb-2 w-36 rounded-2xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
                                <button type="button" onClick={() => openEdit(post.id)} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-slate-100 transition hover:bg-slate-800">Edit</button>
                                <button type="button" onClick={() => requestDelete(post.id, "experiments")} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10">Delete</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <button type="button" onClick={() => openEdit(post.id)} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20">Edit</button>
                            <button type="button" onClick={() => requestDelete(post.id, "experiments")} className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20">Delete</button>
                          </>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center"><p className="text-base font-semibold text-slate-100">No problems shared yet.</p></div>
        ) : (
          problems.map((problem) => {
            const actionKey = `problems:${problem.id}`;
            return (
              <ProblemCard
                key={problem.id}
                problem={problem}
                compact={compact}
                isOwner={isOwnerUser(problem.user_id)}
                actionMenuOpen={actionMenuKey === actionKey}
                onOpen={() => setActiveProblemId(problem.id)}
                onToggleActionMenu={() => setActionMenuKey((prev) => (prev === actionKey ? null : actionKey))}
                onEdit={(event) => { event.stopPropagation(); openEditProblem(problem); }}
                onDelete={(event) => { event.stopPropagation(); requestDelete(problem.id, "problems"); }}
              />
            );
          })
        )}
      </div>

      <UnifiedDocumentModal
        open={timelineType === "experiments" && !!activePost}
        post={timelineType === "experiments" ? activePost : null}
        statusClassName={activePost ? badgeStyles[(activePost.wip_status ?? "idea") as WipStatus] : undefined}
        authorName={showAuthor ? authorName : null}
        onValidate={activePost ? handleToggleValidate : undefined}
        isValidated={activeIsValidated}
        validateCount={activePost ? activeValidateCount : undefined}
        onAddInsight={activePost ? () => { if (!currentUserId) return openLoginModal(() => activePost && openFeedback(activePost.id)); openFeedback(activePost.id); } : undefined}
        onEdit={activePost ? () => openEdit(activePost.id) : undefined}
        canEdit={!!(activePost && isOwnerUser(activePost.user_id))}
        onClose={() => setActivePostId(null)}
      />

      <ProblemDetailModal
        open={timelineType === "problems" && !!activeProblem}
        problem={activeProblem}
        isOwner={!!(activeProblem && isOwnerUser(activeProblem.user_id))}
        onClose={() => setActiveProblemId(null)}
        onEdit={() => activeProblem && openEditProblem(activeProblem)}
        onDelete={() => activeProblem && requestDelete(activeProblem.id, "problems")}
        onProposeSolution={() => activeProblem && openCreateExperiment(activeProblem)}
      />

      <FullProblemEditModal
        open={!!editingProblemId}
        draft={problemDraft}
        message={problemFormMessage}
        saving={savingProblem}
        onChange={(next) => setProblemDraft((prev) => ({ ...prev, ...next }))}
        onClose={() => !savingProblem && setEditingProblemId(null)}
        onSubmit={submitProblemEdit}
      />

      <CreatePost
        isOpen={isCreateExperimentOpen}
        onClose={() => { setIsCreateExperimentOpen(false); setSelectedProblemId(null); setSelectedProblemTitle(null); }}
        linkedProblemId={selectedProblemId}
        linkedProblemTitle={selectedProblemTitle}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100">{deleteTarget.type === "experiments" ? "Delete this experiment?" : "Delete this problem?"}</h3>
            <p className="mt-3 text-sm text-slate-300">This action cannot be undone.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => !deletingItem && setDeleteTarget(null)} disabled={deletingItem} className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deletingItem} className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
