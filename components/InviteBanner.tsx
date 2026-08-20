"use client";

import { useState, useTransition } from "react";
import { respondToInvite } from "@/app/(app)/i/[slug]/actions";

export function InviteBanner({
  invites, labels: L,
}: {
  invites: { entryId: number; title: string; leadVillaNo: number }[];
  labels: { title: string; invitedYou: string; accept: string; decline: string };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (invites.length === 0) return null;

  const respond = (entryId: number, accept: boolean) =>
    start(async () => {
      const r = await respondToInvite(entryId, accept);
      if (!r.ok) setError(r.error);
    });

  return (
    <section className="mt-5 rounded-lg bg-turmeric/20 p-4 ring-1 ring-turmeric/50">
      <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-clay">
        {L.title}
      </h2>
      <ul className="mt-2.5 space-y-3">
        {invites.map((i) => (
          <li key={i.entryId}>
            <p className="text-sm text-leaf">
              <span className="villa-no font-bold">{i.leadVillaNo}</span> {L.invitedYou} —{" "}
              <b>{i.title}</b>
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button" disabled={pending}
                onClick={() => respond(i.entryId, true)}
                className="rounded-md bg-leaf px-4 py-1.5 text-xs font-semibold text-toran disabled:opacity-60"
              >
                {L.accept}
              </button>
              <button
                type="button" disabled={pending}
                onClick={() => respond(i.entryId, false)}
                className="rounded-md border border-leaf/25 px-4 py-1.5 text-xs font-semibold text-leaf-soft disabled:opacity-60"
              >
                {L.decline}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-kumkum">{error}</p>}
    </section>
  );
}
