import { cookies } from "next/headers";

export type Lang = "en" | "te";

const dict = {
  /* chrome */
  appName:        { en: "Venice City Ganesh Chaturthi", te: "వేనిస్ సిటీ గణేష్ చతుర్థి" },
  community:      { en: "Mirchi Venice City · Kollur", te: "మిర్చి వేనిస్ సిటీ · కొల్లూరు" },
  villa:          { en: "Villa", te: "విల్లా" },
  signOut:        { en: "Sign out", te: "సైన్ అవుట్" },
  back:           { en: "Back", te: "వెనుకకు" },
  save:           { en: "Save", te: "సేవ్ చేయి" },
  cancel:         { en: "Cancel", te: "రద్దు" },
  schedule:       { en: "Festival schedule", te: "ఉత్సవ షెడ్యూల్" },
  results:        { en: "Results", te: "ఫలితాలు" },

  /* login */
  loginTitle:     { en: "Enter your villa", te: "మీ విల్లా నంబర్ ఇవ్వండి" },
  villaNumber:    { en: "Villa number", te: "విల్లా నంబర్" },
  pin:            { en: "PIN", te: "పిన్" },
  setPin:         { en: "Set a 4-digit PIN", te: "4 అంకెల పిన్ పెట్టండి" },
  confirmPin:     { en: "Confirm PIN", te: "పిన్ మళ్లీ ఇవ్వండి" },
  yourName:       { en: "Your name", te: "మీ పేరు" },
  phone:          { en: "Mobile number", te: "మొబైల్ నంబర్" },
  continueBtn:    { en: "Continue", te: "కొనసాగించు" },
  firstTime:      { en: "This villa hasn't been claimed yet. Set a PIN to register it.", te: "ఈ విల్లా ఇంకా నమోదు కాలేదు. పిన్ పెట్టి నమోదు చేసుకోండి." },
  alreadyRegistered: { en: "This villa is already registered", te: "ఈ విల్లా ఇప్పటికే నమోదైంది" },
  forgotPin:      { en: "Forgot the PIN? Ask the committee to reset it.", te: "పిన్ మర్చిపోయారా? కమిటీని రీసెట్ చేయమని అడగండి." },

  /* home */
  openNow:        { en: "Open now", te: "ఇప్పుడు తెరిచి ఉంది" },
  notOpenYet:     { en: "Opens soon", te: "త్వరలో తెరుస్తాం" },
  closed:         { en: "Closed", te: "మూసివేయబడింది" },
  drawn:          { en: "Draw complete", te: "డ్రా పూర్తయింది" },
  luckyDraw:      { en: "Lucky draw", te: "లక్కీ డ్రా" },
  signUp:         { en: "Sign-up", te: "నమోదు" },
  registered:     { en: "Registered", te: "నమోదైంది" },
  notRegistered:  { en: "Not registered", te: "నమోదు కాలేదు" },
  entriesSoFar:   { en: "entries so far", te: "ఇప్పటివరకు నమోదులు" },
  closesOn:       { en: "Closes", te: "ముగింపు" },
  drawOn:         { en: "Draw", te: "డ్రా" },

  /* entries + groups */
  enterDraw:      { en: "Enter the draw", te: "డ్రాలో చేరండి" },
  yourEntry:      { en: "Your entry", te: "మీ నమోదు" },
  withdraw:       { en: "Withdraw", te: "ఉపసంహరించు" },
  groupTitle:     { en: "Your group", te: "మీ గ్రూప్" },
  addVilla:       { en: "Add a villa", te: "విల్లా చేర్చండి" },
  remove:         { en: "Remove", te: "తొలగించు" },
  pendingNote:    { en: "A villa is only part of your entry once it accepts. Anyone still waiting when registration closes is left out, and the rest of the entry still goes into the draw.", te: "ఒక విల్లా అంగీకరించిన తర్వాతే మీ నమోదులో భాగం అవుతుంది. నమోదు ముగిసే సమయానికి అంగీకరించని వారు మినహాయించబడతారు, మిగిలిన నమోదు డ్రాలో ఉంటుంది." },
  soloOrGroup:    { en: "You can enter on your own, or together with other villas. Either way it counts as one ticket in the draw.", te: "మీరు ఒక్కరుగా చేరవచ్చు, లేదా ఇతర విల్లాలతో కలిసి చేరవచ్చు. రెండూ డ్రాలో ఒకే టికెట్‌గా లెక్కిస్తారు." },
  addOptional:    { en: "Sharing with other villas? Optional", te: "ఇతర విల్లాలతో కలిసి చేయాలా? ఐచ్ఛికం" },
  editUntil:      { en: "You can change this until", te: "దీన్ని మార్చుకోవచ్చు" },
  lockedNow:      { en: "Registration has closed. This is now read-only.", te: "నమోదు ముగిసింది. ఇప్పుడు చదవడం మాత్రమే." },
  pendingInvite:  { en: "waiting to accept", te: "అంగీకారం కోసం వేచి ఉంది" },
  accept:         { en: "Accept", te: "అంగీకరించు" },
  decline:        { en: "Decline", te: "తిరస్కరించు" },
  leaveGroup:     { en: "Leave this group", te: "గ్రూప్ నుండి వైదొలగు" },

  /* draw */
  spinTheWheel:   { en: "Spin the wheel", te: "చక్రం తిప్పండి" },
  winner:         { en: "Winner", te: "విజేత" },
  runnersUp:      { en: "Runners-up", te: "తదుపరి స్థానాలు" },
  entrants:       { en: "entrants", te: "పోటీదారులు" },
  howChosen:      { en: "How the winner was chosen", te: "విజేతను ఎలా ఎంచుకున్నారు" },
  howChosenBody:  { en: "Everyone who entered went into one list, and that list was locked before the wheel moved — nothing could be added or taken out after that. The wheel ran on every screen at the same moment and stopped on the same villa on all of them.", te: "పాల్గొన్న అందరూ ఒకే జాబితాలో చేరారు, చక్రం తిరిగే ముందే ఆ జాబితా లాక్ చేయబడింది — ఆ తర్వాత ఎవరినీ చేర్చడం లేదా తీసివేయడం సాధ్యం కాదు. అన్ని స్క్రీన్లలో ఒకే క్షణంలో చక్రం తిరిగి, అన్నిటిలోనూ ఒకే విల్లా వద్ద ఆగింది." },
  entriesInDraw:  { en: "entries in this draw", te: "ఈ డ్రాలో నమోదులు" },
  drawnOn:        { en: "drawn", te: "డ్రా జరిగింది" },
  referenceCodes: { en: "Reference codes", te: "రిఫరెన్స్ కోడ్‌లు" },
  referenceNote:  { en: "The committee keeps these so the draw can be checked again later. You do not need them.", te: "డ్రాను తర్వాత మళ్లీ తనిఖీ చేయడానికి కమిటీ వీటిని ఉంచుతుంది. మీకు ఇవి అవసరం లేదు." },
  entryListCode:  { en: "Entry list", te: "నమోదుల జాబితా" },
  drawSeedCode:   { en: "Draw seed", te: "డ్రా సీడ్" },
  watchLive:      { en: "Watch the draw live", te: "లక్కీ డ్రా ప్రత్యక్షంగా చూడండి" },
  drawIsLive:     { en: "The draw is happening now", te: "డ్రా ఇప్పుడు జరుగుతోంది" },
  getReady:       { en: "Starting in", te: "ప్రారంభం" },
  notLiveYet:     { en: "The wheel starts when the committee begins the draw. Keep this page open — it starts on its own.", te: "కమిటీ డ్రా ప్రారంభించగానే చక్రం తిరుగుతుంది. ఈ పేజీని తెరిచి ఉంచండి — అదే మొదలవుతుంది." },
  everyoneTogether: { en: "Every villa sees this wheel turn at the same moment.", te: "ప్రతి విల్లా ఈ చక్రాన్ని ఒకే క్షణంలో చూస్తుంది." },

  /* slots */
  choose:         { en: "Choose", te: "ఎంచుకోండి" },
  yours:          { en: "Yours", te: "మీది" },
  full:           { en: "Full", te: "నిండింది" },
  reserved:       { en: "Reserved", te: "కేటాయించబడింది" },
  places:         { en: "places", te: "స్థానాలు" },
  wanted:         { en: "sponsoring", te: "స్పాన్సర్ చేస్తున్నారు" },
  expecting:      { en: "expecting", te: "అంచనా" },
  // Doubles as the placeholder in a narrow input, so it has to stay short —
  // "optional" earns its place there more than "amount" does.
  amountLabel:    { en: "₹ optional", te: "₹ ఐచ్ఛికం" },
  partialLabel:   { en: "towards this meal", te: "ఈ భోజనం కోసం" },
  amountTbc:      { en: "No amount set — that's perfectly fine. Sponsors of a meal usually share it equally, and you can settle it with the committee later.", te: "మొత్తం పెట్టలేదు — అది పూర్తిగా సరైనదే. ఒకే భోజనం దాతలు సాధారణంగా సమానంగా పంచుకుంటారు, తర్వాత కమిటీతో ఖరారు చేసుకోవచ్చు." },
  detailsTitle:   { en: "Add family details", te: "కుటుంబ వివరాలు" },
  familyName:     { en: "Family name", te: "కుటుంబ పేరు" },
  gotram:         { en: "Gotram", te: "గోత్రం" },
  attendees:      { en: "How many attending", te: "ఎంతమంది వస్తారు" },
  movedTo:        { en: "Moved to another session by the committee", te: "కమిటీ మరో సమయానికి మార్చింది" },
  allocatedHere:  { en: "Confirmed for this session", te: "ఈ సమయానికి ఖరారైంది" },
  willDraw:       { en: "More villas than places — this session goes to a draw", te: "స్థానాల కంటే ఎక్కువ విల్లాలు — ఈ సమయానికి లక్కీ డ్రా" },
  notPlaced:      { en: "This session went to a draw and you missed out — the committee will offer you another", te: "ఈ సమయానికి లక్కీ డ్రా జరిగింది, మీకు రాలేదు — కమిటీ మరో సమయాన్ని ఇస్తుంది" },
  waitingSlot:    { en: "Awaiting a session", te: "సమయం కోసం వేచి ఉంది" },
  pickSession:    { en: "Pick a session", te: "ఒక సమయాన్ని ఎంచుకోండి" },
  pickSessions:   { en: "Pick the sessions you'd like to sponsor", te: "మీరు స్పాన్సర్ చేయాలనుకున్న సమయాలను ఎంచుకోండి" },
  oversubscribed: { en: "If more villas want a session than it holds, that session goes to a draw.", te: "ఒక సమయానికి ఎక్కువ విల్లాలు కోరితే, ఆ సమయానికి లక్కీ డ్రా నిర్వహిస్తాం." },
  committeeAllots:{ en: "As many villas as like can share one meal, and you don't have to name an amount to take part. So that every day has someone, the committee may place you on another day — you'll see it here if that happens.", te: "ఒకే భోజనాన్ని ఎన్ని విల్లాలైనా కలిసి స్పాన్సర్ చేయవచ్చు, పాల్గొనడానికి మొత్తం చెప్పాల్సిన అవసరం లేదు. ప్రతి రోజుకీ దాతలు ఉండేలా కమిటీ మిమ్మల్ని మరో రోజుకు మార్చవచ్చు — అలా జరిగితే ఇక్కడే కనిపిస్తుంది." },
  invitesTitle:   { en: "Waiting for your answer", te: "మీ సమాధానం కోసం" },
  invitedYou:     { en: "added you to their group", te: "మిమ్మల్ని వారి గ్రూప్‌లో చేర్చారు" },
} as const;

export type Key = keyof typeof dict;

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return c.get("lang")?.value === "te" ? "te" : "en";
}

/** Returns a translator bound to the reader's language. */
export async function getT() {
  const lang = await getLang();
  const t = (k: Key) => dict[k][lang];
  return { t, lang };
}

/** Pick the right column off a row that carries both languages. */
export function pick<T extends Record<string, unknown>>(
  row: T,
  base: string,
  lang: Lang,
): string {
  const key = base + (lang === "te" ? "Te" : "En");
  return (row[key] as string) ?? (row[base + "En"] as string) ?? "";
}
