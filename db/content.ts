/**
 * All resident-facing copy for the five items and the reserved session, in one
 * place. The seed writes it on first run; `db:refresh-content` pushes later
 * wording changes to a database that already holds registrations, without
 * touching accounts, entries or draws.
 */
export const ITEM_COPY = {
  "idol-donation": {
    titleEn: "Ganesh idol donation",
    titleTe: "గణేష్ విగ్రహ విరాళం",
    blurbEn:
      "Sponsor the Ganesh idol for Venice City — POP, 6 ft or under. Enter on your own, or as a group of up to 4 villas.",
    blurbTe:
      "వేనిస్ సిటీ గణేష్ విగ్రహాన్ని సమర్పించండి — POP, 6 అడుగుల లోపు. ఒక్కరుగా లేదా 4 విల్లాల వరకు గ్రూప్‌గా పాల్గొనవచ్చు.",
    auctionNoteEn:
      "The idol donor is expected to sponsor the pattu vastralu and the gaja mala for Lord Ganesha. The committee arranges the regular vastralu. The pattu vastralu is auctioned later, in person.",
    auctionNoteTe:
      "విగ్రహ దాత గణేశునికి పట్టు వస్త్రాలు మరియు గజమాల సమర్పించాల్సి ఉంటుంది. సాధారణ వస్త్రాలు కమిటీ ఏర్పాటు చేస్తుంది. పట్టు వస్త్రాలు తర్వాత ప్రత్యక్షంగా వేలం వేయబడతాయి.",
  },
  "pooja-slots": {
    titleEn: "Daily pooja",
    titleTe: "నిత్య పూజ",
    blurbEn:
      "Sit for pooja during the festival. Morning pooja is at 9:00 AM and evening pooja at 6:00 PM. Pick one session — if more villas want a session than it holds, that session goes to a draw.",
    blurbTe:
      "ఉత్సవంలో పూజకు కూర్చోండి. ఉదయం పూజ 9:00కి, సాయంత్రం పూజ 6:00కి. ఒక సమయాన్ని ఎంచుకోండి — ఒక సమయానికి ఎక్కువ విల్లాలు కోరితే, ఆ సమయానికి లక్కీ డిప్ నిర్వహిస్తాం.",
    auctionNoteEn: null,
    auctionNoteTe: null,
  },
  "laddu-9kg": {
    titleEn: "9 kg laddu donation",
    titleTe: "9 కిలోల లడ్డూ విరాళం",
    blurbEn: "Sponsor the 9 kg laddu. Enter on your own or with one other villa.",
    blurbTe: "9 కిలోల లడ్డూను సమర్పించండి. ఒక్కరుగా లేదా మరో విల్లాతో కలిసి పాల్గొనవచ్చు.",
    auctionNoteEn:
      "The 9 kg laddu is auctioned on Nimajjanam day, 19 September. The auction is held in person, not in this app.",
    auctionNoteTe:
      "9 కిలోల లడ్డూ నిమజ్జనం రోజు, సెప్టెంబర్ 19న వేలం వేయబడుతుంది. వేలం ప్రత్యక్షంగా జరుగుతుంది, ఈ యాప్‌లో కాదు.",
  },
  "laddu-2kg": {
    titleEn: "2 kg laddu draw",
    titleTe: "2 కిలోల లడ్డూ లక్కీ డిప్",
    blurbEn:
      "The association sponsors a 2 kg laddu and one villa takes it home. ₹50 token per villa, collected by the committee. Token amounts are not refunded.",
    blurbTe:
      "అసోసియేషన్ 2 కిలోల లడ్డూను స్పాన్సర్ చేస్తుంది, ఒక విల్లాకు అందుతుంది. విల్లాకు ₹50 టోకెన్, కమిటీ వసూలు చేస్తుంది. టోకెన్ మొత్తం తిరిగి ఇవ్వబడదు.",
    auctionNoteEn: null,
    auctionNoteTe: null,
  },
  annadanam: {
    titleEn: "Annadanam sponsorship",
    titleTe: "అన్నదాన స్పాన్సర్‌షిప్",
    blurbEn:
      "Sponsor a meal during the festival, in full or in part. The committee covers the rest and decides the menu.",
    blurbTe:
      "ఉత్సవంలో ఒక భోజనాన్ని పూర్తిగా లేదా పాక్షికంగా స్పాన్సర్ చేయండి. మిగిలినది కమిటీ భరిస్తుంది, మెనూ కమిటీ నిర్ణయిస్తుంది.",
    auctionNoteEn: null,
    auctionNoteTe: null,
  },
} as const;

/** The one session the committee assigns rather than opening to booking. */
export const RESERVED_SESSION = {
  date: "2026-09-14",
  period: "evening" as const,
  lockNoteEn: "Reserved for the idol, laddu and food sponsors — assigned by the committee",
  lockNoteTe: "విగ్రహ, లడ్డూ, భోజన దాతల కోసం — కమిటీ కేటాయిస్తుంది",
};
