"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  cancelDrawAction, prepareDrawAction, publishDrawAction, setItemSchedule, setItemStatus,
  type Res,
} from "@/app/admin/actions";
import type { ItemStatus } from "@/db/schema";

export type AdminItem = {
  id: number;
  slug: string;
  title: string;
  kind: "lucky_dip" | "opt_in";
  collectsSlot: boolean;
  status: ItemStatus;
  entryCount: number;
  villaCount: number;
  opensAt: string;
  closesAt: string;
  drawAt: string;
  draw: { id: number; status: "pending" | "completed" | "published"; method: string } | null;
};

export function AdminItemCard({ item }: { item: AdminItem }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
    });
  };

  const isDraw = item.kind === "lucky_dip";

  return (
    <li className="rounded-lg bg-night-soft p-4 ring-1 ring-zari/20">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-zari-pale">{item.title}</h3>
        <span className="rounded-full bg-zari/15 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-zari">
          {item.status}
        </span>
        {isDraw && (
          <span className="text-[0.62rem] uppercase tracking-wider text-zari/60">lucky draw</span>
        )}
        <span className="ml-auto text-xs text-zari-pale/70">
          <b className="villa-no text-sm text-zari-pale">{item.entryCount}</b> entries ·{" "}
          <b className="villa-no text-sm text-zari-pale">{item.villaCount}</b> villas
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <DateField label="Opens" itemId={item.id} field="opensAt" value={item.opensAt} onRun={run} />
        <DateField label="Closes" itemId={item.id} field="closesAt" value={item.closesAt} onRun={run} />
        {isDraw && (
          <DateField label="Draw" itemId={item.id} field="drawAt" value={item.drawAt} onRun={run} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.status === "draft" && (
          <Btn onClick={() => run(() => setItemStatus(item.id, "open"))} disabled={pending}>
            Open registration
          </Btn>
        )}
        {item.status === "open" && (
          <Btn onClick={() => run(() => setItemStatus(item.id, "closed"))} disabled={pending}>
            Close registration
          </Btn>
        )}
        {item.status === "closed" && !item.draw && (
          <Btn onClick={() => run(() => setItemStatus(item.id, "open"))} disabled={pending}>
            Reopen
          </Btn>
        )}

        <Link
          href={`/admin/i/${item.slug}`}
          className="rounded-md border border-zari/30 px-3 py-1.5 text-xs font-semibold text-zari-pale hover:bg-zari/10"
        >
          Entrants
        </Link>

        {item.collectsSlot && (
          <Link
            href={`/admin/slots/${item.slug}`}
            className="rounded-md bg-zari px-3 py-1.5 text-xs font-semibold text-night hover:bg-zari-light"
          >
            Sessions &amp; allocation →
          </Link>
        )}

        {isDraw && !item.draw && item.entryCount > 0 && (
          <>
            <Btn primary onClick={() => run(() => prepareDrawAction(item.id, "app_wheel"))} disabled={pending}>
              Prepare wheel draw
            </Btn>
            <Btn onClick={() => run(() => prepareDrawAction(item.id, "physical"))} disabled={pending}>
              Prepare physical draw
            </Btn>
          </>
        )}

        {item.draw && item.draw.status === "pending" && (
          <>
            <Link
              href={`/admin/draw/${item.slug}`}
              className="rounded-md bg-zari px-3 py-1.5 text-xs font-semibold text-night hover:bg-zari-light"
            >
              {item.draw.method === "app_wheel" ? "Go to the wheel →" : "Record the winner →"}
            </Link>
            <Btn onClick={() => run(() => cancelDrawAction(item.draw!.id, item.id))} disabled={pending}>
              Cancel draw
            </Btn>
          </>
        )}

        {item.draw && item.draw.status === "completed" && (
          <>
            <Link
              href={`/admin/draw/${item.slug}`}
              className="rounded-md border border-zari/30 px-3 py-1.5 text-xs font-semibold text-zari-pale hover:bg-zari/10"
            >
              View result
            </Link>
            <Btn primary onClick={() => run(() => publishDrawAction(item.draw!.id))} disabled={pending}>
              Publish to residents
            </Btn>
          </>
        )}

        {item.draw?.status === "published" && (
          <span className="rounded-md bg-zari/15 px-3 py-1.5 text-xs font-semibold text-zari">
            ✓ Published
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-kumkum/25 px-3 py-2 text-xs text-kumkum-soft">
          {error}
        </p>
      )}
    </li>
  );
}

function DateField({
  label, itemId, field, value, onRun,
}: {
  label: string;
  itemId: number;
  field: "opensAt" | "closesAt" | "drawAt";
  value: string;
  onRun: (fn: () => Promise<Res>) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[0.58rem] uppercase tracking-[0.14em] text-zari/70">
        {label} <span className="normal-case tracking-normal">(IST)</span>
      </span>
      <input
        type="datetime-local"
        defaultValue={value}
        onChange={(e) => onRun(() => setItemSchedule(itemId, field, e.target.value))}
        className="mt-1 w-full rounded-md border border-zari/25 bg-night px-2 py-1.5 text-xs text-zari-pale focus:border-zari focus:outline-none"
      />
    </label>
  );
}

function Btn({
  children, onClick, disabled, primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        primary
          ? "bg-zari text-night hover:bg-zari-light"
          : "border border-zari/30 text-zari-pale hover:bg-zari/10"
      }`}
    >
      {children}
    </button>
  );
}
