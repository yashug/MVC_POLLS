"use client";

import { useState, useTransition } from "react";
import { ZariBand } from "./ZariBand";
import { claimVilla, lookupVilla, signIn } from "@/app/login/actions";

export type LoginLabels = Record<
  | "loginTitle" | "villaNumber" | "pin" | "setPin" | "confirmPin" | "yourName"
  | "phone" | "continueBtn" | "firstTime" | "forgotPin" | "back"
  | "alreadyRegistered",
  string
>;

type Step =
  | { name: "villa" }
  | { name: "signin"; villaNo: number }
  | { name: "claim"; villaNo: number };

export function LoginForm({ labels: L }: { labels: LoginLabels }) {
  const [step, setStep] = useState<Step>({ name: "villa" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string } | void>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && !res.ok && res.error) setError(res.error);
    });
  }

  return (
    <div className="w-full max-w-sm">
      {/* The villa nameplate — every gate in Venice City has one. */}
      <div className="rounded-lg bg-paper shadow-[0_1px_0_rgba(31,61,43,0.08),0_12px_32px_-16px_rgba(31,61,43,0.35)] overflow-hidden">
        <ZariBand height={12} />

        <div className="px-6 pt-6 pb-7">
          {step.name === "villa" && (
            <form
              action={(fd) =>
                run(async () => {
                  const res = await lookupVilla(fd);
                  if (!res.ok) return res;
                  setStep(
                    res.claimed
                      ? { name: "signin", villaNo: res.villaNo }
                      : { name: "claim", villaNo: res.villaNo },
                  );
                  return { ok: true };
                })
              }
            >
              <label htmlFor="villaNo" className="block text-xs uppercase tracking-[0.18em] text-leaf-soft">
                {L.villaNumber}
              </label>
              {/* A gate nameplate. It is autofocused, so the focus treatment is
                  part of the resting look and has to be deliberate rather than
                  the default outline wrapping a very tall box. */}
              <input
                id="villaNo"
                name="villaNo"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                required
                placeholder="000"
                className="villa-no mt-3 w-full rounded-lg border border-zari/45 bg-toran/70 py-2.5 text-center text-5xl font-bold tracking-[0.06em] text-leaf placeholder:text-leaf-faint/35 focus-visible:border-zari focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zari/50"
              />
              <p className="mt-3 text-center text-xs text-leaf-faint">1 – 247</p>
              <Submit pending={pending}>{L.continueBtn}</Submit>
            </form>
          )}

          {step.name === "signin" && (
            <form action={(fd) => run(() => signIn(fd))}>
              <input type="hidden" name="villaNo" value={step.villaNo} />
              <Plate villaNo={step.villaNo} sub={L.alreadyRegistered} />
              <label htmlFor="pin" className="mt-6 block text-xs uppercase tracking-[0.18em] text-leaf-soft">
                {L.pin}
              </label>
              <input
                id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]*"
                maxLength={4} autoFocus required placeholder="••••"
                className="villa-no mt-2 w-full rounded-md border border-leaf-faint/40 bg-toran px-4 py-3 text-center text-3xl tracking-[0.4em] focus:border-kumkum focus:outline-none"
              />
              <Submit pending={pending}>{L.continueBtn}</Submit>
              <p className="mt-4 text-center text-xs leading-relaxed text-leaf-faint">{L.forgotPin}</p>
              <BackBtn onClick={() => setStep({ name: "villa" })}>{L.back}</BackBtn>
            </form>
          )}

          {step.name === "claim" && (
            <form action={(fd) => run(() => claimVilla(fd))}>
              <input type="hidden" name="villaNo" value={step.villaNo} />
              <Plate villaNo={step.villaNo} />
              <p className="mt-5 rounded-md bg-zari-pale/60 px-3 py-2.5 text-center text-xs leading-relaxed text-leaf">
                {L.firstTime}
              </p>
              <Field id="name" name="name" label={L.yourName} autoFocus required />
              <Field id="phone" name="phone" label={L.phone} type="tel" inputMode="tel" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field id="pin" name="pin" label={L.setPin} type="password" inputMode="numeric" maxLength={4} required mono />
                <Field id="confirmPin" name="confirmPin" label={L.confirmPin} type="password" inputMode="numeric" maxLength={4} required mono />
              </div>
              <Submit pending={pending}>{L.continueBtn}</Submit>
              <BackBtn onClick={() => setStep({ name: "villa" })}>{L.back}</BackBtn>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-md bg-kumkum/10 px-3 py-2.5 text-sm text-kumkum">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Plate({ villaNo, sub }: { villaNo: number; sub?: string }) {
  return (
    <div className="text-center">
      <span className="villa-no text-5xl font-bold text-leaf">{villaNo}</span>
      {sub && <p className="mt-1 text-sm text-leaf-soft">{sub}</p>}
    </div>
  );
}

function Field({
  id, label, mono, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; mono?: boolean }) {
  return (
    <div className="mt-4">
      <label htmlFor={id} className="block text-xs uppercase tracking-[0.14em] text-leaf-soft">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`mt-1.5 w-full rounded-md border border-leaf-faint/40 bg-toran px-3 py-2.5 text-leaf focus:border-kumkum focus:outline-none ${
          mono ? "villa-no text-center tracking-[0.3em]" : ""
        }`}
      />
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-md bg-kumkum py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zari-pale transition-colors hover:bg-kumkum-soft disabled:opacity-60"
    >
      {pending ? "…" : children}
    </button>
  );
}

function BackBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full text-center text-xs text-leaf-soft underline underline-offset-4 hover:text-kumkum"
    >
      {children}
    </button>
  );
}
