"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, FlaskConical, LogIn, UserRound, Users } from "lucide-react";

type NavItem = "problems" | "solutions" | "profile" | "collaborations";

type DesktopLayoutProps = {
  activeItem: NavItem;
  hasSession: boolean;
  onOpenAuthConsole: () => void;
  children: React.ReactNode;
};

const navItems: Array<{
  id: NavItem;
  href: string;
  label: string;
  icon: typeof AlertTriangle;
}> = [
  { id: "problems", href: "/problems", label: "Open Problems", icon: AlertTriangle },
  { id: "solutions", href: "/solutions", label: "Solutions", icon: FlaskConical },
  { id: "profile", href: "/profile", label: "Profile", icon: UserRound },
  { id: "collaborations", href: "/collaborators", label: "Collaborations", icon: Users },
];

export default function DesktopLayout({
  activeItem,
  hasSession,
  onOpenAuthConsole,
  children,
}: DesktopLayoutProps) {
  return (
    <div className="mx-auto flex h-screen max-w-7xl flex-col md:flex-row">
      <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-950/80 px-6 py-6 md:h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3">
          <Image
            src="/inolabium.png"
            alt="Inolabium logo"
            width={40}
            height={40}
            className="h-[34px] w-auto object-contain md:h-10"
            priority
          />
          <div>
            <p className="text-lg font-semibold">InoLabium</p>
            <p className="text-xs text-slate-400">Solve real problems</p>
          </div>
        </div>
        <nav className="mt-8 space-y-2">
          {navItems.map(({ id, href, label, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                activeItem === id
                  ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                  : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">Focus</p>
          <p>Solve real problems with visible progress.</p>
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

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
