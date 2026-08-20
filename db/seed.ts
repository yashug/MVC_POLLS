import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  admins, auditLog, drawResults, draws, entries, entryMembers, events, items,
  loginAttempts, pattuVastralu, payments, previousWinners, settings, slots,
  villaAccounts, villas,
} from "./schema";
import { ist } from "../lib/ist";
import { ITEM_COPY, RESERVED_SESSION } from "./content";
import { describeTarget } from "../lib/db-target";

const VILLA_COUNT = 247;
const YEAR = 2026;

/** Child rows first — every one of these points upward. */
async function wipe() {
  await db.delete(auditLog);
  await db.delete(loginAttempts);
  await db.delete(pattuVastralu);
  await db.delete(drawResults);
  await db.delete(draws);
  await db.delete(payments);
  await db.delete(entryMembers);
  await db.delete(entries);
  await db.delete(villaAccounts);
  await db.delete(slots);
  await db.delete(items);
  await db.delete(settings);
  await db.delete(previousWinners);
  await db.delete(villas);
  await db.delete(admins);
  await db.delete(events);
}

async function main() {
  const now = new Date();
  const target = describeTarget();
  console.log(`→ ${target}`);

  const existing = await db.query.events.findFirst();
  if (existing) {
    if (process.env.FORCE_RESEED !== "1") {
      console.error(
        [
          "",
          `This database already holds ${existing.name} ${existing.year}.`,
          "Seeding again would duplicate every villa, item and session.",
          "",
          "  • wrong database?  put TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in front of the command",
          "  • local, start over?  npm run db:reset",
          "  • really wipe THIS one and reseed?  FORCE_RESEED=1 npm run db:seed",
          "",
        ].join("\n"),
      );
      process.exit(1);
    }
    console.log(`  FORCE_RESEED=1 — erasing everything in ${target} first`);
    await wipe();
  }

  /* Event ------------------------------------------------------------- */
  const [event] = await db
    .insert(events)
    .values({
      name: "Ganesh Chaturthi",
      year: YEAR,
      startsOn: "2026-09-14",
      endsOn: "2026-09-19",
      isActive: true,
      createdAt: now,
    })
    .returning();

  /* Villas — plain 1..247 --------------------------------------------- */
  await db.insert(villas).values(
    Array.from({ length: VILLA_COUNT }, (_, i) => ({ villaNo: i + 1, isActive: true })),
  );

  /* Admin -------------------------------------------------------------- */
  const adminPassword = process.env.ADMIN_PASSWORD ?? "venice-ganesha-2026";
  await db.insert(admins).values({
    username: "admin",
    passwordHash: await bcrypt.hash(adminPassword, 10),
  });

  /* Items -------------------------------------------------------------- */
  const [idol, pooja, laddu9, laddu2, food] = await db
    .insert(items)
    .values([
      {
        eventId: event.id,
        slug: "idol-donation",
        kind: "lucky_dip",
        ...ITEM_COPY["idol-donation"],
        maxGroupSize: 4,
        maxEntriesPerVilla: 1,
        requiresAcceptance: true,
        winnerCount: 1,
        opensAt: ist(2026, 8, 20, 0, 1),
        closesAt: ist(2026, 8, 22, 16, 0),
        drawAt: ist(2026, 8, 22, 18, 30),
        status: "open",
        sortOrder: 1,
      },
      {
        eventId: event.id,
        slug: "pooja-slots",
        kind: "opt_in",
        ...ITEM_COPY["pooja-slots"],
        maxGroupSize: 1,
        maxEntriesPerVilla: 1,
        collectsSlot: true,
        requiresAcceptance: false,
        opensAt: ist(2026, 8, 20, 0, 1),
        closesAt: ist(2026, 9, 10, 20, 0),
        status: "open",
        sortOrder: 2,
      },
      {
        eventId: event.id,
        slug: "laddu-9kg",
        kind: "lucky_dip",
        ...ITEM_COPY["laddu-9kg"],
        maxGroupSize: 2,
        maxEntriesPerVilla: 1,
        requiresAcceptance: true,
        winnerCount: 1,
        opensAt: ist(2026, 8, 20, 0, 1),
        closesAt: ist(2026, 9, 5, 20, 0),
        drawAt: ist(2026, 9, 6, 18, 30),
        status: "open",
        sortOrder: 3,
      },
      {
        eventId: event.id,
        slug: "laddu-2kg",
        kind: "lucky_dip",
        ...ITEM_COPY["laddu-2kg"],
        maxGroupSize: 1,
        maxEntriesPerVilla: 1,
        entryFee: 50,
        requiresAcceptance: false,
        winnerCount: 1,
        opensAt: ist(2026, 8, 20, 0, 1),
        closesAt: ist(2026, 9, 5, 20, 0),
        drawAt: ist(2026, 9, 6, 19, 0),
        status: "open",
        sortOrder: 4,
      },
      {
        eventId: event.id,
        slug: "annadanam",
        kind: "opt_in",
        ...ITEM_COPY["annadanam"],
        maxGroupSize: 99, // no limit on co-sponsors
        maxEntriesPerVilla: null, // a villa may sponsor several sessions
        collectsSlot: true,
        allowPartial: true,
        requiresAcceptance: false,
        opensAt: ist(2026, 8, 20, 0, 1),
        closesAt: ist(2026, 9, 8, 20, 0),
        status: "open",
        sortOrder: 5,
      },
    ])
    .returning();

  /* Pooja slots — Sep 14 evening locked, 15–18 both, 19 morning only --- */
  const poojaSlots: (typeof slots.$inferInsert)[] = [
    {
      itemId: pooja.id, date: "2026-09-14", period: "evening", capacity: 0, isLocked: true,
      lockNoteEn: RESERVED_SESSION.lockNoteEn,
      lockNoteTe: RESERVED_SESSION.lockNoteTe,
      sortOrder: 0,
    },
  ];
  let order = 1;
  for (const day of ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"]) {
    for (const period of ["morning", "evening"] as const) {
      poojaSlots.push({ itemId: pooja.id, date: day, period, capacity: 5, sortOrder: order++ });
    }
  }
  poojaSlots.push({
    itemId: pooja.id, date: "2026-09-19", period: "morning", capacity: 5, sortOrder: order++,
  });
  await db.insert(slots).values(poojaSlots);

  /* Annadanam — every dinner, plus breakfast and lunch on the last day -- */
  const foodSlots: (typeof slots.$inferInsert)[] = [];
  order = 0;
  for (const day of [
    "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18",
  ]) {
    foodSlots.push({ itemId: food.id, date: day, period: "dinner", capacity: 99, sortOrder: order++ });
  }
  for (const period of ["breakfast", "lunch", "dinner"] as const) {
    foodSlots.push({ itemId: food.id, date: "2026-09-19", period, capacity: 99, sortOrder: order++ });
  }
  await db.insert(slots).values(foodSlots);

  /* Settings ----------------------------------------------------------- */
  await db.insert(settings).values([
    { eventId: event.id, key: "exclude_cross_item_winners", value: "false" },
    { eventId: event.id, key: "exclude_previous_winners", value: "false" },
    { eventId: event.id, key: "winner_confirmation_enabled", value: "false" },
    { eventId: event.id, key: "winner_confirmation_hours", value: "12" },
    { eventId: event.id, key: "results_published", value: "false" },
  ]);

  void previousWinners; // 2026 is year one — nothing to exclude yet
  void idol; void laddu9; void laddu2;

  console.log(`✓ ${event.name} ${event.year} — ${target}`);
  console.log(`✓ ${VILLA_COUNT} villas`);
  console.log(`✓ 5 items · ${poojaSlots.length} pooja slots · ${foodSlots.length} annadanam slots`);
  console.log(`✓ admin / ${adminPassword}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
