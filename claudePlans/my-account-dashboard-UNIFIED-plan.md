# My Account Dashboard — UNIFIED Plan (2026-07-24)

Consolidates three audits: `my-account-payment-on-file-plan.md`, `status-from-expiration-audit.md`, `my-account-dashboard-data-inventory.md`. **Awaiting owner sign-off before any code is written** (structure + hooks rule).

## Owner directives captured
1. Data is **modular** — each area sourced independently; page must **not fail on load if one source fails**; conditionally display what we have.
2. Subscription **"Active" derives from the expiration date (`renewaldate`), not the raw `status` string** — everywhere (My Account + admin).
3. Show, each with a visual: workout history, nutrition/Thrive, preferences, levels — plus **support & email history**.
4. Support is **two-way**: reply to a case inline + a Contact Support button, message **instantly deposited** into the page and routed to the admin case system.
5. Payment: show renewal date + "no payment saved" + **add payment method → save Stripe customer for charge at expiry**.

## Architecture
Decompose the monolithic `getAccountInformation` (a DB→Stripe→Auth.net waterfall where ONE throw — e.g. the Auth.net fallback at `commonFunctions.js:808` that runs for every gateway-less user — collapses the whole page to "No Subscription") into **independent section-fetchers**, each `try/catch` → returns partial data or `null`, composed with `Promise.allSettled`. Page renders each section conditionally; empty/failed section → hidden or placeholder, never a whole-page failure. Mirrors the existing `page.js:12-16` Promise.all → prop-drilled `Display*` pattern, hardened.

## Shared helper — `lib/subscription.js` (NEW)
- `isSubscriptionActive({ renewaldate, stripeStatus })` → `true` if `renewaldate` parses to a FUTURE date OR live Stripe status is `active`/`trialing`.
- `subscriptionStatusLabel(...)` → 'Active' | 'Expired' | 'Trial'.
- `parseRenewalDate(v)` mirroring `classifyUsers/route.js:9-18`.
**Switch these call-sites** (from status audit): `commonFunctions.js:749` (`hasSubscription`) + `:740` (add server-computed `impInfo.isActive`); `AccountDetailsComp.js:97` (consume flag, keep `noncurrent` guard) → `:133`/`:110`/order rows follow; admin `api/admin/users/route.js:29` + `UsersClient.js:283`; `adminSubscription.js` / `SubscriptionSummary.js:77`. **Do NOT touch the classifier** (already authoritative) or the `migration_type` admin badges (already date-derived).
**Impact:** 488 stale-"Active" users flip to "Expired" (correct — they're already noncurrent). 104 fixed users read Active on account + admin.

## Sections (each modular, conditional, resilient)
| # | Section | Source | Visual | Empty-state |
|---|---|---|---|---|
| 1 | Subscription & dates | `user_setting.data.renewaldate` + Stripe if any | Status pill (date-based) + renewal date + plan/term; drop `$N/A` | always shows (date or "no active membership") |
| 2 | Payment method | Stripe customer/PM (`user_setting.stripe_customer_id` + `data.paymentMethodId`) | Card brand+last4 OR "No payment method saved" + **Add** button | shows Add button |
| 3 | Order/billing history | existing DB/Stripe | list | null if none |
| 4 | Workout history | `user_logs` (union sections; **date rule: levels→`created_at`, migration sections→`user_schedule_date`**) | 12-mo contribution heatmap + totals/streak + `history` timeline | null if 0 logs |
| 5 | Levels & progression | `user_setting` `workout_level`/legacy `levelPath` (202 users) + curriculum | level chip + per-discipline mastery bars | null if none |
| 6 | Nutrition/Thrive | `user_logs section='thrive'` + `user_setting` `thrive_profile`/`thrive_state` | stat tiles + weight sparkline + photos | **null for most** (only ~1–10 users have it) |
| 7 | Preferences | `byo_settings`/`autopilot_state`/`byo_favorites` | key/value list | null if none |
| 8 | Support & email history (**two-way**) | `support_emails`+`support_cases`+`support_replies`+`outbound_emails` (key by user_id OR email) | threads grouped under cases w/ status badges; **inline reply box** + **Contact Support** button | shows Contact button even if no history |

**Data reality (important):** the AWS→Neon import is **lazy/on-demand, not backfilled** — only `levels` has broad real data (668 rows/158 users). The typical real member (e.g. `aleksandarjovic`) has just **levels history + a level + subscription**; Thrive/BYO/preferences are near-empty (mostly test accounts). The dashboard MUST look complete with only sections 1/4/5 populated — conditional display handles this; sections 6/7 hide for most.

## New API routes
- `POST /api/stripe/setup-intent` — get/create Stripe customer for the user → `{ clientSecret }`.
- `POST /api/stripe/save-payment-method` — attach PM, set default, persist `stripe_customer_id` (column) + `paymentMethodId`/brand/last4 (in `data` JSON). Reuses `createStripeCustomer`/`attachPaymentMethod` (`stripeServerFunction.js:5,9`).
- `POST /api/user/support-message` — persist a user reply/new message as an inbound `support_emails` row linked to `user_id` (+ `case_id` if replying); returns the row for **instant** display. Bypasses the email/Gmail pipeline entirely (guaranteed delivery to the case system — the failure class we spent today fixing).
- **Follow-up (design only):** `cronChargeExpiring` — charge saved PM `off_session` near `renewaldate` (note: the CLAUDE.md `/api/cronJobs` ref is stale; current crons are classifyUsers, gmail/sync, cronRenewalOutreach, cronMarketingDrip).

## Storage
`stripe_customer_id` → existing `user_setting.stripe_customer_id` column (already read by renew/offer routes). Card meta (`paymentMethodId`, `cardBrand`, `cardLast4`, `paymentMethodAddedAt`) → `user_setting.data` JSON (no column). **Classifier-safe:** `classifyUsers` never reads `stripe_customer_id` and only live-rechecks on `stripe_subscription_id`, so saving a card keeps them classifying via the `subscriber` branch — never re-triggers the paywall.

## React hooks introduced (SIGN-OFF REQUIRED)
- `AccountDetailsComp` subscription/payment: `useState` × (showAddCard, savedCard).
- `AddPaymentMethod.js` (NEW `'use client'`, `dynamic(ssr:false)`): `useStripe`, `useElements`, `useState`, `useEffect` (fetch clientSecret), `useRef` (double-submit guard).
- Support section: `useState` (reply text, optimistic message list), optional `useTransition`.

## Sequencing
Build + deploy dashboard → run the 488-flip change → **then** send the held billing-fix emails (they direct users to My Account).

## Open question for owner
Support: allow users to open a **new** case themselves, or only reply/attach to existing cases (Contact button → creates a case vs. plain ticket)?
