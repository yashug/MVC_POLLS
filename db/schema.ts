import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

/* ── Community ─────────────────────────────────────────────── */

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  startsOn: text("starts_on").notNull(), // YYYY-MM-DD
  endsOn: text("ends_on").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const villas = sqliteTable(
  "villas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    villaNo: integer("villa_no").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [uniqueIndex("villas_no_uq").on(t.villaNo)],
);

/** One login per villa. First person to claim it sets the PIN; admin can reset. */
export const villaAccounts = sqliteTable("villa_accounts", {
  villaId: integer("villa_id")
    .primaryKey()
    .references(() => villas.id),
  pinHash: text("pin_hash").notNull(),
  claimedByName: text("claimed_by_name").notNull(),
  claimedPhone: text("claimed_phone"),
  claimedAt: integer("claimed_at", { mode: "timestamp_ms" }).notNull(),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  resetCount: integer("reset_count").notNull().default(0),
});

/**
 * Throttles sign-in guessing. A 4-digit PIN is only 10,000 combinations, which
 * is minutes of work without this.
 */
export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** "villa:42" or "admin:admin" */
    key: text("key").notNull(),
    failedCount: integer("failed_count").notNull().default(0),
    lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("login_attempts_key_uq").on(t.key)],
);

export const admins = sqliteTable(
  "admins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
  },
  (t) => [uniqueIndex("admins_username_uq").on(t.username)],
);

/* ── Registration items ────────────────────────────────────── */

export type ItemKind = "lucky_dip" | "opt_in";
export type ItemStatus = "draft" | "open" | "closed" | "drawn" | "published";

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    slug: text("slug").notNull(),
    kind: text("kind").$type<ItemKind>().notNull(),

    titleEn: text("title_en").notNull(),
    titleTe: text("title_te").notNull(),
    blurbEn: text("blurb_en").notNull().default(""),
    blurbTe: text("blurb_te").notNull().default(""),
    /** "What goes to auction" note — editable per item in admin. */
    auctionNoteEn: text("auction_note_en"),
    auctionNoteTe: text("auction_note_te"),

    maxGroupSize: integer("max_group_size").notNull().default(1),
    /** null = unlimited (food sponsorship) */
    maxEntriesPerVilla: integer("max_entries_per_villa").default(1),
    /** Timeline B: idol dip auto-accepts so nobody is locked out before Aug 22. */
    requiresAcceptance: integer("requires_acceptance", { mode: "boolean" })
      .notNull()
      .default(true),
    entryFee: integer("entry_fee").notNull().default(0), // whole rupees
    allowPartial: integer("allow_partial", { mode: "boolean" }).notNull().default(false),
    collectsSlot: integer("collects_slot", { mode: "boolean" }).notNull().default(false),
    winnerCount: integer("winner_count").notNull().default(1),

    opensAt: integer("opens_at", { mode: "timestamp_ms" }),
    closesAt: integer("closes_at", { mode: "timestamp_ms" }),
    drawAt: integer("draw_at", { mode: "timestamp_ms" }),

    status: text("status").$type<ItemStatus>().notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("items_event_slug_uq").on(t.eventId, t.slug)],
);

export type SlotPeriod = "morning" | "evening" | "breakfast" | "lunch" | "dinner";

export const slots = sqliteTable(
  "slots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    date: text("date").notNull(), // YYYY-MM-DD
    period: text("period").$type<SlotPeriod>().notNull(),
    capacity: integer("capacity").notNull().default(5),
    adultsCount: integer("adults_count").notNull().default(0),
    kidsCount: integer("kids_count").notNull().default(0),
    /** Sep 14 evening is reserved for the idol donors. */
    isLocked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
    lockNoteEn: text("lock_note_en"),
    lockNoteTe: text("lock_note_te"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("slots_item_date_period_uq").on(t.itemId, t.date, t.period)],
);

/* ── Entries ───────────────────────────────────────────────── */

export type EntryStatus = "active" | "withdrawn";

export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    leadVillaId: integer("lead_villa_id")
      .notNull()
      .references(() => villas.id),

    /** What they asked for vs what the draw/admin gave them. */
    requestedSlotId: integer("requested_slot_id").references(() => slots.id),
    assignedSlotId: integer("assigned_slot_id").references(() => slots.id),

    amountPledged: integer("amount_pledged"),
    isPartial: integer("is_partial", { mode: "boolean" }).notNull().default(false),

    gotram: text("gotram"),
    familyName: text("family_name"),
    attendeesCount: integer("attendees_count"),
    notes: text("notes"),

    status: text("status").$type<EntryStatus>().notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("entries_item_idx").on(t.itemId, t.status)],
);

export type Acceptance = "pending" | "accepted" | "declined";

export const entryMembers = sqliteTable(
  "entry_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    /** Denormalised so the DB itself can enforce one-entry-per-villa-per-item. */
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    /** requestedSlotId, or 0 when the item has no slots — keeps the unique index honest,
     *  since SQLite treats NULLs as distinct. */
    slotKey: integer("slot_key").notNull().default(0),
    villaId: integer("villa_id")
      .notNull()
      .references(() => villas.id),
    role: text("role").$type<"lead" | "member">().notNull(),
    acceptance: text("acceptance").$type<Acceptance>().notNull().default("pending"),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("entry_members_item_villa_slot_uq").on(t.itemId, t.villaId, t.slotKey),
    index("entry_members_villa_idx").on(t.villaId),
  ],
);

/* ── Money (offline, admin-verified) ───────────────────────── */

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: integer("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  villaId: integer("villa_id")
    .notNull()
    .references(() => villas.id),
  amount: integer("amount").notNull(),
  status: text("status").$type<"due" | "paid" | "waived">().notNull().default("due"),
  markedBy: text("marked_by"),
  markedAt: integer("marked_at", { mode: "timestamp_ms" }),
  note: text("note"),
});

/* ── Draws ─────────────────────────────────────────────────── */

export const draws = sqliteTable("draws", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  /** Pooja draws run per slot when a slot is oversubscribed. */
  slotId: integer("slot_id").references(() => slots.id),
  method: text("method").$type<"app_wheel" | "physical">().notNull(),
  /** Committed before the wheel spins; published after, so anyone can verify. */
  seed: text("seed").notNull(),
  entrantHash: text("entrant_hash").notNull(),
  entrantSnapshot: text("entrant_snapshot").notNull(), // JSON
  /** When every wheel starts turning. Set by "Go live"; all clients sync to it. */
  spinStartsAt: integer("spin_starts_at", { mode: "timestamp_ms" }),
  ranAt: integer("ran_at", { mode: "timestamp_ms" }),
  ranBy: text("ran_by"),
  status: text("status").$type<"pending" | "completed" | "published">().notNull().default("pending"),
});

export const drawResults = sqliteTable(
  "draw_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    drawId: integer("draw_id")
      .notNull()
      .references(() => draws.id, { onDelete: "cascade" }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => entries.id),
    /** 1 = winner, 2+ = runner-up order. */
    rank: integer("rank").notNull(),
    confirmationStatus: text("confirmation_status")
      .$type<"n/a" | "pending" | "accepted" | "declined">()
      .notNull()
      .default("n/a"),
    confirmDeadlineAt: integer("confirm_deadline_at", { mode: "timestamp_ms" }),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("draw_results_draw_rank_uq").on(t.drawId, t.rank)],
);

/** Offered to the idol winner only, after the draw. Never mandatory. */
export const pattuVastralu = sqliteTable("pattu_vastralu", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  drawResultId: integer("draw_result_id")
    .notNull()
    .references(() => drawResults.id, { onDelete: "cascade" }),
  opted: integer("opted", { mode: "boolean" }),
  respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
  note: text("note"),
});

/* ── Admin config, history, audit ──────────────────────────── */

export const settings = sqliteTable(
  "settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => [uniqueIndex("settings_event_key_uq").on(t.eventId, t.key)],
);

/** Empty for 2026; feeds the "exclude last year's winners" toggle in 2027. */
export const previousWinners = sqliteTable("previous_winners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  villaId: integer("villa_id")
    .notNull()
    .references(() => villas.id),
  itemSlug: text("item_slug").notNull(),
  year: integer("year").notNull(),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorType: text("actor_type").$type<"villa" | "admin" | "system">().notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: integer("entity_id"),
    before: text("before"),
    after: text("after"),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("audit_at_idx").on(t.at)],
);
