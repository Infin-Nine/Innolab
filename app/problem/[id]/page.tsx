"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import ProblemDiscussionSection from "../../components/problems/ProblemDiscussionSection";
import type { Problem } from "../../components/problems/types";

export default function ProblemDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("problems")
        .select(
          "id,user_id,title,description,affected_group,frequency,current_workaround,solution_type,expected_outcome,additional_context,created_at"
        )
        .eq("id", params?.id ?? "")
        .maybeSingle();
      if (!active) return;
      const baseProblem = (data as Problem | null) ?? null;
      if (!baseProblem) {
        setProblem(null);
        setLoading(false);
        return;
      }

      const [{ count: validationCount }, { count: commentCount }, { data: validationRow }] =
        await Promise.all([
          supabase
            .from("problem_validations")
            .select("*", { count: "exact", head: true })
            .eq("problem_id", baseProblem.id),
          supabase
            .from("problem_comments")
            .select("*", { count: "exact", head: true })
            .eq("problem_id", baseProblem.id),
          userId
            ? supabase
                .from("problem_validations")
                .select("id")
                .eq("problem_id", baseProblem.id)
                .eq("user_id", userId)
                .maybeSingle()
            : Promise.resolve({ data: null as { id?: string } | null }),
        ]);

      if (!active) return;
      setProblem({
        ...baseProblem,
        validation_count: validationCount ?? 0,
        comment_count: commentCount ?? 0,
        is_validated: !!validationRow?.id,
      });
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [params?.id, userId]);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
    };
    void loadUser();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <Link
          href="/problems"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Problems
        </Link>
        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
            Loading problem...
          </div>
        ) : !problem ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
            Problem not found.
          </div>
        ) : (
          <article className="mt-6 space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div>
              <h1 className="text-2xl font-semibold">{problem.title}</h1>
              <p className="mt-2 text-xs text-slate-400">
                {problem.created_at ? new Date(problem.created_at).toLocaleString() : "Recently"}
              </p>
            </div>
            <section>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{problem.description}</p>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Affected Group</p>
                <p className="mt-2 text-sm text-slate-200">{problem.affected_group}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Frequency</p>
                <p className="mt-2 text-sm text-slate-200">{problem.frequency}</p>
              </div>
            </section>
            <section>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current Workaround</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{problem.current_workaround}</p>
            </section>
            <section>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Preferred Solution Type</p>
              <p className="mt-2 text-sm text-slate-200">{problem.solution_type}</p>
            </section>
            {problem.expected_outcome && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Expected Outcome</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{problem.expected_outcome}</p>
              </section>
            )}
            {problem.additional_context && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Additional Context</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{problem.additional_context}</p>
              </section>
            )}
            {!userId && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Sign in to propose a solution.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (!userId) {
                  router.push("/login");
                  return;
                }
                router.push(`/solutions/new?problemId=${problem.id}&problemTitle=${encodeURIComponent(problem.title)}`);
              }}
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
              onRequireAuth={() => router.push("/login")}
              onStatsChange={(stats) =>
                setProblem((prev) =>
                  prev
                    ? {
                        ...prev,
                        validation_count: stats.validationCount ?? prev.validation_count ?? 0,
                        comment_count: stats.commentCount ?? prev.comment_count ?? 0,
                        is_validated: stats.isValidated ?? prev.is_validated ?? false,
                      }
                    : prev
                )
              }
            />
          </article>
        )}
      </div>
    </div>
  );
}
