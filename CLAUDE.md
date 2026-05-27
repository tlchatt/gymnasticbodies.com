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
  - ~19 users remain on active Auth.net ARB subscriptions (`migration_type = 'auth_net_subscriber'`)
  - Payment entry point: `/api/paymentPortal/route.js` (kept for legacy account pages)
  - Subscription webhook receiver: `/api/user/subscription/route.js`

### Email

- **SendGrid** (`@sendgrid/mail`) — configured in `lib/sendgrid.js`
- Used for: credential emails, subscription cancellation notices, error alerts, contact form

### Storage

- **Vercel Blob** (`@vercel/blob`) — file/media uploads via `/api/mediaBlob/route.js`
- S3 images served from `gymfit-images.s3.amazonaws.com` (allowed in `next.config.js`)

### Cron Jobs

- Vercel cron jobs are defined in `vercel.json` and run on a schedule:
  - `/api/cronJobs` — daily at 10 AM UTC: renewal checks, subscription status updates, SendGrid emails
  - `/api/classifyUsers` — daily at 11 AM UTC: re-classifies all users into `migration_type` buckets
  - `/api/admin/gmail/sync` — hourly: pulls new support emails from Gmail into `support_emails`
- **`app/api/classifyUsers/route.js`** — runs the full user classification query using `neon()` direct SQL for the JOIN and Drizzle `inArray` for batch UPDATE. Returns a JSON summary with counts and changes. Logs results to `app_logs`.

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
| `/api/classifyUsers` | Re-classifies all users into migration_type buckets (daily cron) |
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
| `/admin/inbox` | `app/admin/inbox/InboxClient.js` | Ticket list, status filter tabs, Sync Gmail button, CASE badge on linked tickets |
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

## User Migration Types

The `user.migration_type` column classifies all users for paywall logic (last updated 2026-05-22):

| Value | Count | Meaning |
|---|---|---|
| `stripe` | 11 | Active Stripe subscriber — no paywall |
| `auth_net_subscriber` | 19 | Active Auth.net ARB sub — no paywall |
| `active_current` | 335 | Has activity + future renewal date — no paywall |
| `active_expired` | 404 | Has activity + lapsed/missing renewal date — **redirect to `/renew`** |
| `inactive` | 15,502 | No activity signals — no paywall |

Classification rules: `active_expired` = has activity signals (session/user_logs/levelPath records) AND renewal date is missing or in the past. `active_current` = same activity signals AND renewal date is in the future. `renewalStatus` API reads this pre-computed field directly — it does not re-evaluate dates at runtime.

The `/api/classifyUsers` cron runs automatically at 11 AM UTC daily. To re-run manually: `node claudePlans/classify-users.js --write` (omit `--write` to preview without changes).

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
- **Reclassification is immediate** — `updateUserMigrationType` is called synchronously inside `renew-subscription/route.js`. A successful renewal is reflected in `renewalStatus` on the next request, no cron wait needed.

## Renewal Flow — Known Fixes (2026-05-27)

- **Double-submission race condition** — `RenewalPortal.js` uses `submittingRef` (`useRef`) to guard `handleSubmit`; React `setState` is async and doesn't block re-clicks before re-render.
- **`source=renewal` in redirect URL** — `RenewalPortal.js` redirect to `my.gymnasticbodies.com` must include `&source=renewal`. Without it, `loginActions.js` on the `my.` side skips filling in missing JWT fields (`refreshExpireTime`, `authExpireTime`, `timezone`) and dispatches `Logout()` immediately.
- **Server-side idempotency** — `renew-subscription/route.js` returns early if `user.migrationType === 'stripe'` and `stripeSubscriptionId` already exists, preventing duplicate subscriptions from racing requests.

## SendGrid — Direct Scripting

- Can send email directly via `node -e` script: `require('@sendgrid/mail')` + `require('dotenv').config({ path: '.env.local' })`. No need to go through the `/api/` route for one-off sends.
