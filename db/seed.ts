import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  admins, events, items, previousWinners, settings, slots, villas,
} from "./schema";
import { ist } from "../lib/ist";

const VILLA_COUNT = 247;
const YEAR = 2026;

async function main() {
  const now = new Date();

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
        titleEn: "Ganesh idol donation",
        titleTe: "గణేష్ విగ్రహ విరాళం",
        blurbEn:
          "Sponsor the Ganesh idol for Venice City. Enter on your own, or as a group of up to 4 villas.",
        blurbTe:
          "వేనిస్ సిటీ గణేష్ విగ్రహాన్ని సమర్పించండి. ఒక్కరుగా లేదా 4 విల్లాల వరకు గ్రూప్‌గా పాల్గొనవచ్చు.",
        auctionNoteEn:
          "The winner of the idol donation will also have the option to donate pattu vastralu. This is not mandatory — if the winner chooses not to, the committee will arrange it. Pattu vastralu is auctioned separately, offline.",
        auctionNoteTe:
          "విగ్రహ విరాళం గెలుపొందినవారికి పట్టు వస్త్రాలు సమర్పించే అవకాశం కూడా ఉంటుంది. ఇది తప్పనిసరి కాదు — వారు ఇష్టపడకపోతే కమిటీ ఏర్పాటు చేస్తుంది. పట్టు వస్త్రాలు విడిగా, ఆఫ్‌లైన్‌లో వేలం వేయబడతాయి.",
        maxGroupSize: 4,
        maxEntriesPerVilla: 1,
        requiresAcceptance: false, // group members are added directly — nobody gets locked out before Aug 22
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
        titleEn: "Daily pooja",
        titleTe: "నిత్య పూజ",
        blurbEn:
          "Sit for pooja during the festival. Pick one session — if more villas want a session than it holds, that session goes to a draw.",
        blurbTe:
          "ఉత్సవంలో పూజకు కూర్చోండి. ఒక సమయాన్ని ఎంచుకోండి — ఒక సమయానికి ఎక్కువ విల్లాలు కోరితే, ఆ సమయానికి లక్కీ డిప్ నిర్వహిస్తాం.",
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
        titleEn: "9 kg laddu donation",
        titleTe: "9 కిలోల లడ్డూ విరాళం",
        blurbEn: "Sponsor the 9 kg laddu. Enter on your own or with one other villa.",
        blurbTe: "9 కిలోల లడ్డూను సమర్పించండి. ఒక్కరుగా లేదా మరో విల్లాతో కలిసి పాల్గొనవచ్చు.",
        auctionNoteEn: "The 9 kg laddu will be auctioned at the festival. The auction is held offline.",
        auctionNoteTe: "9 కిలోల లడ్డూ ఉత్సవంలో వేలం వేయబడుతుంది. వేలం ఆఫ్‌లైన్‌లో జరుగుతుంది.",
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
        titleEn: "2 kg laddu draw",
        titleTe: "2 కిలోల లడ్డూ లక్కీ డిప్",
        blurbEn:
          "The association sponsors a 2 kg laddu and one villa takes it home. ₹50 token per villa, collected by the committee. Token amounts are not refunded.",
        blurbTe:
          "అసోసియేషన్ 2 కిలోల లడ్డూను స్పాన్సర్ చేస్తుంది, ఒక విల్లాకు అందుతుంది. విల్లాకు ₹50 టోకెన్, కమిటీ వసూలు చేస్తుంది. టోకెన్ మొత్తం తిరిగి ఇవ్వబడదు.",
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
        titleEn: "Annadanam sponsorship",
        titleTe: "అన్నదాన స్పాన్సర్‌షిప్",
        blurbEn:
          "Sponsor a meal during the festival, in full or in part. The committee covers the rest and decides the menu.",
        blurbTe:
          "ఉత్సవంలో ఒక భోజనాన్ని పూర్తిగా లేదా పాక్షికంగా స్పాన్సర్ చేయండి. మిగిలినది కమిటీ భరిస్తుంది, మెనూ కమిటీ నిర్ణయిస్తుంది.",
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
      lockNoteEn: "Reserved for the idol donors",
      lockNoteTe: "విగ్రహ దాతల కోసం కేటాయించబడింది",
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

  console.log(`✓ ${event.name} ${event.year}`);
  console.log(`✓ ${VILLA_COUNT} villas`);
  console.log(`✓ 5 items · ${poojaSlots.length} pooja slots · ${foodSlots.length} annadanam slots`);
  console.log(`✓ admin / ${adminPassword}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
