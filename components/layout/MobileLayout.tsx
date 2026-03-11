"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, FlaskConical, LogIn, UserRound, Users } from "lucide-react";

type NavItem = "problems" | "solutions" | "profile" | "collaborations";

type MobileLayoutProps = {
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
  { id: "problems", href: "/problems", label: "Problems", icon: AlertTriangle },
  { id: "solutions", href: "/solutions", label: "Solutions", icon: FlaskConical },
  { id: "profile", href: "/profile", label: "Profile", icon: UserRound },
  { id: "collaborations", href: "/collaborators", label: "Collabs", icon: Users },
];

export default function MobileLayout({
  activeItem,
  hasSession,
  onOpenAuthConsole,
  children,
}: MobileLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/inolabium.png"
              alt="Inolabium logo"
              width={40}
              height={40}
              className="h-[34px] w-auto object-contain"
              priority
            />
            <div>
              <p className="text-sm font-semibold">InoLabium</p>
              <p className="max-w-[180px] text-[11px] leading-tight text-slate-400">
                Solve real problems
              </p>
            </div>
          </div>
          {!hasSession && (
            <button
              type="button"
              onClick={onOpenAuthConsole}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-24">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-2 pt-2 backdrop-blur"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-4 gap-1">
          {navItems.map(({ id, href, label, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-[11px] font-semibold ${
                activeItem === id ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
