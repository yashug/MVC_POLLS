"use client";

import { useState, useTransition } from "react";
import {
  addMember, enterDraw, removeMember, respondToInvite, withdrawEntry,
  type ActionResult,
} from "@/app/(app)/i/[slug]/actions";

export type Member = {
  villaId: number;
  villaNo: number;
  role: "lead" | "member";
  acceptance: "pending" | "accepted" | "declined";
};

export type PanelLabels = Record<
  | "enterDraw" | "yourEntry" | "withdraw" | "groupTitle" | "addVilla" | "remove"
  | "villa" | "pendingInvite" | "accept" | "decline"
  | "leaveGroup" | "lockedNow" | "registered" | "soloOrGroup" | "addOptional"
  | "pendingNote",
  string
>;

export function EntryPanel({
  itemId, maxGroupSize, editable, entry, myVillaId, labels: L,
}: {
  itemId: number;
  maxGroupSize: number;
  editable: boolean;
  myVillaId: number;
  entry: { id: number; leadVillaId: number; members: Member[] } | null;
  labels: PanelLabels;
}) {
  const [error, setError] = useState<string | null>(null);
  const [villaInput, setVillaInput] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else setVillaInput("");
    });
  };

  if (!entry) {
    return (
      <div className="rounded-lg bg-paper p-5 ring-1 ring-leaf/10">
        {editable ? (
          <>
            {maxGroupSize > 1 && <SoloOrGroup text={L.soloOrGroup} />}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => enterDraw(itemId))}
              className="w-full rounded-md bg-kumkum py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-zari-pale transition-colors hover:bg-kumkum-soft disabled:opacity-60"
            >
              {pending ? "…" : L.enterDraw}
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-leaf-soft">{L.lockedNow}</p>
        )}
        <Err error={error} />
      </div>
    );
  }

  const isLead = entry.leadVillaId === myVillaId;
  const me = entry.members.find((m) => m.villaId === myVillaId);
  const isPendingInvite = me?.acceptance === "pending";
  const roomLeft = maxGroupSize - entry.members.length;

  return (
    <div className="overflow-hidden rounded-lg bg-paper ring-1 ring-leaf/10">
      <div className="flex items-center gap-2 border-b border-leaf/10 bg-leaf/[0.04] px-5 py-2.5">
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-leaf-soft">
          {entry.members.length > 1 ? L.groupTitle : L.yourEntry}
        </span>
        <span className="ml-auto text-[0.7rem] font-semibold text-leaf">✓ {L.registered}</span>
      </div>

      <div className="p-5">
        {maxGroupSize > 1 && <SoloOrGroup text={L.soloOrGroup} />}

        {isPendingInvite && (
          <div className="mb-4 rounded-md bg-turmeric/15 px-3 py-3">
            <p className="text-sm text-leaf">
              Villa {entry.members.find((m) => m.role === "lead")?.villaNo} added you to their group.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button" disabled={pending}
                onClick={() => run(() => respondToInvite(entry.id, true))}
                className="rounded-md bg-leaf px-4 py-1.5 text-xs font-semibold text-toran disabled:opacity-60"
              >
                {L.accept}
              </button>
              <button
                type="button" disabled={pending}
                onClick={() => run(() => respondToInvite(entry.id, false))}
                className="rounded-md border border-leaf/25 px-4 py-1.5 text-xs font-semibold text-leaf-soft disabled:opacity-60"
              >
                {L.decline}
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {entry.members.map((m) => (
            <li
              key={m.villaId}
              className="flex items-center gap-3 rounded-md border border-leaf/10 bg-toran/60 px-3 py-2.5"
            >
              <span className="villa-no text-lg font-bold text-leaf">{m.villaNo}</span>
              <span className="flex-1 text-[0.72rem] text-leaf-soft">
                {m.role === "lead" ? "created the entry" : L.villa}
                {m.acceptance === "pending" && (
                  <span className="ml-1.5 text-clay">· {L.pendingInvite}</span>
                )}
              </span>
              {m.villaId === myVillaId && (
                <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-leaf">
                  you
                </span>
              )}
              {editable && m.role !== "lead" && (isLead || m.villaId === myVillaId) && (
                <button
                  type="button" disabled={pending}
                  onClick={() => run(() => removeMember(entry.id, m.villaId))}
                  className="text-[0.7rem] text-leaf-faint underline underline-offset-2 hover:text-kumkum disabled:opacity-60"
                >
                  {m.villaId === myVillaId ? L.leaveGroup : L.remove}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* The lead needs to know an unanswered invitation simply drops out. */}
        {entry.members.some((m) => m.acceptance === "pending") && (
          <p className="mt-3 rounded-md bg-turmeric/15 px-3 py-2.5 text-xs leading-relaxed text-leaf">
            {L.pendingNote}
          </p>
        )}

        {editable && isLead && maxGroupSize > 1 && roomLeft > 0 && (
          <p className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-leaf-faint">
            {L.addOptional}
          </p>
        )}

        {editable && isLead && maxGroupSize > 1 && roomLeft > 0 && (
          <form
            className="mt-1.5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addMember(entry.id, villaInput));
            }}
          >
            <input
              value={villaInput}
              onChange={(e) => setVillaInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="000"
              aria-label={L.addVilla}
              className="villa-no w-24 rounded-md border border-leaf-faint/40 bg-toran px-3 py-2.5 text-center text-lg focus:border-kumkum focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !villaInput}
              className="flex-1 rounded-md border border-leaf/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-leaf transition-colors hover:bg-leaf hover:text-toran disabled:opacity-50"
            >
              {L.addVilla}
              <span className="ml-1.5 font-normal normal-case tracking-normal text-leaf-faint">
                ({roomLeft} left)
              </span>
            </button>
          </form>
        )}

        {editable && isLead && (
          <button
            type="button" disabled={pending}
            onClick={() => run(() => withdrawEntry(entry.id))}
            className="mt-4 w-full rounded-md border border-kumkum/30 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-kumkum transition-colors hover:bg-kumkum/10 disabled:opacity-60"
          >
            {L.withdraw}
          </button>
        )}

        {!editable && <p className="mt-4 text-xs text-leaf-soft">{L.lockedNow}</p>}
        <Err error={error} />
      </div>
    </div>
  );
}

/** The rule for this item, stated once at the top and never contradicted below. */
function SoloOrGroup({ text }: { text: string }) {
  return (
    <p className="mb-4 rounded-md bg-zari-pale/50 px-3.5 py-3 text-xs leading-relaxed text-leaf">
      {text}
    </p>
  );
}

function Err({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-4 rounded-md bg-kumkum/10 px-3 py-2.5 text-sm text-kumkum">
      {error}
    </p>
  );
}
