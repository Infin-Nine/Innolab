"use client";

import Link from "next/link";
import { AlertTriangle, Atom, CirclePlus, FlaskConical, UserRound, Users, X } from "lucide-react";

type MobileLayoutProps = {
  activeTab: "feed" | "profile";
  onTabChange: (tab: "feed" | "profile") => void;
  fabMenuOpen: boolean;
  onFabOpen: () => void;
  onFabClose: () => void;
  children: React.ReactNode;
};

export default function MobileLayout({
  activeTab,
  onTabChange,
  fabMenuOpen,
  onFabOpen,
  onFabClose,
  children,
}: MobileLayoutProps) {
  return (
    <div className="relative min-h-screen h-[100dvh] flex flex-col bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
              <Atom className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">AperNova</p>
              <p className="text-[11px] text-slate-400">Open Research Network</p>
            </div>
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => onTabChange("feed")}
              className={`min-h-11 rounded-full px-3 text-xs font-semibold transition ${
                activeTab === "feed"
                  ? "bg-cyan-500/20 text-cyan-100"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Feed
            </button>
            <button
              type="button"
              onClick={() => onTabChange("profile")}
              className={`min-h-11 rounded-full px-3 text-xs font-semibold transition ${
                activeTab === "profile"
                  ? "bg-cyan-500/20 text-cyan-100"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-24 md:pb-0">
        {children}
      </main>

      {fabMenuOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">Create</p>
              <button
                type="button"
                onClick={onFabClose}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 px-3 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <Link
                href="/lab/new"
                onClick={onFabClose}
                className="flex min-h-11 items-center rounded-2xl border border-slate-700 bg-slate-900/70 px-4 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-cyan-100"
              >
                New Experiment
              </Link>
              <Link
                href="/problems"
                onClick={onFabClose}
                className="flex min-h-11 items-center rounded-2xl border border-slate-700 bg-slate-900/70 px-4 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-cyan-100"
              >
                New Problem
              </Link>
              <Link
                href="/"
                onClick={onFabClose}
                className="flex min-h-11 items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Quick Insight
              </Link>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-2 pt-2 backdrop-blur"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => onTabChange("feed")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-[11px] font-semibold ${
              activeTab === "feed" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Feed
          </button>
          <Link
            href="/problems"
            className="flex min-h-11 flex-col items-center justify-center rounded-xl text-[11px] font-semibold text-slate-300"
          >
            <AlertTriangle className="h-4 w-4" />
            Problem
          </Link>
          <button
            type="button"
            onClick={onFabOpen}
            className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-cyan-500/20 text-[11px] font-semibold text-cyan-100"
          >
            <CirclePlus className="h-4 w-4" />
            Create
          </button>
          <Link
            href="/collaborators"
            className="flex min-h-11 flex-col items-center justify-center rounded-xl text-[11px] font-semibold text-slate-300"
          >
            <Users className="h-4 w-4" />
            Collabs
          </Link>
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-[11px] font-semibold ${
              activeTab === "profile" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300"
            }`}
          >
            <UserRound className="h-4 w-4" />
            Profile
          </button>
        </div>
      </nav>
    </div>
  );
}
