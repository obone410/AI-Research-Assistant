"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LockKeyhole, LogIn, Mail, UserPlus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthGateProps = {
  supabaseConfigured: boolean;
  children: React.ReactNode;
};

export function AuthGate({ supabaseConfigured, children }: AuthGateProps) {
  const supabase = useMemo(
    () => (supabaseConfigured ? createSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(Boolean(supabaseConfigured));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabaseConfigured) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4] text-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      </div>
    );
  }

  if (session) {
    return children;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setLoading(true);
    setMessage("");

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm the account.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-600">
            <LockKeyhole className="h-4 w-4 text-emerald-700" />
            Supabase Auth
          </div>
          <div className="max-w-2xl space-y-5">
            <h1 className="text-5xl font-semibold tracking-normal text-slate-950">
              ResearchOS
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              Sign in to open the research workspace, upload documents, run
              structured AI extraction, and export cited reports.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="border border-slate-300 bg-white p-4">
              Document intelligence
            </div>
            <div className="border border-slate-300 bg-white p-4">
              pgvector retrieval
            </div>
            <div className="border border-slate-300 bg-white p-4">
              Structured AI outputs
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 border border-slate-300 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-xl font-semibold">
              {mode === "signin" ? "Sign in" : "Create account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use the same credentials configured in Supabase Auth.
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <span className="mt-2 flex items-center gap-2 border border-slate-300 bg-white px-3 py-2">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent outline-none"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <span className="mt-2 flex items-center gap-2 border border-slate-300 bg-white px-3 py-2">
              <LockKeyhole className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent outline-none"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </span>
          </label>
          {message ? <p className="text-sm text-rose-700">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {mode === "signin" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {mode === "signin" ? "Create account" : "Use existing account"}
          </button>
        </form>
      </section>
    </main>
  );
}
