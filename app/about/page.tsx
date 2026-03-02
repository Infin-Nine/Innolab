import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">Future Lab Network</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Where Innovation Meets Adrenaline.
        </h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
          The social network for inventors, makers, and researchers. Share messy experiments,
          connect with collaborators, and turn public work into momentum.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-cyan-500/40 bg-cyan-500/20 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
          >
            Open Public Feed
          </Link>
        </div>
      </div>
    </div>
  );
}

