"use client";

import { useState, useTransition } from "react";
import { adminSignIn } from "./actions";

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-5">
      <form
        action={(fd) =>
          start(async () => {
            const res = await adminSignIn(fd);
            if (res && !res.ok) setError(res.error);
          })
        }
        className="w-full max-w-xs rounded-lg bg-night-soft p-6 ring-1 ring-zari/30"
      >
        <h1 className="font-[family-name:var(--font-display)] text-xl text-zari-pale">
          Committee sign-in
        </h1>
        <p className="mt-1 text-xs text-zari/70">Venice City Ganesh Chaturthi 2026</p>

        <label htmlFor="username" className="mt-5 block text-[0.65rem] uppercase tracking-[0.16em] text-zari/80">
          Username
        </label>
        <input
          id="username" name="username" autoFocus required autoComplete="username"
          className="mt-1.5 w-full rounded-md border border-zari/30 bg-night px-3 py-2.5 text-zari-pale focus:border-zari focus:outline-none"
        />

        <label htmlFor="password" className="mt-4 block text-[0.65rem] uppercase tracking-[0.16em] text-zari/80">
          Password
        </label>
        <input
          id="password" name="password" type="password" required autoComplete="current-password"
          className="mt-1.5 w-full rounded-md border border-zari/30 bg-night px-3 py-2.5 text-zari-pale focus:border-zari focus:outline-none"
        />

        <button
          type="submit" disabled={pending}
          className="mt-6 w-full rounded-md bg-zari py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-night disabled:opacity-60"
        >
          {pending ? "…" : "Sign in"}
        </button>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-kumkum/20 px-3 py-2 text-sm text-kumkum-soft">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
