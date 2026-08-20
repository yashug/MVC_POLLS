"use client";

import { useState, useTransition } from "react";
import {
  bookSlot, updateSlotDetails, withdrawSlotEntry, type Res,
} from "@/app/(app)/i/[slug]/slot-actions";

export type SlotView = {
  id: number;
  label: string;
  capacity: number;
  requested: number;
  allocated: number;
  isLocked: boolean;
  lockNote: string | null;
  adultsCount: number;
  kidsCount: number;
};

export type MyBooking = {
  entryId: number;
  requestedSlotId: number | null;
  assignedSlotId: number | null;
  amountPledged: number | null;
  isPartial: boolean;
  familyName: string | null;
  gotram: string | null;
  attendeesCount: number | null;
};

export type PickerLabels = {
  choose: string; yours: string; full: string; reserved: string;
  places: string; wanted: string; withdraw: string; change: string;
  lockedNow: string; expecting: string; amountLabel: string; partialLabel: string;
  detailsTitle: string; familyName: string; gotram: string; attendees: string;
  save: string; saved: string; movedTo: string; allocatedHere: string; willDraw: string; notPlaced: string; waitingSlot: string; amountTbc: string;
  lang: string;
};

export function SlotPicker({
  itemId, slots, bookings, mode, collectDetails, collectAmount, editable, allocated, labels: L,
}: {
  itemId: number;
  slots: SlotView[];
  bookings: MyBooking[];
  mode: "single" | "multi";
  collectDetails: boolean;
  collectAmount: boolean;
  editable: boolean;
  /** Once the committee has allocated, requests become assignments. */
  allocated: boolean;
  labels: PickerLabels;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [amountFor, setAmountFor] = useState<Record<number, string>>({});
  const [openDetails, setOpenDetails] = useState<number | null>(null);

  const run = (fn: () => Promise<Res>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
    });
  };

  /**
   * Four things a session can be to you, and they must not be confused:
   * asked for, confirmed here, moved elsewhere, or not placed at all.
   */
  const stateFor = (slotId: number) => {
    const assignedHere = bookings.find((b) => b.assignedSlotId === slotId);
    const askedHere = bookings.find((b) => b.requestedSlotId === slotId);
    const booking = assignedHere ?? askedHere;
    if (!booking) return { booking: null, kind: "none" as const };

    if (!allocated) return { booking, kind: "asked" as const };
    if (assignedHere) return { booking, kind: "confirmed" as const };
    // Asked for this one, but the committee's allocation says otherwise.
    if (booking.assignedSlotId != null) return { booking, kind: "moved" as const };
    return { booking, kind: "unplaced" as const };
  };

  return (
    <div className="space-y-2.5">
      {slots.map((s) => {
        const { booking: mine, kind } = stateFor(s.id);
        // A session you were moved out of is no longer yours to show as booked.
        const isMine = !!mine && kind !== "moved";
        const shown = allocated ? s.allocated : s.requested;
        // Before allocation a session can be oversubscribed on purpose — that's
        // what sends it to a draw. Only a settled session is ever closed off.
        const full = allocated && !isMine && s.capacity > 0 && shown >= s.capacity;
        const willDraw =
          !allocated && mode === "single" && s.capacity > 0 && shown > s.capacity;

        return (
          <div
            key={s.id}
            className={`overflow-hidden rounded-lg ring-1 ${
              isMine ? "bg-leaf/[0.06] ring-leaf/40" : "bg-paper ring-leaf/10"
            } ${s.isLocked ? "opacity-70" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] font-semibold text-leaf">{s.label}</p>

                {s.isLocked ? (
                  <p className="mt-0.5 text-xs text-clay">{s.lockNote ?? L.reserved}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-leaf-faint">
                    {mode === "single" ? (
                      <>
                        <span className="villa-no font-semibold text-leaf-soft">{shown}</span>
                        {" / "}
                        <span className="villa-no">{s.capacity}</span> {L.places}
                      </>
                    ) : (
                      <>
                        <span className="villa-no font-semibold text-leaf-soft">{shown}</span>{" "}
                        {L.wanted}
                      </>
                    )}
                    {(s.adultsCount > 0 || s.kidsCount > 0) && (
                      <>
                        {" · "}
                        {L.expecting}{" "}
                        <span className="villa-no">{s.adultsCount + s.kidsCount}</span>
                      </>
                    )}
                  </p>
                )}

                {willDraw && (
                  <p className="mt-1 text-xs font-semibold text-clay">{L.willDraw}</p>
                )}

                {kind === "confirmed" && (
                  <p className="mt-1 text-xs font-semibold text-leaf">✓ {L.allocatedHere}</p>
                )}
                {kind === "moved" && (
                  <p className="mt-1 text-xs font-semibold text-clay">{L.movedTo}</p>
                )}
                {kind === "unplaced" && (
                  <p className="mt-1 text-xs font-semibold text-kumkum">{L.notPlaced}</p>
                )}
              </div>

              {!s.isLocked && (
                <div className="flex shrink-0 items-center gap-2">
                  {collectAmount && !isMine && editable && (
                    <input
                      value={amountFor[s.id] ?? ""}
                      onChange={(e) =>
                        setAmountFor((m) => ({
                          ...m,
                          [s.id]: e.target.value.replace(/\D/g, "").slice(0, 7),
                        }))
                      }
                      inputMode="numeric"
                      placeholder={L.amountLabel}
                      aria-label={`${L.amountLabel} — ${s.label}`}
                      className="villa-no w-24 rounded-md border border-leaf-faint/40 bg-toran px-2 py-2 text-center text-sm focus:border-kumkum focus:outline-none"
                    />
                  )}

                  {isMine && kind !== "unplaced" ? (
                    <span className="rounded-full bg-leaf px-3 py-1 text-[0.68rem] font-semibold text-toran">
                      ✓ {L.yours}
                    </span>
                  ) : kind === "unplaced" ? (
                    <span className="rounded-full bg-kumkum/15 px-3 py-1 text-[0.68rem] font-semibold text-kumkum">
                      {L.waitingSlot}
                    </span>
                  ) : editable && !full ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const raw = amountFor[s.id];
                        const amount = raw ? Number(raw) : null;
                        run(() =>
                          bookSlot(itemId, s.id, {
                            amountPledged: amount,
                            isPartial: collectAmount ? !!amount : false,
                          }),
                        );
                      }}
                      className="rounded-md border border-leaf/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-leaf transition-colors hover:bg-leaf hover:text-toran disabled:opacity-50"
                    >
                      {L.choose}
                    </button>
                  ) : full ? (
                    <span className="text-[0.68rem] font-semibold text-leaf-faint">{L.full}</span>
                  ) : null}
                </div>
              )}
            </div>

            {isMine && (
              <div className="border-t border-leaf/10 px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  {/* Whether it covers the whole meal is the committee's call, so
                      state the pledge plainly rather than guessing at "partial". */}
                  {/* Only items that take money say anything about money —
                      pooja is free and shouldn't mention amounts at all. */}
                  {collectAmount && (
                    <span className="text-leaf-soft">
                      {mine.amountPledged != null ? (
                        <>
                          ₹<span className="villa-no font-semibold">{mine.amountPledged}</span>{" "}
                          {L.partialLabel}
                        </>
                      ) : (
                        L.amountTbc
                      )}
                    </span>
                  )}
                  {collectDetails && editable && (
                    <button
                      type="button"
                      onClick={() => setOpenDetails(openDetails === mine.entryId ? null : mine.entryId)}
                      className="text-leaf-soft underline underline-offset-2 hover:text-kumkum"
                    >
                      {L.detailsTitle}
                    </button>
                  )}
                  {editable && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => withdrawSlotEntry(mine.entryId))}
                      className="ml-auto text-kumkum underline underline-offset-2 disabled:opacity-50"
                    >
                      {L.withdraw}
                    </button>
                  )}
                </div>

                {collectDetails && openDetails === mine.entryId && (
                  <DetailsForm
                    booking={mine}
                    labels={L}
                    pending={pending}
                    onSave={(d) => run(() => updateSlotDetails(mine.entryId, d))}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {!editable && <p className="pt-1 text-xs text-leaf-soft">{L.lockedNow}</p>}

      {error && (
        <p role="alert" className="rounded-md bg-kumkum/10 px-3 py-2.5 text-sm text-kumkum">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailsForm({
  booking, labels: L, pending, onSave,
}: {
  booking: MyBooking;
  labels: PickerLabels;
  pending: boolean;
  onSave: (d: { familyName: string; gotram: string; attendeesCount: number | null }) => void;
}) {
  const [familyName, setFamilyName] = useState(booking.familyName ?? "");
  const [gotram, setGotram] = useState(booking.gotram ?? "");
  const [attendees, setAttendees] = useState(
    booking.attendeesCount != null ? String(booking.attendeesCount) : "",
  );

  return (
    <form
      className="mt-3 grid gap-2.5 border-t border-leaf/10 pt-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          familyName,
          gotram,
          attendeesCount: attendees ? Number(attendees) : null,
        });
      }}
    >
      <Field label={L.familyName} value={familyName} onChange={setFamilyName} />
      <Field label={L.gotram} value={gotram} onChange={setGotram} />
      <Field label={L.attendees} value={attendees} onChange={setAttendees} numeric />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-leaf/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-leaf hover:bg-leaf hover:text-toran disabled:opacity-50 sm:col-span-3"
      >
        {L.save}
      </button>
    </form>
  );
}

function Field({
  label, value, onChange, numeric,
}: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[0.58rem] uppercase tracking-[0.14em] text-leaf-faint">{label}</span>
      <input
        value={value}
        inputMode={numeric ? "numeric" : undefined}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value)}
        className={`mt-1 w-full rounded-md border border-leaf-faint/40 bg-toran px-2.5 py-2 text-sm focus:border-kumkum focus:outline-none ${
          numeric ? "villa-no text-center" : ""
        }`}
      />
    </label>
  );
}
