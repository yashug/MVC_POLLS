# Putting it online

## Why you need a hosted database

Locally the app writes to `data/mvc-polls.db`. Vercel can't use that — its
filesystem is wiped between requests, so every visitor would see a different,
empty database. Anything deployed needs hosted libSQL.

**Turso** is the match: it's the same libSQL the code already speaks, so nothing
in the app changes. Its free tier is far more than 247 villas will ever need.

Keep **two separate databases** — `preview` and `production`. That is what stops
committee testing from touching the real registration. They never share data.

---

## 1. Create the preview database

```bash
brew install tursodatabase/tap/turso     # or: curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup

turso db create venice-ganesh-preview
turso db show venice-ganesh-preview --url        # → libsql://…
turso db tokens create venice-ganesh-preview     # → long token
```

## 2. Fill it with the villas, items and sessions

Run the migration and seed from your laptop, pointed at Turso:

```bash
TURSO_DATABASE_URL="libsql://…" \
TURSO_AUTH_TOKEN="…" \
ADMIN_PASSWORD="pick-a-real-password" \
  npm run db:migrate

TURSO_DATABASE_URL="libsql://…" \
TURSO_AUTH_TOKEN="…" \
ADMIN_PASSWORD="pick-a-real-password" \
  npm run db:seed
```

You should see `247 villas · 5 items · 10 pooja slots · 8 annadanam slots`.

## 3. Deploy

No GitHub needed — the Vercel CLI deploys straight from this folder.

```bash
vercel login
vercel link          # accept the defaults; name it venice-ganesh
```

Add the environment variables to the **Preview** environment:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # copy this

vercel env add SESSION_SECRET preview        # paste the value above
vercel env add ADMIN_PASSWORD preview        # the password you seeded with
vercel env add TURSO_DATABASE_URL preview
vercel env add TURSO_AUTH_TOKEN preview
vercel env add APP_ENV preview               # type: preview
```

Then:

```bash
vercel deploy        # prints a https://…vercel.app URL
```

That URL is what you share.

## 4. Before you share it

- Open it yourself and confirm the **red testing banner** is on every page.
- Sign in at `/admin` and check the dashboard loads.
- Have one committee member claim a villa and register for something.

Anyone with the link can claim any unclaimed villa number, so treat the URL as
semi-private — share it in the committee group, not the community group. On
Vercel's Hobby plan preview URLs are public but unguessable; paid plans can put a
password in front of the whole deployment under **Deployment Protection**.

## 5. What to tell the committee

> Here's the app for Ganesh Chaturthi — please try it and tell me what's
> confusing. **Everything on it is a test. Nothing you register here counts**,
> and I'll wipe it all before the real one opens.
>
> Pick any villa number to sign in with, set any 4-digit PIN. Try registering
> for the idol draw, book a pooja session, and sponsor a meal.

Ask them specifically about: whether the Telugu reads naturally, whether the
group-of-4 flow makes sense, and whether it's obvious what each of the five
items is.

## 6. Wiping the test data

`/admin` → **Clear all test data**. It removes every registration, group, draw,
payment and villa PIN, and leaves the villas, items and sessions untouched. The
button only exists when `APP_ENV` is not `production`.

---

## Going live

Do this as a **separate database and deployment** — never by repointing the
preview at real data.

```bash
turso db create venice-ganesh-production
# migrate + seed it exactly as in step 2, with a different ADMIN_PASSWORD

vercel env add SESSION_SECRET production      # a NEW secret, not the preview one
vercel env add ADMIN_PASSWORD production
vercel env add TURSO_DATABASE_URL production  # the production database
vercel env add TURSO_AUTH_TOKEN production
vercel env add APP_ENV production             # type: production

vercel deploy --prod
```

With `APP_ENV=production` the testing banner and the reset button both disappear.

### Before you share the link

Anyone who has the URL can try to claim a villa that has not been registered yet.
That is the accepted trade-off of PIN login, and it is why:

- five wrong PINs lock that villa for 15 minutes (the committee can clear it from
  the dashboard, which also clears the lockout)
- the sign-in screen never shows who registered a villa, so the URL cannot be
  used to map villa numbers to residents

Share the link in the community WhatsApp group, not anywhere public, and ask
residents to register early — a registered villa cannot be claimed by anyone else.

Check before sharing with all 247 villas:

- [ ] the red banner is **gone**
- [ ] **Clear all test data** is gone from `/admin`
- [ ] the admin password is different from the preview one
- [ ] `/admin` shows `0 of 247 villas have signed in`
- [ ] the item dates on the dashboard are the ones you want
- [ ] you can sign in at `/admin` with the new password
- [ ] a test villa can register, then use **Clear all test data** — wait, that
      button is gone in production, so do this on preview instead and confirm
      production starts empty

## Backups

```bash
turso db shell venice-ganesh-production .dump > backup-$(date +%F).sql
```

Worth running the evening before each draw.

---

# Moving the database to Mumbai

> **Not done, on purpose.** Decided on 20 August 2026, before the idol draw. The
> query changes took the resident pages from ~15 database round trips to about
> six, and `/login` from 300ms to ~100ms, which was enough. What is left is
> roughly 700ms of Mumbai-to-Tokyo distance on the heaviest page — real, but not
> worth a dump and restore with registrations already live and a deadline two
> days out. Revisit if the app feels slow under real load, or when the event is
> cloned for 2027 and the database is empty anyway.

The app runs in `bom1` (Mumbai) — that is what `vercel.json` pins. The database
still answers from `aws-ap-northeast-1` (Tokyo), which is **~130ms per query**
from Mumbai against ~10ms for a database in the same city. The home page makes
about six trips, so roughly 700ms of every page load is the Bay of Bengal.

A Turso group's primary location is **fixed when the group is created**. There is
no command that moves it. So this is a dump and restore, and it needs a window
where nobody is registering.

Read the whole thing before starting. Do it at a quiet hour.

## Do not use replicas for this

Adding a Mumbai replica location looks like the easy answer — it is one command
and no downtime — but it is wrong for this app. Replicas serve **reads** locally
while writes still go to the Tokyo primary, and read-after-write is only
guaranteed on a continuous connection. Every request here opens a fresh libSQL
client, so a villa could register, land back on the home page, read a replica
that has not caught up, and be told it is not registered. Worse, it could set a
PIN and be told the PIN is wrong a second later.

## Step 0 — which path you are on

The starter plan allows one group. `turso group list` already shows `default`,
so try to make a second one and see whether the quota lets you:

```bash
turso group locations list                  # confirm Mumbai is aws-ap-south-1
turso group create venice-bom --location aws-ap-south-1
```

**If that succeeds — Path A.** The old database stays live and untouched the
whole time, and rollback is instant. Use it.

**If it fails on quota — Path B.** The only way to get a Mumbai primary is to
destroy the `default` group and rebuild it there, which destroys the preview
database too. Everything rests on the dump, so Path B verifies the dump before
destroying anything.

---

## Path A — new group alongside the old

### 1. Rehearse on preview

Preview is expendable, which makes it the right place to find out what breaks.

```bash
turso db shell venice-ganesh-preview .dump > preview-dump.sql
turso db create venice-ganesh-preview-bom --group venice-bom
turso db shell venice-ganesh-preview-bom < preview-dump.sql
```

Check the counts match (see **Verifying a restore** below). Point the Vercel
*preview* environment at it, redeploy preview, and click through it. Only go on
once that works.

### 2. Take production down for a few minutes

Nothing enforces this — you are just picking a time when nobody is mid-form.
Announce it in the committee group, not the community group.

```bash
turso db shell venice-ganesh-production .dump > prod-dump-$(date +%F-%H%M).sql
```

Note the time you took the dump. Anything registered after it is at risk.

### 3. Restore into Mumbai

```bash
turso db create venice-ganesh-prod-bom --group venice-bom
turso db shell venice-ganesh-prod-bom < prod-dump-$(date +%F-%H%M).sql
turso db show venice-ganesh-prod-bom --url
turso db tokens create venice-ganesh-prod-bom
```

### 4. Verify before cutting over

See **Verifying a restore**. Do not skip it.

### 5. Cut over

```bash
vercel env rm TURSO_DATABASE_URL production
vercel env rm TURSO_AUTH_TOKEN production
vercel env add TURSO_DATABASE_URL production     # the new libsql://…aws-ap-south-1… URL
vercel env add TURSO_AUTH_TOKEN production       # the token from step 3
vercel deploy --prod
```

**Leave `SESSION_SECRET` alone.** Changing it invalidates every cookie and signs
all 247 villas out. The admin password lives in the database and comes across
with the dump.

### 6. Rollback, if needed

Put the old URL and token back and redeploy. The Tokyo database has been sitting
there untouched the whole time.

---

## Path B — rebuild the group in Mumbai

Destructive. The dump is the only copy, so it gets verified first.

### 1. Dump both databases

```bash
turso db shell venice-ganesh-production .dump > prod-dump-$(date +%F-%H%M).sql
turso db shell venice-ganesh-preview .dump    > preview-dump.sql
wc -l prod-dump-*.sql        # sanity: not empty, not truncated
```

### 2. Prove the dump restores, before destroying anything

Load it into a local SQLite file and count what came back:

```bash
sqlite3 /tmp/verify.db < prod-dump-$(date +%F-%H%M).sql
for t in admins audit_log draw_results draws entries entry_members events items \
         login_attempts pattu_vastralu payments previous_winners settings slots \
         villa_accounts villas; do
  printf "%-18s %s\n" "$t" "$(sqlite3 /tmp/verify.db "select count(*) from $t")"
done
```

Compare against the live database (same loop, `turso db shell
venice-ganesh-production "select count(*) from $t"`). **If a single table
disagrees, stop.** You have lost nothing yet.

### 3. Destroy and rebuild

```bash
turso db destroy venice-ganesh-production
turso db destroy venice-ganesh-preview
turso group destroy default

turso group create default --location aws-ap-south-1
turso db create venice-ganesh-production --group default
turso db create venice-ganesh-preview    --group default

turso db shell venice-ganesh-production < prod-dump-$(date +%F-%H%M).sql
turso db shell venice-ganesh-preview    < preview-dump.sql
```

### 4. New tokens, then cut over

The URLs may be unchanged but **the auth tokens will not be** — issue new ones
and update both Vercel environments, then `vercel deploy --prod`. Again, leave
`SESSION_SECRET` alone.

### 5. Rollback

There is none beyond the dump file. Keep it.

---

## Verifying a restore

Row counts, every table, old against new:

```bash
OLD=venice-ganesh-production
NEW=venice-ganesh-prod-bom
for t in admins audit_log draw_results draws entries entry_members events items \
         login_attempts pattu_vastralu payments previous_winners settings slots \
         villa_accounts villas; do
  a=$(turso db shell $OLD "select count(*) from $t" | tail -1)
  b=$(turso db shell $NEW "select count(*) from $t" | tail -1)
  [ "$a" = "$b" ] && s="ok" || s="MISMATCH"
  printf "%-18s old=%-6s new=%-6s %s\n" "$t" "$a" "$b" "$s"
done
```

`villas` must be 247. `entries` and `entry_members` must match exactly — those
are people's registrations.

## After cutting over

```bash
curl -sI https://venice-ganesh.vercel.app/login | grep -i x-vercel-id
```

Still `bom1::bom1`. Then sign in at `/admin` and check the villa and entry counts
read the same as before the move.

### Stragglers

If anyone registered between the dump and the cutover, their entry is on the old
database only. Compare the old database's counts against the numbers you recorded
at dump time — if `entries` grew, find them:

```bash
turso db shell venice-ganesh-production \
  "select id, item_id, lead_villa_id, datetime(created_at/1000,'unixepoch','+5:30') \
   from entries where created_at > <dump-time-in-ms> order by id"
```

There will be very few. Re-enter them from `/admin` using **register on a
resident's behalf**, which writes them properly and leaves an audit entry —
rather than hand-inserting rows.

## Afterwards

Keep the old database and the dump for a week. Then:

```bash
turso db destroy venice-ganesh-production        # the Tokyo one, by then renamed or stale
```

Update the `TURSO_DATABASE_URL` line in `PRODUCTION-CREDENTIALS.txt`.
