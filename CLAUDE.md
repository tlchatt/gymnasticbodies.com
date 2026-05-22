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

- Vercel cron jobs hit `/api/cronJobs/route.js` on a schedule
- Checks renewal dates, updates subscription statuses, sends emails via SendGrid

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

- **`app/subscribe/page.js`** — full dark/orange redesign (Barlow Condensed + DM Sans, CSS modules, no MUI). Copy of old page preserved at `app/subscribeOld/`.
- **`components/DarkNav.js`** — MUI-free sticky nav for marketing pages (dark bg, blur, white logo, ghost Sign In + orange CTA). The global MUI nav (`components/Nav.js`) returns null on `/subscribe` via `usePathname`.
- **`components/marketing/`** — reusable marketing section components: `PricingCard`, `FeaturesList`, `BottomCta` — each with its own CSS module.
- **`lib/fonts.js`** — shared Barlow Condensed + DM Sans `next/font/google` instances for marketing pages.
- **`app/layout.js`** — body uses `minHeight: "100vh"` (was incorrectly `height: "100vh"` which clipped all pages to one viewport).

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
| `/api/cronJobs` | Renewal checks & subscription updates |
| `/api/migration` | Bulk user import from legacy data |

All user/payment API routes return CORS headers (`Access-Control-Allow-Origin: *`).

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

Re-run `node claudePlans/classify-users.js --write` periodically to keep types current as subscriptions change. Run without `--write` first to preview changes.

## Environment Variables

```
# Database & Auth
DATABASE_URL
BETTER_AUTH_SECRET

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
```
