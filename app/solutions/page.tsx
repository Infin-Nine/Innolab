"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LabNotebook from "../components/LabNotebook";
import CreatePost from "../components/CreatePost";
import { useAuth } from "../contexts/AuthContext";
import { useLoginModal } from "../contexts/LoginModalContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function SolutionsPage() {
  const { userId } = useAuth();
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const { openLoginModal } = useLoginModal();

  const envMissing = !supabaseUrl || !supabaseAnonKey;

  const openBuildSolution = () => {
    if (!userId) {
      openLoginModal(() => setIsPostModalOpen(true));
      return;
    }
    setIsPostModalOpen(true);
  };

  return (
    <>
      <DashboardLayout activeItem="solutions">
        <section className="space-y-6">
          {envMissing && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable live data.
            </div>
          )}

          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Solutions</p>
              <h1 className="text-2xl font-semibold">Build Solutions to Real Problems</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Share how you are solving real-world problems. Document your prototype, idea, or
                working solution.
              </p>
            </div>
            <button
              type="button"
              onClick={openBuildSolution}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <Lightbulb className="h-4 w-4" />
              Build Solution
            </button>
          </header>

          <LabNotebook refreshKey={postsRefreshKey} compact={false} />
        </section>
      </DashboardLayout>

      <CreatePost
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={() => {
          setPostsRefreshKey((prev) => prev + 1);
          setIsPostModalOpen(false);
        }}
      />
    </>
  );
}
