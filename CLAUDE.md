# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint

# Drizzle ORM
npx drizzle-kit generate  # Generate migration files from schema changes
npx drizzle-kit migrate   # Apply migrations to database
npx drizzle-kit studio    # Open Drizzle Studio (DB GUI)

# One-off scripts (run with node directly)
node migration.js          # Migrate user data from JSON/CSV files into Neon
node authUserCron.js       # Auth user cron helper
node updateAuthorizeData.js
```

## Stripe Key Environment — Test vs Production

The development Vercel environment does **not** have `STRIPE_SECRET_KEY` set. After `vercel env pull`, `.env.local` will be missing it.

### Standard local dev setup (test keys)

After a dev env pull, append the test keys manually:

```bash
vercel env pull .env.local --environment=development --yes

# Then append test keys (get from Stripe dashboard → Developers → API keys, toggle to Test mode)
echo "STRIPE_SECRET_KEY=sk_test_..." >> .env.local
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..." >> .env.local
echo "STRIPE_PRICE_ID=price_..." >> .env.local   # test price from Stripe → Products
```

`.env.local` should look like this when set up for local dev:
```
# ... vercel dev vars ...
STRIPE_SECRET_KEY=sk_test_...       # ← test key active
# STRIPE_SECRET_KEY=sk_live_...     # ← production key (commented out)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...           # test price ID
```

### Switching to production key (for Stripe data queries only)

```bash
# Option A — pull production env (overwrites entire .env.local)
vercel env pull .env.local --environment=production --yes
# ⚠️  Switch back before running npm run dev

# Option B — comment swap in .env.local manually
# STRIPE_SECRET_KEY=sk_test_...     # ← comment out test
# STRIPE_SECRET_KEY=sk_live_...     # ← uncomment live
```

**After querying production Stripe, always switch back to test key before `npm run dev`.**

### Rules
- Use **test key** for all local dev and Stripe flow testing — no real charges
- Use **production key** only for one-off queries against real Stripe data
- Never commit `.env.local` — it is in `.gitignore`
- `vercel env pull --environment=production` overwrites the whole file — back up test keys first or re-add them after

## Support CLI (claudeTools/support.js)

Run from the repo root. Resolves packages from `app.gymnasticbodies.com/node_modules` — no separate install.

```bash
# From /var/www/Work/Gymfit/
node claudeTools/support.js tickets [--status=open]
node claudeTools/support.js cases [--status=open]
node claudeTools/support.js user --email=x@y.com
node claudeTools/support.js create-case --email=x --title="Subject" [--priority=normal|high|urgent|low]
node claudeTools/support.js reply --ticket=ID --body="Your reply text"
node claudeTools/support.js send-email --to=x --subject="..." --body="..."
node claudeTools/support.js email-group --type=noncurrent --subject="..." --body="..." [--dry-run]
node claudeTools/support.js email-group --type=lapsed --subject="..." --body-file=./template.txt
node claudeTools/support.js backfill-cases   # create cases for all uncased open tickets

# Outbound email (records in outbound_emails + sends via SendGrid atomically)
node claudeTools/support.js sendOutboundSupportEmail \
  --emails="a@b.com, c@d.com"    # or --emails-file=./list.txt
  --subject="Subject line" \
  --body="Hi {{name}}, ..." \    # or --body-file=./template.txt
  --campaign="renewal_outreach_2026-06" \
  --type=support \               # support (default) | marketing
  --dry-run                      # preview without sending
```

**Template variables** in `--body`: `{{name}}` (first name from DB), `{{email}}`, `{{renewalLink}}` (auto-generated `https://app.gymnasticbodies.com/renew?email=...`)

**`sendOutboundSupportEmail` flow**: looks up each recipient's user record, renders personalized body, sends via SendGrid with `replyTo: support@gymnasticbodies.com`, inserts one row per recipient into `outbound_emails`. 100ms between sends. Always test with `--dry-run` first.

**`email-group` flow**: sends to all users matching a `migration_type` or `customer_segment` value — auto-creates a support case per recipient. Skip case creation with `--create-cases=false`.

**Valid `--type` values for `email-group`**: `current` | `noncurrent` | `stripe` | `auth_net` | `subscriber` | `purchased` | `lapsed` | `inactive`

**Key notes**:
- Loads env from `app.gymnasticbodies.com/.env.local` automatically
- All DB queries run directly against Neon — no HTTP auth needed
- Replies are sent via SendGrid and update ticket status to `replied`

## Architecture Overview

This is a **Next.js 15 fitness platform** (Gymnastic Bodies) providing user accounts, subscriptions, and workout logging. It uses the App Router.

### Database

- **ORM**: Drizzle ORM with `@neondatabase/serverless` (PostgreSQL)
- **Schema**: `Drizzle/db/schema.ts` — tables: `user`, `session`, `account`, `verification`, `user_setting`, `user_logs`
- **DB instance**: `Drizzle/index.ts` (exported as `db`)
- `user_setting` holds subscription state, Authorize.net customer IDs, trial dates, and legacy import flags (WooCommerce, AWS)

### Authentication

- **Library**: `better-auth` v1.4.6 (configured in `lib/auth.js`)
- Session cookies using JWE encryption, 7-day cache, stored in the `session` table
- Custom password hashing via `lib/password.js` (bcrypt + argon2)
- Admin plugin with a hard-coded admin user ID
- Client helper: `lib/auth-client.js` (exports `authClient`)
- Standard auth endpoints handled by `/api/auth/[...all]/route.js`; custom sign-in at `/api/authentication/route.js`

### Payment Processing

- **Stripe** (`stripe` SDK) — primary payment processor for all new signups and renewals
  - New subscriptions: `app/api/stripe/create-subscription/route.js` (7-day trial, inline price_data)
  - Renewals (lapsed users): `app/api/stripe/renew-subscription/route.js` (no trial, honours historical rate)
  - Webhooks: `app/api/stripe/webhook/route.js` — handles `invoice.payment_succeeded`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Server helpers: `lib/stripeServerFunction.js`
- **Authorize.net** (`authorizenet` SDK) — legacy only, do not use for new work
  - Logic lives in `lib/commonServerFunction.js`
  - ~19 users remain on active Auth.net ARB subscriptions (`customer_segment = 'auth_net'`)
  - Payment entry point: `/api/paymentPortal/route.js` (kept for legacy account pages)
  - Subscription webhook receiver: `/api/user/subscription/route.js`

### Email

- **SendGrid** (`@sendgrid/mail`) — configured in `lib/sendgrid.js`
- Used for: credential emails, subscription cancellation notices, error alerts, contact form, outbound support/marketing sends
- All outbound mail sets `replyTo: support@gymnasticbodies.com` so replies route through the support Google Group and are picked up by Gmail sync
- **Do not send outbound email without recording it in `outbound_emails`** — use `sendOutboundSupportEmail` CLI or `POST /api/admin/outbound/send` so replies auto-case correctly

### Storage

- **Vercel Blob** (`@vercel/blob`) — file/media uploads via `/api/mediaBlob/route.js`
- S3 images served from `gymfit-images.s3.amazonaws.com` (allowed in `next.config.js`)

### Cron Jobs

- Vercel cron jobs are defined in `vercel.json` and run on a schedule:
  - `/api/cronJobs` — daily at 10 AM UTC: renewal checks, subscription status updates, SendGrid emails
  - `/api/classifyUsers` — daily at 11 AM UTC: re-classifies all users, setting both `migration_type` and `customer_segment`
  - `/api/admin/gmail/sync` — hourly: pulls new support emails from Gmail into `support_emails`
- **`app/api/classifyUsers/route.js`** — runs the full user classification query, populating both `migration_type` (`current`/`noncurrent`) and `customer_segment` (`stripe`, `auth_net`, `subscriber`, `purchased`, `lapsed`, `inactive`). Uses `neon()` direct SQL for the JOIN and Drizzle `inArray` for batch UPDATEs. Returns a JSON summary with counts and changes. Logs results to `app_logs`.

### Data Migration

- Legacy data lives in `data/` (CSV/JSON from Authorize.net and WooCommerce)
- `migration.js` reads these files and calls `POST /api/migration` to bulk-import users into Neon

### Logging

- **`lib/logger.js`** — server-side logger. Writes to stdout (JSON) and inserts into the `app_logs` Neon table. `LOG_ENABLED=false` disables all logging; `LOG_LEVEL` sets minimum level (debug/info/warn/error, default: info).
- **`Drizzle/db/schema.ts`** — `app_logs` table: `id`, `ts`, `level`, `event`, `email`, `userId`, `source`, `data` (jsonb). Indexed on `event`, `ts`, `email`.
- **`/api/log/route.js`** — server-side log ingestion endpoint.
- **`/api/clientLog/route.js`** — client-side log forwarding endpoint.
- **Wired into:** `renewalStatus`, `create-subscription`, `renew-subscription`, `stripe/webhook`, `lib/userSettings.js`.
- Usage: `import { logger } from '@/lib/logger'; logger.info('event.name', { email, userId, ...data });`

### Marketing / Subscribe Page

- **`app/subscribe/page.js`** — server component (no `'use client'`); imports all copy from `data/content/subscribe.json`; exports `metadata` with OG + Twitter card tags. Full dark/orange redesign (Barlow Condensed + DM Sans, CSS modules, no MUI). Copy of old page preserved at `app/subscribeOld/`.
- **`data/content/subscribe.json`** — all subscribe page copy: hero text, pricing cards, trust strip, features list, bottom CTA, plus metadata strings (title, description, ogTitle, ogDescription, ogImage). Edit this file to update page copy without touching component logic.
- **`data/content/renew.json`** — renew page metadata only (title, description). Renew page content is mostly dynamic (pulled from API).
- **`app/layout.js`** — exports base `metadata` with `title.template: '%s | GymFit'` so page-level titles cascade automatically. Includes `metadataBase`, OG `siteName`, and Twitter card defaults. Body uses `minHeight: "100vh"`.
- **`components/DarkNav.js`** — MUI-free sticky nav for marketing pages (dark bg, blur, white logo, ghost Sign In + orange CTA). The global MUI nav (`components/Nav.js`) returns null on `/subscribe` and `/renew` via `usePathname`.
- **`components/marketing/`** — reusable marketing section components: `PricingCard`, `FeaturesList`, `BottomCta` — each with its own CSS module.
- **`lib/fonts.js`** — shared Barlow Condensed + DM Sans `next/font/google` instances for marketing pages.

### Renewal / Account Fixes (2026-05-22)

- **`app/renew/page.js`** — RenewalPortal loaded with `dynamic(..., { ssr: false })` to fix React #418 hydration error from Stripe Elements rendering server-side.
- **`components/RenewalPortal.js`** — mobile padding reduced, CTA button full-width on mobile.
- **`components/ModalPopUp.js`** — fixed oversized title (h3→h5), added `width: '90vw', maxWidth: '480px'` constraint.
- **`components/AccountDetailsComp.js`** — old Authorize.net payment modal disabled (was auto-opening for expired users, conflicting with the new Stripe `/renew` flow).

### Renewal Pricing — Grandfathered $50/month (2026-05-22)

- **`app/api/user/renewalStatus/route.js`** — now returns `hasValidHistoricalData: boolean`. True only when the stored `price` is a positive number from the DB (not a default fallback). Used by RenewalPortal to distinguish users with real historical data from those without.
- **`components/RenewalPortal.js`** — four-branch pricing logic:
  - No valid historical data (~6,800 users with N/A/0/unknown price) → **$50/month**
  - Historical annual/quarterly rate > $50/mo equivalent (e.g. $720/yr = $60/mo) → **$50/month**
  - Historical annual/quarterly rate ≤ $50/mo equivalent (e.g. $179.88/yr = $15/mo) → **radio: keep historical rate or switch to $50/month**
  - Historical monthly rate (e.g. $29.99/mo) → **their stored monthly rate, no choice**
- Monthly equivalent threshold: annual ÷ 12, quarterly ÷ 3. `GRANDFATHERED_MONTHLY_PRICE = '50'` constant controls the offer price.

### Renewal Page Redesign + Nav Personalization (2026-05-22)

- **`components/RenewalPortal.js`** — full MUI removal; rewritten with `RenewalPortal.module.css` (dark/orange theme matching `/subscribe`). Barlow Condensed headline, DM Sans body, custom CSS radio buttons, dark Stripe CardElement, orange gradient CTA. Accepts `onNameLoaded` callback.
- **`components/RenewalPortal.module.css`** — new CSS module for the portal.
- **`app/renew/page.js`** — now a static server component exporting metadata; delegates to `RenewClient`.
- **`app/renew/RenewClient.js`** — client wrapper; holds `userName` state, passes `onNameLoaded` down to `RenewalPortal` via `RenewInner`, passes resolved name to `DarkNav` as `userDisplay`.
- **`app/renew/renew.module.css`** — dark page wrapper (`#0e0e0e` background).
- **`components/DarkNav.js`** — accepts optional `userDisplay` prop; replaces "Sign In" link with the user's name when provided.
- **`components/DarkNav.module.css`** — added `.userDisplay` style (ghost pill matching Sign In button dimensions).
- **`components/Nav.js`** — added `/renew` to `DARK_NAV_ROUTES` so the global MUI nav suppresses itself on the renew page.
- **`app/api/user/renewalStatus/route.js`** — now returns `name: user.name` so the nav can display the user's real name pulled from the DB via their email (carried over from the `my.gymnasticbodies.com` session).

## Key API Routes

| Route | Purpose |
|---|---|
| `/api/auth/[...all]` | better-auth handler (signin, signup, session, logout) |
| `/api/authentication` | Custom email+password sign-in |
| `/api/stripe/create-subscription` | New user Stripe checkout (replaces Auth.net) |
| `/api/stripe/renew-subscription` | Lapsed user renewal — no trial, honours historical rate |
| `/api/stripe/webhook` | Stripe lifecycle events (payment, cancellation, failure) |
| `/api/user/renewalStatus` | Called by `my.gymnasticbodies.com` post-login to check if user needs renewal |
| `/api/paymentPortal` | Authorize.net — legacy only, do not use for new work |
| `/api/user/subscription` | Subscription webhook + account creation |
| `/api/user/userStatus` | Current user subscription status |
| `/api/user/log` | Workout log CRUD |
| `/api/user/resetLink` / `resetPassword` | Password reset flow |
| `/api/user/contactUs` | Contact form (SendGrid) |
| `/api/user/accountInformation` | Account details read/write |
| `/api/cronJobs` | Renewal checks & subscription updates (daily cron) |
| `/api/classifyUsers` | Re-classifies all users, setting `migration_type` + `customer_segment` (daily cron) |
| `/api/migration` | Bulk user import from legacy data |
| `/api/admin/gmail/sync` | Pull new support emails from Gmail (POST; admin or cron) |
| `/api/admin/tickets` | List support tickets with optional `?status=` filter |
| `/api/admin/tickets/[id]` | Single ticket + joined user context + reply thread |
| `/api/admin/tickets/[id]/reply` | Send reply via Gmail, insert support_replies row |
| `/api/admin/tickets/[id]/status` | PATCH ticket status / adminNotes |
| `/api/admin/cases` | List + create support cases |
| `/api/admin/cases/[id]` | Case detail + user panel + linked emails + past cases |
| `/api/admin/cases/[id]/update` | PATCH case status / priority / adminNotes |
| `/api/admin/cases/[id]/link-email` | Link a support_email row to a case |
| `/api/admin/outbound` | GET — list all outbound emails (joined with user name) |
| `/api/admin/outbound/send` | POST — send + record outbound email(s); supports `dryRun: true` for preview |

All user/payment API routes return CORS headers (`Access-Control-Allow-Origin: *`).

## Admin Support Inbox

A full support ticketing system built into `/admin`. Accessible only to users with `role = 'admin'` in the `user` table.

### How it works

1. `admin@gymnasticbodies.com` is subscribed to the `support@gymnasticbodies.com` Google Group (individual delivery, not digest).
2. The hourly cron (or manual **Sync Gmail** button) calls `POST /api/admin/gmail/sync`.
3. The sync route queries Gmail with `list:support@gymnasticbodies.com after:{cursor}` and parses each email into a `support_emails` row.
4. Emails are deduplicated by a synthetic ID: `{gmailMessageId}_{base64(fromEmail).slice(0,8)}`.
5. The sync cursor advances automatically — it uses `MAX(receivedAt)` from `support_emails` minus a 2-minute overlap. On first run (empty table) it starts from the current moment, so no historical backfill occurs.

### Email parsing (`lib/gmail.js`)

Three parsing paths:

| Email type | Detection | Extraction |
|---|---|---|
| **Contact form submission** | `From:` contains `contact@gymnasticbodies.com` | HTML body parsed: `Email:` field → real customer email; `Name:` field → display name |
| **Google Groups individual forward** | Everything else (non-contact-form) | `resolveSender()` priority: `X-Original-Sender` → `Reply-To` (if not a group address) → `From` header (strips `via GroupName` pattern for DMARC rewrites) |
| **Google Groups digest** (legacy) | Plain-text body with `\n___\n` separators | Split into blocks; each block parsed for `From:`, `Subject:`, `Date:` headers |

`extractPlainText()` tries `text/plain` first; falls back to `stripHtml(text/html)` for HTML-only emails.

### Database tables (`Drizzle/db/schema.ts`)

- **`support_emails`** — one row per inbound customer message. Fields: `gmailMessageId` (dedup key), `fromEmail`, `fromName`, `subject`, `body`, `receivedAt`, `status` (`open`/`replied`/`closed`), `adminNotes`, `userId` (FK to `user`, nullable), `caseId` (FK to `support_cases`, nullable), `assignedTo`, `repliedAt`.
- **`support_cases`** — groups related emails into a case. Fields: `title`, `status` (`open`/`pending`/`resolved`/`closed`), `priority` (`low`/`normal`/`high`/`urgent`), `adminNotes`, `userId`, `fromEmail`, `openedBy`, `resolvedAt`.
- **`support_replies`** — outbound admin replies. Fields: `emailId` (FK), `adminUserId`, `body`, `sentAt`, `gmailMessageId` (sent message ID from Gmail API).

### Admin pages

| Route | Files | Purpose |
|---|---|---|
| `/admin/login` | `app/admin/login/page.js` + `LoginClient.js` | Admin sign-in (checks `role === 'admin'` after better-auth signIn) |
| `/admin/inbox` | `app/admin/inbox/InboxClient.js` | **Inbound** tab: ticket list, status filter tabs, Sync Gmail button, CASE badge. **Outbound** tab: sent email log with Case badge and Compose button |
| `/admin/outbound/compose` | `app/admin/outbound/compose/ComposeClient.js` | Compose + send outbound emails — type, campaign, paste recipients, template body, preview step, send |
| `/admin/ticket/[id]` | `app/admin/ticket/[id]/TicketClient.js` | Ticket detail: email body, reply composer, Open Case form / View Case link |
| `/admin/cases` | `app/admin/cases/CasesClient.js` | Case list, status filter tabs |
| `/admin/cases/[id]` | `app/admin/cases/[id]/CaseClient.js` | Case detail: status/priority/notes, linked emails, user panel (subscription, Stripe IDs, last session, activity logs, past cases) |

All admin pages use the dark/orange CSS Modules design system (`#0e0e0e` background, `#f05621` accent, Barlow Condensed + DM Sans).

### Route protection

`proxy.ts` (at project root, serves as Next.js middleware) gates all `/admin/*` routes. It reads the better-auth session cookie (`__Secure-better-auth.session_token` in production, `better-auth.session_token` in local dev) and redirects to `/admin/login` if absent. Role check is done client-side in `LoginClient.js` after sign-in via `authClient.getSession()`.

- **Cookie prefix**: determined by `BETTER_AUTH_URL` — if it starts with `https://`, better-auth sets `__Secure-` prefix. Set `BETTER_AUTH_URL=http://localhost:3000` in `.env` for local dev to avoid the prefix.

### Sending replies (`lib/gmail.js` → `sendSupportEmail`)

Replies are sent from `support@gymnasticbodies.com` (configured as a Send As alias on `admin@gymnasticbodies.com`). The Gmail OAuth client uses `GMAIL_REFRESH_TOKEN` to auto-refresh access tokens. Set `GMAIL_SEND_AS=support@gymnasticbodies.com`.

### Admin users

Admin role is set by two mechanisms:
1. `better-auth` admin plugin — `adminUserIds` list in `lib/auth.js` grants admin API access.
2. `user.role = 'admin'` in the DB — checked by `LoginClient.js` and all `/api/admin/*` routes via `requireAdmin()` in `lib/adminAuth.js`.

Both must be set for full access. Current admin IDs in `lib/auth.js`: `TufkirhwrYmEEDUfnxDtTGVpIhdgUzQv`, `buzioZXby6sR6dRMT3zZGoxSKiQj0wbc`, `3FJ44luUDpRKHEdukXTkKDIpvk2O1yTn`, `f4b53c00-86ec-48dd-842c-09ac51ca6645`.

### Environment variables required

```
GMAIL_CLIENT_ID         # Google OAuth2 client ID
GMAIL_CLIENT_SECRET     # Google OAuth2 client secret
GMAIL_REFRESH_TOKEN     # Refresh token for admin@gymnasticbodies.com
GMAIL_SEND_AS           # support@gymnasticbodies.com (Send As alias)
CRON_SECRET             # Shared secret — Vercel cron passes as x-cron-secret header
BETTER_AUTH_URL         # https://app.gymnasticbodies.com (prod) / http://localhost:3000 (dev)
```

---

## Outbound Email System

All proactive outreach to users — support follow-ups and marketing campaigns — flows through a single system that ties sending, recording, and reply detection together. **Never send outbound email by calling SendGrid directly without going through this system**, or replies won't auto-case.

### How to send outbound email

**Option 1 — Admin UI** (`/admin/inbox` → Outbound tab → Compose):
1. Set **type** (`support` or `marketing`), **campaign tag** (e.g. `renewal_outreach_2026-06`), paste **recipient emails** (one per line or comma-separated), write **subject** and **body** using template variables.
2. Click **Preview** — renders the first 3 personalized messages using live DB lookups.
3. Click **Send** — fires SendGrid + inserts one row per recipient into `outbound_emails` atomically.

**Option 2 — CLI** (`claudeTools/support.js sendOutboundSupportEmail`):
```bash
node claudeTools/support.js sendOutboundSupportEmail \
  --emails="jeff@foo.com, sara@bar.com" \
  --subject="Having trouble renewing?" \
  --body="Hi {{name}},\n\nYour link: {{renewalLink}}" \
  --campaign="renewal_outreach_2026-06" \
  --type=support \
  --dry-run    # remove to actually send
```
Also accepts `--emails-file=./list.txt` and `--body-file=./template.txt`.

**Option 3 — API** (`POST /api/admin/outbound/send`):
```json
{
  "emails": ["a@foo.com", "b@bar.com"],
  "subject": "Subject line",
  "body": "Hi {{name}}, your link: {{renewalLink}}",
  "campaign": "renewal_outreach_2026-06",
  "type": "support",
  "dryRun": false
}
```
Returns `{ sent, failed, dryRun, results: [{ email, name, status }] }`. Pass `dryRun: true` to preview rendered bodies without sending.

### Template variables

| Variable | Renders as |
|---|---|
| `{{name}}` | First name from `user.name` in DB; empty string if unknown |
| `{{email}}` | Recipient's email address |
| `{{renewalLink}}` | `https://app.gymnasticbodies.com/renew?email=<encoded>` |

### `outbound_emails` table

Defined in `Drizzle/db/schema.ts`. One row per recipient per send.

| Column | Type | Notes |
|---|---|---|
| `id` | integer | PK |
| `user_id` | text | FK → `user.id`, nullable — null if email not in DB |
| `to_email` | text | Recipient email (required) |
| `subject` | text | Email subject (required) |
| `body` | text | Fully rendered body after template substitution |
| `campaign` | text | Tag for grouping sends, e.g. `renewal_outreach_2026-05-27` |
| `type` | text | `support` or `marketing` (default `support`) |
| `sent_at` | timestamp | When it was sent (defaults to `NOW()`) |
| `case_id` | integer | Set by Gmail sync when a reply creates a case |

### Auto-case creation rules (Gmail sync)

Every time Gmail syncs (`/api/admin/gmail/sync`), each inbound email is evaluated against `outbound_emails`:

| Inbound email is... | What happens |
|---|---|
| Reply to a `support` outbound (within 90 days) | Case auto-created: title `[Response: <campaign>]`, priority `high`. `outbound_emails.case_id` is set. Case badge appears in Outbound tab. |
| Reply to a `marketing` outbound | **No case.** Lands as a plain ticket in the inbox only. |
| No match (cold inbound — contact form, etc.) | **No case.** Lands as a plain ticket in the inbox only. |
| From `@gymnasticbodies.com` internal sender | Skipped entirely — not inserted. |

Cases are only auto-created for replies to `support` outbound emails. Everything else stays as a plain ticket until manually promoted.

The reply-detection window is **90 days** from `sent_at`. `findOutboundMatch()` in `app/api/admin/gmail/sync/route.js` does the lookup.

### Outbound tab in the inbox

`/admin/inbox` has an **Inbound / Outbound** section switcher. The Outbound tab:
- Lists all rows from `outbound_emails`, newest first
- Shows: name (or email), subject, campaign tag, sent date
- Shows a **Case** badge when `case_id` is set (links to the case)
- Has a **Compose** button → `/admin/outbound/compose`

---

Two columns on the `user` table drive access and segmentation (last updated 2026-06-02):

### `user.migration_type` — binary, drives the paywall

| Value | Count | Meaning |
|---|---|---|
| `current` | 1,096 | Has active subscription or future renewal date — **no paywall** |
| `noncurrent` | 15,181 | No active subscription, no future renewal date — **redirect to `/renew`** |

`renewalStatus` API returns `needsRenewal: true` when `migration_type = 'noncurrent'`. Classification is purely date/subscription based — no activity signals required.

### `user.customer_segment` — granular, drives what we offer

| Value | Count | Meaning |
|---|---|---|
| `stripe` | 15 | Active Stripe subscriber |
| `auth_net` | 19 | Active Auth.net ARB subscriber |
| `subscriber` | 1,062 | Current — future renewal date set (manually granted or imported) |
| `purchased` | 334 | One-time WooCommerce product buyer — noncurrent, paywalled for now |
| `lapsed` | 430 | Had a subscription, now expired — offered `/renew` |
| `inactive` | 14,417 | No meaningful signals |

### Classification waterfall (`/api/classifyUsers`)

1. Has `stripe_subscription_id` → `current` / `stripe`
2. Has `authorize_subscription_id` → `current` / `auth_net`
3. Has valid future `renewaldate` in subscription data → `current` / `subscriber`
4. Has a `purchase` type row in `user_setting` → `noncurrent` / `purchased`
5. Has activity signals (session, user_logs, levelPath) → `noncurrent` / `lapsed`
6. None of the above → `noncurrent` / `inactive`

The `/api/classifyUsers` cron runs automatically at 11 AM UTC daily. Both `migration_type` and `customer_segment` are updated atomically per user. `grant-access` and `create-free` routes set `current` / `subscriber` immediately without waiting for the cron.

## Environment Variables

```
# Database & Auth
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL              # https://app.gymnasticbodies.com (prod) | http://localhost:3000 (dev)

# Stripe (primary payment processor)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Authorize.net (legacy — do not use for new work)
AUTHORIZE_NET_API_LOGIN_ID
AUTHORIZE_NET_TRANSACTION_KEY
AUTHORIZE_NET_API_CLIENT_ID

# SendGrid
SENDGRID_API_KEY
SENDGRID_FROM
SENDGRID_REPLYTO

# Storage
BLOB_READ_WRITE_TOKEN

# Analytics / Tracking
NEXT_PUBLIC_GOOGLE_MAPS_KEY
NEXT_PUBLIC_HOTJAR_ID
NEXT_PUBLIC_ANALYTICS_TAG

# App URLs
NEXT_PUBLIC_APP_URL          # e.g. https://my.gymnasticbodies.com
NEXT_PUBLIC_API_URL          # Backend base URL (ngrok or vercel)
NEXT_PUBLIC_ENVIRONMENT      # 'development' | 'production'
REACT_APP_API_NEW            # API endpoint base (https://gymnasticbodies-com.vercel.app)

# Admin Support Inbox (Gmail OAuth)
GMAIL_CLIENT_ID              # Google OAuth2 client ID for admin@gymnasticbodies.com
GMAIL_CLIENT_SECRET          # Google OAuth2 client secret
GMAIL_REFRESH_TOKEN          # Long-lived refresh token (run scripts/gmail-auth.js once to generate)
GMAIL_SEND_AS                # support@gymnasticbodies.com (Send As alias on admin account)
CRON_SECRET                  # Arbitrary secret — Vercel cron sends as x-cron-secret header
```

## Logging / app_logs Queries

- **`app_logs.data` is `json` type** — `DISTINCT`, `->>` operator, and `LOWER()` all fail in parameterized neon template-literal queries. Fetch raw rows and process in JavaScript instead.
- **Stripe key in `.env.local` is `sk_test_*`** — local Stripe SDK queries return test data only. Real production subscriptions require the live key (Vercel env only).
- **Confirmed renewal conversion** = `renewal.success` log event + non-null `stripe_customer_id` in `user_setting`. A `renew.form_submit` with no `renewal.success` and null `stripe_customer_id` indicates a test-key submission.
- **Reclassification is immediate** — `updateUserClassification` is called synchronously inside `renew-subscription/route.js`, setting `migration_type = 'current'` and `customer_segment = 'stripe'`. A successful renewal is reflected in `renewalStatus` on the next request, no cron wait needed.

## Renewal Flow — Known Fixes (2026-05-27)

- **Double-submission race condition** — `RenewalPortal.js` uses `submittingRef` (`useRef`) to guard `handleSubmit`; React `setState` is async and doesn't block re-clicks before re-render.
- **`source=renewal` in redirect URL** — `RenewalPortal.js` redirect to `my.gymnasticbodies.com` must include `&source=renewal`. Without it, `loginActions.js` on the `my.` side skips filling in missing JWT fields (`refreshExpireTime`, `authExpireTime`, `timezone`) and dispatches `Logout()` immediately.
- **Server-side idempotency** — `renew-subscription/route.js` returns early if `user.customerSegment === 'stripe'` and `stripeSubscriptionId` already exists, preventing duplicate subscriptions from racing requests.

## SendGrid — Direct Scripting

- Can send email directly via `node -e` script: `require('@sendgrid/mail')` + `require('dotenv').config({ path: '.env.local' })`. No need to go through the `/api/` route for one-off sends.

---

## Design System

The app uses a unified **dark / orange** design system across all pages. Do not hardcode hex colors — use the CSS custom properties defined in `app/globals.css`.

### Design Tokens (`app/globals.css`)

| Token | Value | Use for |
|---|---|---|
| `--bg-base` | `#0e0e0e` | Page / shell background |
| `--bg-surface` | `#151515` | Cards, sidebar |
| `--bg-raised` | `#1a1a1a` | Hover states on surfaces |
| `--bg-overlay` | `#222222` | Borders, dividers |
| `--accent` | `#f05621` | Orange accent (icons, active states) |
| `--accent-light` | `#fcb14e` | Light orange (gradient start) |
| `--gradient-cta` | `linear-gradient(135deg, #fcb14e → #f05621)` | All CTA buttons |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Default card borders |
| `--border-accent` | `rgba(240,86,33,0.35)` | Hover / active borders |
| `--text` | `#ffffff` | Primary text |
| `--text-muted` | `rgba(255,255,255,0.65)` | Secondary body text |
| `--text-subtle` | `rgba(255,255,255,0.40)` | Labels, captions |
| `--text-meta` | `#666666` | Timestamps, metadata |
| `--radius-sm` | `6px` | Buttons, small elements |
| `--radius-md` | `10px` | Inputs, mid-size cards |
| `--radius-lg` | `16px` | Large cards |
| `--radius-pill` | `100px` | Badges |

### Typography (`lib/fonts.js`)

| Variable | Font | Weights | Use for |
|---|---|---|---|
| `--font-display` | Barlow Condensed | 700, 900 | Headlines, nav brand, button labels, badges |
| `--font-body` | DM Sans | 300, 400, 500 | Body copy, labels, metadata |

Apply to a page or layout via the font variable class props:
```jsx
import { barlow, dm } from '@/lib/fonts';
<div className={`${barlow.variable} ${dm.variable}`}>…</div>
```

### Shared UI Components (`components/ui/`)

Import from the barrel:
```js
import { Badge, Tabs, PageHeader, CtaButton, Card } from '@/components/ui';
```

#### `Badge`
Status, priority, and migration-type pills. Handles all variant→color mapping.
```jsx
<Badge variant="open">open</Badge>
<Badge variant="noncurrent">noncurrent</Badge>
<Badge variant="urgent">urgent</Badge>
<Badge variant="case">Case</Badge>   {/* orange outlined */}
```
Supported variants: `open` `replied` `closed` `pending` `resolved` | `current` `noncurrent` `stripe` `auth_net` `subscriber` `purchased` `lapsed` `inactive` | `urgent` `high` `normal` `low` | `accent` `case`

#### `Tabs`
Controlled tab bar with orange active indicator.
```jsx
const TABS = [{ label: 'All', value: '' }, { label: 'Open', value: 'open' }];
<Tabs tabs={TABS} value={tab} onChange={setTab} />
```

#### `PageHeader`
Page title + optional right-side actions slot.
```jsx
<PageHeader title="Support Inbox">
  <CtaButton size="sm" onClick={sync}>Sync Gmail</CtaButton>
</PageHeader>
```

#### `CtaButton`
Orange gradient button — renders as `<Link>` when `href` is given, `<button>` otherwise.
```jsx
<CtaButton href="/subscribe">Get Started</CtaButton>
<CtaButton onClick={save} size="sm" disabled={saving}>Save</CtaButton>
<CtaButton variant="ghost" href="/login">Sign In</CtaButton>
```
Props: `href` · `onClick` · `variant` (`solid`|`ghost`) · `size` (`sm`|`md`|`lg`) · `disabled` · `fullWidth` · `type`

#### `Card`
Dark bordered surface.
```jsx
<Card>Default card</Card>
<Card variant="accent" padding="lg">Highlighted</Card>
<Card padding="none">Custom padding</Card>
```
Props: `variant` (`default`|`accent`) · `padding` (`none`|`sm`|`md`|`lg`)

### Marketing Section Components (`components/marketing/`)

Used on `/subscribe` and similar landing pages. Do not use in admin.

| Component | File | Purpose |
|---|---|---|
| `PricingCard` | `marketing/PricingCard.js` | Subscription pricing card |
| `FeaturesList` | `marketing/FeaturesList.js` | Numbered feature list section |
| `BottomCta` | `marketing/BottomCta.js` | Full-width bottom CTA section |

### Navigation

| Component | File | Used on | Style |
|---|---|---|---|
| `DarkNav` | `components/DarkNav.js` | `/subscribe`, `/renew` | Sticky top bar — logo + ghost Sign In + orange CTA |
| `AdminNav` | `app/admin/AdminNav.js` | `/admin/*` | Left sidebar — logo + section links |
| `Nav` | `components/Nav.js` | `/` (home, MUI pages) | Light MUI AppBar — suppressed on dark routes |

**Rule:** `Nav.js` returns `null` on `/subscribe` and `/renew` (checked via `usePathname`). Never add `DarkNav` and `Nav` to the same page — they're mutually exclusive.

### Code Structure Map

```
app/
  globals.css           ← Design tokens + global resets (edit here for system-wide changes)
  layout.js             ← Root layout: Geist font, Nav, UserProvider, Analytics
  page.js               ← Home — redirects to my.gymnasticbodies.com
  subscribe/            ← Marketing subscribe page (server component, dark/orange)
  renew/                ← Renewal portal (SSR disabled for Stripe Elements)
  admin/
    AdminNav.js         ← Sidebar nav with brand logo
    layout.js           ← Admin shell layout (AdminNav + content area)
    layout.module.css   ← Admin shell CSS (uses design tokens)
    login/              ← Admin auth page
    inbox/              ← Support inbox (Inbound + Outbound tabs, Sync Gmail, Compose button)
    outbound/
      compose/          ← Compose outbound email (type, campaign, recipients, template, preview, send)
    ticket/[id]/        ← Ticket detail + reply composer
    cases/              ← Support case list
    cases/[id]/         ← Case detail + user panel
    users/              ← User list + search
    analytics/          ← Subscription funnel analytics

components/
  ui/                   ← Shared design system components (Badge, Tabs, PageHeader, CtaButton, Card)
  marketing/            ← Marketing section components (PricingCard, FeaturesList, BottomCta)
  DarkNav.js            ← Top nav for marketing pages
  Nav.js                ← MUI top nav for legacy/home pages
  RenewalPortal.js      ← Stripe renewal form (client only)
  DarkNav.module.css
  RenewalPortal.module.css

lib/
  fonts.js              ← Barlow Condensed + DM Sans next/font/google instances
  auth.js               ← better-auth config
  logger.js             ← Server-side logger (stdout + app_logs table)
  stripeServerFunction.js ← Stripe helpers
  sendgrid.js           ← Email helpers
  gmail.js              ← Gmail OAuth + email parsing

Drizzle/
  db/schema.ts          ← All table definitions
  index.ts              ← DB instance export

data/
  content/subscribe.json ← All copy for /subscribe (edit here, not in the component)
  content/renew.json     ← Metadata for /renew
```
