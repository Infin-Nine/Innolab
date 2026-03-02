"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import PostComments from "../../components/PostComments";

type Experiment = {
  id: string;
  user_id: string;
  title: string | null;
  problem_statement?: string | null;
  theory?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  created_at?: string | null;
};

export default function ExperimentDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,user_id,title,problem_statement,theory,approach,observations,reflection,created_at")
        .eq("id", params?.id ?? "")
        .maybeSingle();
      if (!active) return;
      setPost((data as Experiment | null) ?? null);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [params?.id]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lab
        </Link>
        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
            Loading experiment...
          </div>
        ) : !post ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
            Experiment not found.
          </div>
        ) : (
          <article className="mt-6 space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div>
              <h1 className="text-2xl font-semibold">{post.title ?? "Untitled Experiment"}</h1>
              <p className="mt-2 text-xs text-slate-400">
                {post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}
              </p>
            </div>
            {post.problem_statement && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Problem</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{post.problem_statement}</p>
              </section>
            )}
            {post.theory && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Context</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{post.theory}</p>
              </section>
            )}
            {post.approach && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Approach</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{post.approach}</p>
              </section>
            )}
            {post.observations && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Progress</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{post.observations}</p>
              </section>
            )}
            {post.reflection && (
              <section>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{post.reflection}</p>
              </section>
            )}
            <PostComments postId={post.id} postOwnerId={post.user_id} />
          </article>
        )}
      </div>
    </div>
  );
}

