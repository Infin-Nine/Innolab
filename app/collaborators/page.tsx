import Link from "next/link";
import CollabLayout from "./components/CollabLayout";

export default function CollaboratorsHome() {
  return (
    <CollabLayout
      title="Collaborations"
      subtitle="Connect, collaborate, and build together."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/collaborators/discover"
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-200 transition hover:border-cyan-400/60"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
            Discover
          </p>
          <p className="mt-3 text-lg font-semibold">Explore Members</p>
          <p className="mt-2 text-sm text-slate-400">
            Explore profiles and initiate collaboration requests.
          </p>
        </Link>
        <Link
          href="/collaborators/requests"
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-200 transition hover:border-fuchsia-400/60"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-400">
            Requests
          </p>
          <p className="mt-3 text-lg font-semibold">Manage Requests</p>
          <p className="mt-2 text-sm text-slate-400">
            Review and respond to collaboration invitations.
          </p>
        </Link>
        <Link
          href="/collaborators/my-collaborators"
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-200 transition hover:border-emerald-400/60"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
            My Collaborations
          </p>
          <p className="mt-3 text-lg font-semibold">Active Collaborations</p>
          <p className="mt-2 text-sm text-slate-400">
            Members you are currently working with.
          </p>
        </Link>
      </div>
    </CollabLayout>
  );
}
