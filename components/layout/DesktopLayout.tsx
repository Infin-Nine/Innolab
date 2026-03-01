"use client";

import Link from "next/link";
import { AlertTriangle, Atom, LayoutGrid, LogIn, UserRound, Users } from "lucide-react";

type DesktopLayoutProps = {
  activeTab: "feed" | "profile";
  onTabChange: (tab: "feed" | "profile") => void;
  hasSession: boolean;
  onOpenAuthConsole: () => void;
  children: React.ReactNode;
};

export default function DesktopLayout({
  activeTab,
  onTabChange,
  hasSession,
  onOpenAuthConsole,
  children,
}: DesktopLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-950/80 px-6 py-6 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
            <Atom className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">InnoLab</p>
            <p className="text-xs text-slate-400">Open Research & Innovation Network</p>
          </div>
        </div>
        <nav className="mt-8 space-y-2">
          <button
            type="button"
            onClick={() => onTabChange("feed")}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "feed"
                ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-slate-100"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Lab
          </button>
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "profile"
                ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-slate-100"
            }`}
          >
            <UserRound className="h-4 w-4" />
            Profile
          </button>
          <Link
            href="/collaborators"
            className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:border-cyan-400/70 hover:text-cyan-100"
          >
            <Users className="h-4 w-4" />
            Collaborations
          </Link>
          <Link
            href="/problems"
            className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:border-cyan-400/70 hover:text-cyan-100"
          >
            <AlertTriangle className="h-4 w-4" />
            Problem Space
          </Link>
        </nav>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">System Status</p>
          <p>Secure lab channels online.</p>
        </div>
        <div className="mt-auto space-y-3 border-t border-slate-800 pt-6">
          {!hasSession && (
            <button
              type="button"
              onClick={onOpenAuthConsole}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <LogIn className="h-4 w-4" />
              Open Auth Console
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
