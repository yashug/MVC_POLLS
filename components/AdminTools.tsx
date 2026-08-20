"use client";

import { useState, useTransition } from "react";
import {
  resetTestDataAction, resetVillaPin, setPaymentStatus, setVillaPin, updateSetting,
  type Res,
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

export function VillaTools() {
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
          name="name" placeholder="Their name"
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
