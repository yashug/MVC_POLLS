"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { villaAccounts, villas } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/session";

const villaNoSchema = z.coerce.number().int().min(1).max(247);
const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

export type LookupResult =
  | { ok: true; villaNo: number; claimed: boolean; claimedByName?: string }
  | { ok: false; error: string };

export async function lookupVilla(formData: FormData): Promise<LookupResult> {
  const parsed = villaNoSchema.safeParse(formData.get("villaNo"));
  if (!parsed.success) return { ok: false, error: "Enter a villa number between 1 and 247." };

  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, parsed.data) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const account = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });

  return {
    ok: true,
    villaNo: villa.villaNo,
    claimed: !!account,
    claimedByName: account?.claimedByName,
  };
}

export type AuthResult = { ok: false; error: string } | { ok: true };

/** First person to open the app for a villa sets its PIN. */
export async function claimVilla(formData: FormData): Promise<AuthResult> {
  const villaNo = villaNoSchema.safeParse(formData.get("villaNo"));
  const pin = pinSchema.safeParse(formData.get("pin"));
  const confirm = String(formData.get("confirmPin") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!villaNo.success) return { ok: false, error: "Enter a villa number between 1 and 247." };
  if (!name) return { ok: false, error: "Enter your name so the committee knows who registered." };
  if (!pin.success) return { ok: false, error: "PIN must be exactly 4 digits." };
  if (pin.data !== confirm) return { ok: false, error: "The two PINs don't match." };

  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, villaNo.data) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const existing = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });
  if (existing) return { ok: false, error: "This villa already has a PIN. Enter it to sign in." };

  await db.insert(villaAccounts).values({
    villaId: villa.id,
    pinHash: await bcrypt.hash(pin.data, 10),
    claimedByName: name,
    claimedPhone: phone || null,
    claimedAt: new Date(),
    lastLoginAt: new Date(),
  });

  await audit({
    actorType: "villa",
    actorId: villa.villaNo,
    action: "villa.claimed",
    entity: "villa_account",
    entityId: villa.id,
    after: { name, phone },
  });

  const session = await getSession();
  session.villaId = villa.id;
  session.villaNo = villa.villaNo;
  await session.save();
  redirect("/");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const villaNo = villaNoSchema.safeParse(formData.get("villaNo"));
  const pin = String(formData.get("pin") ?? "");
  if (!villaNo.success) return { ok: false, error: "Enter a villa number between 1 and 247." };

  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, villaNo.data) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const account = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });
  if (!account || !(await bcrypt.compare(pin, account.pinHash))) {
    return { ok: false, error: "That PIN doesn't match. Ask the committee to reset it if needed." };
  }

  await db
    .update(villaAccounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(villaAccounts.villaId, villa.id));

  const session = await getSession();
  session.villaId = villa.id;
  session.villaNo = villa.villaNo;
  await session.save();
  redirect("/");
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
