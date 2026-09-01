"use client";

import { useState, useTransition } from "react";
import {
  bookSlotForVillaAction, enterVillaAction, resetTestDataAction, resetVillaPin, setPaymentStatus,
  setVillaName, setVillaPin, updateSetting, withdrawEntryAsAdmin, type Res,
} from "@/app/admin/actions";

export function SettingToggle({
  settingKey, label, hint, value,
}: { settingKey: string; label: string; hint: string; value: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-3 rounded-md bg-night-soft p-3 ring-1 ring-zari/15">
      <input
        type="checkbox"
        defaultChecked={value}
        disabled={pending}
        onChange={(e) => start(() => void updateSetting(settingKey, String(e.target.checked)))}
        className="mt-0.5 size-4 accent-[#A8791C]"
      />
      <span>
        <span className="block text-sm text-zari-pale">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zari-pale/55">{hint}</span>
      </span>
    </label>
  );
}

export function VillaTools({ unnamed }: { unnamed: number[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Res>, okText: string) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error });
    });
  };

  return (
    <div className="rounded-lg bg-night-soft p-4 ring-1 ring-zari/20">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-zari-pale">Villa access</h3>

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const no = Number(fd.get("villaNo"));
          run(() => resetVillaPin(no), `Villa ${no} can now set a new PIN.`);
        }}
      >
        <label className="block">
          <span className="block text-[0.58rem] uppercase tracking-[0.14em] text-zari/70">Reset a PIN</span>
          <input
            name="villaNo" inputMode="numeric" required placeholder="000"
            className="villa-no mt-1 w-24 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-center text-zari-pale focus:border-zari focus:outline-none"
          />
        </label>
        <button
          type="submit" disabled={pending}
          className="rounded-md border border-zari/30 px-3 py-1.5 text-xs font-semibold text-zari-pale hover:bg-zari/10 disabled:opacity-50"
        >
          Clear PIN
        </button>
      </form>

      <form
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-zari/15 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const no = Number(fd.get("villaNo"));
          run(() => setVillaName(no, String(fd.get("name") ?? "")), `Villa ${no} renamed.`);
        }}
      >
        <label className="block">
          <span className="block text-[0.58rem] uppercase tracking-[0.14em] text-zari/70">
            Correct a name
          </span>
          <input
            name="villaNo" inputMode="numeric" required placeholder="000"
            className="villa-no mt-1 w-20 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-center text-zari-pale focus:border-zari focus:outline-none"
          />
        </label>
        <input
          name="name" required placeholder="Their name"
          className="mt-1 w-36 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-xs text-zari-pale focus:border-zari focus:outline-none"
        />
        <button
          type="submit" disabled={pending}
          className="rounded-md border border-zari/30 px-3 py-1.5 text-xs font-semibold text-zari-pale hover:bg-zari/10 disabled:opacity-50"
        >
          Save name
        </button>
        <p className="basis-full text-[0.68rem] leading-relaxed text-zari-pale/50">
          Their PIN is untouched — they stay signed in.
        </p>
        {unnamed.length > 0 && (
          <p className="basis-full text-[0.68rem] leading-relaxed text-zari-pale/50">
            {unnamed.length === 1 ? "Villa " : "Villas "}
            <span className="villa-no text-zari">{unnamed.join(", ")}</span>
            {unnamed.length === 1
              ? " has no name recorded, so it shows"
              : " have no name recorded, so they show"}{" "}
            as a villa number alone wherever residents are listed.
          </p>
        )}
      </form>

      <form
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-zari/15 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const no = Number(fd.get("villaNo"));
          run(
            () => setVillaPin(no, String(fd.get("name") ?? ""), String(fd.get("pin") ?? "")),
            `Villa ${no} registered. Give them the PIN.`,
          );
        }}
      >
        <label className="block">
          <span className="block text-[0.58rem] uppercase tracking-[0.14em] text-zari/70">
            Register for a resident
          </span>
          <input
            name="villaNo" inputMode="numeric" required placeholder="000"
            className="villa-no mt-1 w-20 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-center text-zari-pale focus:border-zari focus:outline-none"
          />
        </label>
        <input
          name="name" required placeholder="Their name"
          className="mt-1 w-36 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-xs text-zari-pale focus:border-zari focus:outline-none"
        />
        <input
          name="pin" inputMode="numeric" required placeholder="PIN"
          className="villa-no mt-1 w-20 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-center text-zari-pale focus:border-zari focus:outline-none"
        />
        <button
          type="submit" disabled={pending}
          className="rounded-md border border-zari/30 px-3 py-1.5 text-xs font-semibold text-zari-pale hover:bg-zari/10 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {msg && (
        <p
          role="status"
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            msg.ok ? "bg-zari/15 text-zari" : "bg-kumkum/25 text-kumkum-soft"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

export type AdminSlotOption = {
  id: number;
  label: string;
  capacity: number;
  requested: number;
  isLocked: boolean;
  lockNote: string | null;
};

/** Shared chrome for the two on-behalf forms — the card, the note, the result line. */
function OnBehalfPanel({
  blurb, isOpen, msg, children,
}: {
  blurb: React.ReactNode;
  isOpen: boolean;
  msg: { ok: boolean; text: string } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-lg bg-night-soft p-4 ring-1 ring-zari/20">
      <h2 className="font-[family-name:var(--font-display)] text-lg text-zari-pale">
        Enter a villa for them
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-zari-pale/55">
        For residents who ask the committee directly instead of using the app. The
        villa needs no PIN and never has to sign in — the entry counts exactly like
        any other. {blurb}
      </p>

      {isOpen ? (
        children
      ) : (
        <p className="mt-3 rounded-md bg-night px-3 py-2 text-xs text-zari-pale/60">
          Registration is closed for this one. Reopen it on the dashboard to add an entry.
        </p>
      )}

      {msg && (
        <p
          role="status"
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            msg.ok ? "bg-zari/15 text-zari" : "bg-kumkum/25 text-kumkum-soft"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

const fieldLabel = "block text-[0.58rem] uppercase tracking-[0.14em] text-zari/70";
const numberInput =
  "villa-no mt-1 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-center text-zari-pale focus:border-zari focus:outline-none";
const textInput =
  "mt-1 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-xs text-zari-pale focus:border-zari focus:outline-none";
const submitBtn =
  "rounded-md bg-zari px-3 py-1.5 text-xs font-semibold text-night hover:bg-zari-light disabled:opacity-50";

/**
 * Enter a villa without them signing in. The committee takes these in person or
 * over the phone from residents — mostly the older ones — who are never going
 * to work through the app themselves.
 */
export function EnterForVilla({
  itemId, maxGroupSize, isOpen, entryFee,
}: { itemId: number; maxGroupSize: number; isOpen: boolean; entryFee: number }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <OnBehalfPanel
      isOpen={isOpen}
      msg={msg}
      blurb={entryFee > 0 ? `Still ₹${entryFee}, collected the usual way.` : null}
    >
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const villaNos = String(fd.get("villaNos") ?? "");
          setMsg(null);
          start(async () => {
            const r = await enterVillaAction(itemId, villaNos, String(fd.get("familyName") ?? ""));
            setMsg(
              r.ok
                ? { ok: true, text: `Entered ${villaNos.trim()}. Tell them it's done.` }
                : { ok: false, text: r.error },
            );
            if (r.ok) form.reset();
          });
        }}
      >
        <label className="block">
          <span className={fieldLabel}>{maxGroupSize > 1 ? "Villa numbers" : "Villa number"}</span>
          <input
            name="villaNos" inputMode="numeric" required
            placeholder={maxGroupSize > 1 ? "42, 43" : "000"}
            className={`${numberInput} w-28`}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Name (optional)</span>
          <input name="familyName" placeholder="Their name" className={`${textInput} w-36`} />
        </label>
        <button type="submit" disabled={pending} className={submitBtn}>
          Add entry
        </button>
        <p className="basis-full text-[0.68rem] leading-relaxed text-zari-pale/50">
          {maxGroupSize > 1
            ? `Up to ${maxGroupSize} villas entering together — separate the numbers with commas. The first one leads the group.`
            : "One villa per entry for this one."}{" "}
          The name shows in the entrant list where the committee has opened names.
        </p>
      </form>
    </OnBehalfPanel>
  );
}

/**
 * The same, for the items that ask for a session. Pooja wants the family
 * details that go with it and annadanam an amount, so this collects whatever
 * the resident form would have asked for.
 */
export function BookSessionForVilla({
  itemId, isOpen, slots, single, collectDetails, collectAmount,
}: {
  itemId: number;
  isOpen: boolean;
  slots: AdminSlotOption[];
  /** Pooja: one session per villa, so a second choice moves the first. */
  single: boolean;
  collectDetails: boolean;
  collectAmount: boolean;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <OnBehalfPanel
      isOpen={isOpen}
      msg={msg}
      blurb={
        single
          ? "If the villa already has a session, this moves it rather than adding a second."
          : "A villa can sponsor as many sessions as it likes."
      }
    >
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const villaNo = String(fd.get("villaNo") ?? "").trim();
          const slotId = Number(fd.get("slotId"));
          const label = slots.find((s) => s.id === slotId)?.label ?? "that session";
          const attendees = String(fd.get("attendeesCount") ?? "").trim();
          const amount = String(fd.get("amountPledged") ?? "").trim();
          setMsg(null);
          start(async () => {
            const r = await bookSlotForVillaAction(itemId, slotId, villaNo, {
              familyName: String(fd.get("familyName") ?? ""),
              gotram: String(fd.get("gotram") ?? ""),
              attendeesCount: attendees ? Number(attendees) : null,
              amountPledged: amount ? Number(amount) : null,
              // An amount named for one meal is a share of it, not the whole
              // cost — the same reading the resident form gives it.
              isPartial: collectAmount ? !!amount : false,
            });
            setMsg(
              r.ok
                ? {
                    ok: true,
                    text: `Villa ${villaNo} ${r.moved ? "moved to" : "booked for"} ${label}.`,
                  }
                : { ok: false, text: r.error },
            );
            if (r.ok) form.reset();
          });
        }}
      >
        <label className="block">
          <span className={fieldLabel}>Villa number</span>
          <input
            name="villaNo" inputMode="numeric" required placeholder="000"
            className={`${numberInput} w-20`}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Session</span>
          <select
            name="slotId" required defaultValue=""
            className="mt-1 max-w-full rounded-md border border-zari/25 bg-night px-2 py-1.5 text-xs text-zari-pale focus:border-zari focus:outline-none"
          >
            <option value="" disabled>
              Pick a session…
            </option>
            {slots.map((s) => (
              <option key={s.id} value={s.id} disabled={s.isLocked}>
                {s.label}
                {s.isLocked
                  ? " · reserved"
                  : single
                    ? ` · ${s.requested}/${s.capacity} asked`
                    : ` · ${s.requested} so far`}
              </option>
            ))}
          </select>
        </label>
        {collectDetails && (
          <>
            <label className="block">
              <span className={fieldLabel}>Family name</span>
              <input name="familyName" placeholder="Their name" className={`${textInput} w-32`} />
            </label>
            <label className="block">
              <span className={fieldLabel}>Gotram</span>
              <input name="gotram" placeholder="Optional" className={`${textInput} w-28`} />
            </label>
            <label className="block">
              <span className={fieldLabel}>Attending</span>
              <input
                name="attendeesCount" inputMode="numeric" placeholder="—"
                className={`${numberInput} w-16`}
              />
            </label>
          </>
        )}
        {collectAmount && (
          <>
            {!collectDetails && (
              <label className="block">
                <span className={fieldLabel}>Name (optional)</span>
                <input name="familyName" placeholder="Their name" className={`${textInput} w-32`} />
              </label>
            )}
            <label className="block">
              <span className={fieldLabel}>Amount ₹</span>
              <input
                name="amountPledged" inputMode="numeric" placeholder="—"
                className={`${numberInput} w-24`}
              />
            </label>
          </>
        )}
        <button type="submit" disabled={pending} className={submitBtn}>
          Add booking
        </button>
        <p className="basis-full text-[0.68rem] leading-relaxed text-zari-pale/50">
          {single
            ? "Sessions over their places go to a draw at allocation, exactly as they would if the resident had booked it themselves. Moving a villa with the boxes left blank keeps the details it already had."
            : "Naming an amount is optional — leave it blank if they didn't say."}{" "}
          Reserved sessions are filled from the allocation page instead.
        </p>
      </form>
    </OnBehalfPanel>
  );
}

/**
 * Undo an entry. A villa entered on someone's behalf has no login of its own, so
 * a mistyped number can only be fixed from here.
 */
export function RemoveEntry({ entryId, label }: { entryId: number; label: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!armed) {
    return (
      <>
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-[0.68rem] text-zari-pale/45 underline underline-offset-4 hover:text-kumkum-soft"
        >
          Remove
        </button>
        {error && (
          <span role="alert" className="text-[0.68rem] text-kumkum-soft">
            {error}
          </span>
        )}
      </>
    );
  }

  return (
    <span className="flex items-center gap-2 text-[0.68rem] text-zari-pale/70">
      Remove {label}?
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await withdrawEntryAsAdmin(entryId);
            if (!r.ok) setError(r.error);
            setArmed(false);
          })
        }
        className="rounded bg-kumkum px-2 py-0.5 font-semibold text-zari-pale disabled:opacity-60"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded border border-zari/30 px-2 py-0.5 font-semibold text-zari-pale"
      >
        No
      </button>
    </span>
  );
}

export function PaymentRow({
  id, amount, status,
}: { id: number; amount: number; status: "due" | "paid" | "waived" }) {
  const [pending, start] = useTransition();
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-zari/10 pt-2">
      <span className="text-[0.68rem] text-zari-pale/60">Token ₹{amount}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase ${
          status === "paid" ? "bg-zari/20 text-zari" : "bg-kumkum/20 text-kumkum-soft"
        }`}
      >
        {status}
      </span>
      <select
        defaultValue={status}
        disabled={pending}
        onChange={(e) =>
          start(() => void setPaymentStatus(id, e.target.value as "due" | "paid" | "waived"))
        }
        className="ml-auto rounded border border-zari/25 bg-night px-2 py-1 text-[0.68rem] text-zari-pale"
      >
        <option value="due">due</option>
        <option value="paid">paid</option>
        <option value="waived">waived</option>
      </select>
    </div>
  );
}

/** Preview only — hidden entirely on the live site. */
export function ResetTestData() {
  const [msg, setMsg] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="mt-8 rounded-lg border border-kumkum/40 bg-kumkum/10 p-4">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-zari-pale">
        Clear all test data
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-zari-pale/60">
        Deletes every registration, group, draw, payment and villa PIN. Villas,
        items and sessions stay as they are. Use this to hand a clean site to the
        committee, or before the real registration opens.
      </p>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-3 rounded-md border border-kumkum/50 px-4 py-2 text-xs font-semibold text-kumkum-soft hover:bg-kumkum/15"
        >
          Clear test data…
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zari-pale">This can&apos;t be undone. Sure?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resetTestDataAction();
                setMsg(r.ok ? "Cleared. Everyone will need to set a PIN again." : r.error);
                setArmed(false);
              })
            }
            className="rounded-md bg-kumkum px-4 py-2 text-xs font-semibold text-zari-pale disabled:opacity-60"
          >
            Yes, clear everything
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="rounded-md border border-zari/30 px-4 py-2 text-xs font-semibold text-zari-pale"
          >
            Cancel
          </button>
        </div>
      )}

      {msg && <p role="status" className="mt-3 text-xs text-zari-pale">{msg}</p>}
    </div>
  );
}
