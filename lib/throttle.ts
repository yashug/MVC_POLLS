import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { audit } from "@/lib/audit";

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type Throttle = { locked: true; minutes: number } | { locked: false };

/** Call before checking a password. */
export async function checkThrottle(key: string): Promise<Throttle> {
  const row = await db.query.loginAttempts.findFirst({
    where: eq(loginAttempts.key, key),
  });
  if (!row?.lockedUntil) return { locked: false };

  const remaining = row.lockedUntil.getTime() - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, minutes: Math.max(1, Math.ceil(remaining / 60000)) };
}

export async function recordFailure(key: string) {
  const now = new Date();
  const row = await db.query.loginAttempts.findFirst({
    where: eq(loginAttempts.key, key),
  });

  if (!row) {
    await db.insert(loginAttempts).values({ key, failedCount: 1, updatedAt: now });
    return;
  }

  const count = row.failedCount + 1;
  if (count >= MAX_FAILURES) {
    await db
      .update(loginAttempts)
      .set({ failedCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS), updatedAt: now })
      .where(eq(loginAttempts.id, row.id));
    await audit({
      actorType: "system", actorId: key, action: "login.locked_out",
      entity: "login_attempts", entityId: row.id,
    });
    return;
  }

  await db
    .update(loginAttempts)
    .set({ failedCount: count, updatedAt: now })
    .where(eq(loginAttempts.id, row.id));
}

/** A correct password wipes the slate. */
export async function clearAttempts(key: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}

export const lockedMessage = (minutes: number) =>
  `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask the committee to reset the PIN.`;
