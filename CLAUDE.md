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

- **Authorize.net** (`authorizenet` SDK) — all payment logic lives in `lib/commonServerFunction.js`
- Capabilities: create transactions, void, create customer profiles, manage ARB subscriptions
- Payment entry point: `/api/paymentPortal/route.js` (accepts `multipart/form-data`)
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

## Key API Routes

| Route | Purpose |
|---|---|
| `/api/auth/[...all]` | better-auth handler (signin, signup, session, logout) |
| `/api/authentication` | Custom email+password sign-in |
| `/api/paymentPortal` | Authorize.net transactions & subscription creation |
| `/api/user/subscription` | Subscription webhook + account creation |
| `/api/user/userStatus` | Current user subscription status |
| `/api/user/log` | Workout log CRUD |
| `/api/user/resetLink` / `resetPassword` | Password reset flow |
| `/api/user/contactUs` | Contact form (SendGrid) |
| `/api/user/accountInformation` | Account details read/write |
| `/api/cronJobs` | Renewal checks & subscription updates |
| `/api/migration` | Bulk user import from legacy data |

All user/payment API routes return CORS headers (`Access-Control-Allow-Origin: *`).

## Environment Variables

```
# Database & Auth
DATABASE_URL
BETTER_AUTH_SECRET

# Authorize.net
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
