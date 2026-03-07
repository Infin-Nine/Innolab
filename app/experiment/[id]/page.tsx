"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ExperimentCreatePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim() || !description.trim()) {
      setError("Please fill in both title and description.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("experiments").insert({
      title: title.trim(),
      description: description.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setDescription("");
    setSuccess("Experiment published successfully.");
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8">
        <h1 className="text-2xl font-semibold">Add New Experiment</h1>
        <p className="mt-2 text-sm text-slate-400">
          Share your experiment details clearly and publish them to the lab.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="experiment-title" className="text-sm font-medium text-slate-300">
              Experiment Title
            </label>
            <input
              id="experiment-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter experiment title"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="experiment-description" className="text-sm font-medium text-slate-300">
              Experiment Description
            </label>
            <textarea
              id="experiment-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the goal, method, and observations..."
              className="min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full border border-cyan-500/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Publishing..." : "Publish Experiment"}
          </button>
        </form>
      </div>
    </div>
  );
}
