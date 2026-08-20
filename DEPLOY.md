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

Check before sharing with all 247 villas:

- [ ] the red banner is **gone**
- [ ] **Clear all test data** is gone from `/admin`
- [ ] the admin password is different from the preview one
- [ ] `/admin` shows `0 of 247 villas have signed in`
- [ ] the item dates on the dashboard are the ones you want

## Backups

```bash
turso db shell venice-ganesh-production .dump > backup-$(date +%F).sql
```

Worth running the evening before each draw.
