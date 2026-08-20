# Venice City Ganesh Chaturthi 2026

Registration and lucky draws for Ganesh Chaturthi at Mirchi Venice City, Kollur —
14 to 19 September 2026. One login per villa, 247 villas.

## Running it

```bash
npm install
npm run db:migrate     # create the database
npm run db:seed        # 247 villas, 5 items, pooja + annadanam slots
npm run dev            # http://localhost:3000
```

`npm run db:reset` wipes and rebuilds from scratch. **Stop the dev server first** —
it holds an open handle to the database file.

### Environment

`.env.local` (already created, not committed):

```
SESSION_SECRET=<32+ random chars>
ADMIN_PASSWORD=venice-ganesha-2026
```

Change `ADMIN_PASSWORD` and re-seed before going live.

### Where the data lives

SQLite via libSQL. With no environment variables it's a local file at
`data/mvc-polls.db` — runs on a laptop, works without internet. Set
`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to point the same code at hosted
libSQL for the Vercel deployment. No code changes either way.

## How residents get in

Villa number, then a 4-digit PIN. The first person to open the app for a villa
sets its PIN and gives their name; everyone after needs that PIN. The committee
can clear any villa's PIN from the dashboard, and can register on a resident's
behalf for anyone who can't use a phone.

There is nothing to distribute — post the link in the WhatsApp group and it works.

## Committee dashboard

`/admin` — sign in with `admin` and the password above.

- Open and close each item, set the open/close/draw times (all IST)
- See entrants per item with names and villa numbers
- Prepare a draw (wheel or physical), run it, publish it
- Mark ₹50 tokens paid
- Reset villa PINs, register on a resident's behalf
- Allocate pooja and annadanam sessions, and move anyone between them
- Set places per session and expected adults/kids
- Export everything to CSV, print the committee report, read the audit log

### Running a draw — everyone watches together

1. **Prepare** the draw. This closes registration, freezes the entrant list,
   takes a SHA-256 checksum of it, and commits a random seed.
2. Residents get a **Watch the draw live** banner on their home screen. They can
   open it early and leave it sitting there — it starts on its own.
3. **Go live.** Every watching phone shows the same 12-second countdown, then
   every wheel starts turning at the same instant and lands on the same segment
   at the same moment.
4. **Publish** — the result then appears on the results page for everyone,
   including anyone who wasn't watching.

The winner is decided by the committed seed *before* anything moves, so no phone
is deciding anything locally — each one animates to a result that was already
fixed. Wheel position is a pure function of server time, which is why 247 phones
stay in step, and why a phone that joins halfway through drops into the spin at
the correct position instead of starting over.

Nothing about the winner is sent to any device until the countdown reaches zero,
so it can't be read out of the network tab during the countdown. The seed is
released only once the wheel has stopped. Seed and checksum are published with
the result so anyone can recompute the same order afterwards.

The draw is recorded on the clock, not on whether the committee's browser stayed
open — closing the laptop mid-spin doesn't lose the result. A full runner-up
ordering is kept in case a winner backs out.

Cancelling a prepared draw reopens registration and discards the seed.

Physical draws work too: prepare with **Prepare physical draw**, hold it in front
of everyone, then record which entry won.

## The five items

| Item | Type | Group | Closes | Notes |
|---|---|---|---|---|
| Ganesh idol donation | Lucky draw | up to 4 villas | 22 Aug | Winner is offered pattu vastralu, never required |
| Daily pooja | Sessions | — | 10 Sep | 9 sessions; 14 Sep evening locked for idol donors |
| 9 kg laddu donation | Lucky draw | up to 2 villas | 5 Sep | Auctioned at the festival |
| 2 kg laddu | Lucky draw | 1 villa | 5 Sep | ₹50 token, collected offline, no refunds |
| Annadanam | Sessions | unlimited | 8 Sep | 8 meals, part sponsorship allowed |

All five open on 20 August. Every date is editable on the dashboard.

## Sessions: pooja and annadanam

Both work off the same booking model, but they settle differently.

**Pooja** gives each villa one session. A villa may request a session that is
already full — that is deliberate, and it is what sends the session to a draw.
When the committee runs the allocation:

- sessions with room for everyone are filled directly, no draw
- oversubscribed sessions go to a seeded draw, each recording its own entrant
  checksum and seed
- villas that miss out are left unplaced and appear in a **Needs a session** pool
  for the committee to move somewhere with room

A resident always sees which of the four states they are in: asked for, confirmed
here, moved elsewhere, or not placed yet.

**Annadanam** has no draw. A villa may sponsor several meals, several villas may
share one, and a pledged amount is optional — the committee covers the rest and
decides the menu. The committee confirms everyone and can move sponsors between
meals to spread them out.

Running the allocation again is safe; **Clear allocation** wipes assignments and
the session draws so it can be redone from scratch.

A group counts as **one ticket** in a draw, however many villas are in it.
One entry per villa per item, enforced by the database — except annadanam, where
a villa may sponsor several sessions.

Adding a villa to your group sends it an invitation; it only becomes part of the
entry once that villa accepts. Anyone still undecided when registration closes is
simply left out, and the rest of the entry goes into the draw as normal — so an
unresponsive neighbour can't sink the entry, and nobody is committed to a
donation they never agreed to.

The draw freezes only accepted members. A pending villa never appears on the
wheel or in a winning group.

## Status

**Phase 1 is built and working**: villa login, idol donation draw with groups,
committee dashboard, the synchronized live wheel every villa watches at once,
results with the pattu vastralu offer, audit log, CSV export, English/Telugu
toggle.

**Phase 2 is built and working**: pooja sessions with per-session draws and a
reallocation pool, 9 kg laddu with group invitations that must be accepted, 2 kg
laddu with ₹50 token tracking, annadanam sponsorship with pledged amounts and
committee allocation, the festival schedule page, and a printable committee
report at `/admin/report`.

**Still to come**: shareable result cards for the WhatsApp group, deadline
reminders, and cloning the event for 2027.

## The idol photo

The home page opens with a shrine arch. Drop a photo of the community's own idol
at `public/idol.jpg` (`.png` and `.webp` also work) and it appears inside the
arch automatically — no code change. Until then the arch holds the sacred
syllable. A photo of the real idol will always look better than a drawing, so
add one once the idol is chosen.

## Music

The landing page plays an ambient tanpura drone with an occasional temple bell.
It is synthesised in the browser with the Web Audio API rather than streamed, so
there is no audio file to load, nothing to license, and it works offline.

It is on by default, but browsers refuse to start audio until someone actually
interacts with the page — so it begins at the first tap, which on the login
screen is the villa field. One tap on the control mutes it, and that choice is
remembered.

To use a real recording instead, replace the synthesis in
`components/AmbientAudio.tsx` with an `<audio>` element pointing at a file in
`public/` — and make sure you have the right to use it.

## Design

Palette and border motif come from Telangana handloom silk — Gadwal and
Narayanpet — since pattu vastralu is one of the donation items. The gold *zari*
band across the header is the same motif that wraps around the wheel's rim.
Cards with a gold border are lucky draws; plain-edged cards are direct sign-ups,
so the kind of thing is legible before reading a word.

The resident app is light, for bright daylight on cheap phone screens. The draw
stage is dark, for an evening gathering with the wheel projected.
