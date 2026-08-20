import { db } from "@/db";
import { auditLog } from "@/db/schema";

type Entry = {
  actorType: "villa" | "admin" | "system";
  actorId?: string | number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  before?: unknown;
  after?: unknown;
};

/** Every change is recorded — it's what settles arguments after the draw. */
export async function audit(e: Entry) {
  await db.insert(auditLog).values({
    actorType: e.actorType,
    actorId: e.actorId != null ? String(e.actorId) : null,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId ?? null,
    before: e.before === undefined ? null : JSON.stringify(e.before),
    after: e.after === undefined ? null : JSON.stringify(e.after),
    at: new Date(),
  });
}
