import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { ITEM_COPY, RESERVED_SESSION } from "./content";
import { items, slots } from "./schema";
import { describeTarget } from "../lib/db-target";

/**
 * Push wording changes to a database that already holds registrations.
 * Touches only titles, blurbs, notes — never accounts, entries or draws.
 */
async function main() {
  console.log(`→ ${describeTarget()}`);
  let changed = 0;

  for (const [slug, copy] of Object.entries(ITEM_COPY)) {
    const row = await db.query.items.findFirst({ where: eq(items.slug, slug) });
    if (!row) {
      console.log(`  · ${slug} — not in this database, skipped`);
      continue;
    }
    const same =
      row.titleEn === copy.titleEn &&
      row.blurbEn === copy.blurbEn &&
      row.auctionNoteEn === copy.auctionNoteEn;
    await db.update(items).set({ ...copy }).where(eq(items.id, row.id));
    console.log(`  ${same ? "·" : "✓"} ${slug}${same ? " — unchanged" : " — updated"}`);
    if (!same) changed += 1;
  }

  const reserved = await db.query.slots.findFirst({
    where: and(eq(slots.date, RESERVED_SESSION.date), eq(slots.period, RESERVED_SESSION.period)),
  });
  if (reserved) {
    const same = reserved.lockNoteEn === RESERVED_SESSION.lockNoteEn;
    await db
      .update(slots)
      .set({
        lockNoteEn: RESERVED_SESSION.lockNoteEn,
        lockNoteTe: RESERVED_SESSION.lockNoteTe,
      })
      .where(eq(slots.id, reserved.id));
    console.log(`  ${same ? "·" : "✓"} reserved session${same ? " — unchanged" : " — updated"}`);
    if (!same) changed += 1;
  }

  console.log(changed ? `\n✓ ${changed} updated. No registrations touched.` : "\n· Already up to date.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
