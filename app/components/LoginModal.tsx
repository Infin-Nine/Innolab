"use client";

import { useState, type FormEvent } from "react";
import { Loader2, LogIn, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useLoginModal } from "../contexts/LoginModalContext";

export default function LoginModal() {
  const { isOpen, mode, setMode, closeLoginModal, consumePendingAction } = useLoginModal();
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthMessage(error.message);
        setAuthLoading(false);
        return;
      }
      setAuthLoading(false);
      closeLoginModal();
      consumePendingAction()?.();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      setAuthMessage(error.message);
      setAuthLoading(false);
      return;
    }
    const displayName = authName || authEmail.split("@")[0] || "Innovator";
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: displayName,
      });
    }
    setAuthMessage("Account created. You can now log in.");
    setMode("login");
    setAuthLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl shadow-slate-900/80">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Auth Console</p>
            <h2 className="mt-2 text-xl font-semibold">
              {mode === "login" ? "Login to AperNova" : "Join the Lab"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                mode === "login"
                  ? "bg-cyan-500/20 text-cyan-100"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                mode === "signup"
                  ? "bg-fuchsia-500/20 text-fuchsia-100"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Display name</label>
              <input
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                placeholder="Nova Innovator"
                type="text"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Email</label>
            <input
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="you@lab.com"
              type="email"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Password</label>
            <input
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="••••••••"
              type="password"
              required
            />
          </div>

          {authMessage && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
              {authMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/20 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {mode === "login" ? "Log In" : "Create Account"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
