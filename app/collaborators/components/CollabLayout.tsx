import { type ReactNode } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function CollabLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-950/80 px-6 py-6 md:w-72 md:border-b-0 md:border-r md:sticky md:top-0 md:h-screen">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">InnoLab</p>
              <p className="text-xs text-slate-400">Research Network</p>
            </div>
          </div>
          <nav className="mt-8 space-y-2">
            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
            >
              Home
            </Link>
            <Link
              href="/collaborators/discover"
              className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
            >
              Discover
            </Link>
            <Link
              href="/collaborators/requests"
              className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
            >
              Requests
            </Link>
            <Link
              href="/collaborators/my-collaborators"
              className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/40 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
            >
              My Collaborators
            </Link>
          </nav>
        </aside>
        <main className="flex-1 px-6 py-8 md:px-10">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
              Collaborations
            </p>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
