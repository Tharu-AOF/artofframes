"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// ADMIN LOGIN — email + password via Supabase Auth. Signing in
// here grants the session that the admin CRUD and uploads rely
// on (RLS authenticated role).
// ============================================================

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The login page is only reachable with NO valid session, so any
  // stored Supabase session is stale. Drop it up-front (client-only,
  // zero network) so the client never tries to recover a broken
  // session while the fresh sign-in is in flight.
  useEffect(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-")) localStorage.removeItem(key);
      }
    } catch {
      // storage unavailable — ignore
    }
    try {
      for (const c of document.cookie.split("; ")) {
        const name = c.split("=")[0];
        if (name.startsWith("sb-")) {
          document.cookie =
            name +
            "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
        }
      }
    } catch {
      // cookies unavailable — ignore
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    // Bound the network call so the button can never spin forever:
    // a hung request surfaces as a clear error instead of an
    // endless spinner. (No signOut() before this — it awaits client
    // initialization AND makes a logout network call when a stale
    // session exists, so it can hang exactly like the sign-in.)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMED_OUT")), 20000)
    );
    try {
      const { error } = await Promise.race([
        createClient().auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        timeout,
      ]);
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : error.message
        );
        setSubmitting(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "TIMED_OUT"
          ? "The sign-in request timed out — check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Sign-in failed."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4">
      {/* Ambient orbs — matches the shop's atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-[#5A1020]/20 blur-[150px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-1/4 h-[420px] w-[420px] rounded-full bg-[#CCA681]/10 blur-[150px]"
      />

      <div className="card-shimmer relative w-full max-w-md overflow-hidden rounded-3xl border border-[#CCA681]/25 bg-[#06060f]/70 p-8 backdrop-blur-xl sm:p-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-16 w-16 overflow-hidden">
            <Image
              src="/images/aof-logo.png"
              alt="Art of Frames logo"
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
          <div>
            <h1
              className="text-2xl tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Art of Frames
            </h1>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-[#CCA681]">
              Admin Panel
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-gray-400">
          Sign in to manage the shop, categories and gallery.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Email
            </span>
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-white/15 bg-black/25 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.15)]"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Password
            </span>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-white/15 bg-black/25 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.15)]"
              />
            </div>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="btn-shine mt-1 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5A1020] text-xs font-bold uppercase tracking-widest text-[#CCA681] transition-all duration-300 hover:bg-[#6d1528] hover:shadow-[0_0_24px_rgba(90,16,32,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <LogIn size={15} />
            )}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
