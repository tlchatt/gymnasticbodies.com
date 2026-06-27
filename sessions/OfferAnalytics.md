# Session: OfferAnalytics

- **Session ID:** `8b20d8bb-2b7e-4b09-ad14-8091b78f2fbe`
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** 2026-06-26 to 2026-06-27
- **Transcript:** `/home/dreadpirate007/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/8b20d8bb-2b7e-4b09-ad14-8091b78f2fbe.jsonl`

## Summary

Investigated whether $15/$20 Stripe subscriptions were offer acceptances or legacy `/renew` conversions. Confirmed zero offer conversions so far — all were legacy annual rates ($179.88/yr = ~$15/mo, $239.88/yr = ~$20/mo). Identified that the offer flow had no analytics tracking and shared the same Stripe route as `/renew`, making source indistinguishable. Built full offer analytics separation: new `offer.*` event namespace, dedicated `/api/stripe/offer-subscription` route, offer funnel on `/admin/analytics`. Deployed and verified on production.

## First User Inputs

1. Asked whether $15/$20 Stripe subscriptions were offer acceptances
2. Noted $15 subs could also be legacy `/renew` at existing rate
3. Asked to cross-reference offer recipients vs stripe subscribers
4. Directed to fix all analytics gaps with full event separation
5. Asked to deploy and verify

## First Command Run

```bash
node check-prices.js  # price breakdown for all Stripe subscribers
```

## Key Accomplishments

- **Confirmed zero offer conversions** — cross-referenced `outbound_emails` (campaign=`marketing_drip_legacy15`) against `customer_segment='stripe'`; no matches
- **Identified $15/$20 source** — both are legacy annual rates via `/renew` (`$179.88/yr`, `$239.88/yr`), not offer accepts
- **Built `/api/stripe/offer-subscription/route.js`** — dedicated route for offer payments; logs `offer.attempt`, `offer.success`, `offer.failed`, `offer.already_active`, `offer.3ds_required` with `slug`, `price`, `term`
- **Updated eligibility route** — `app/api/offer/[slug]/eligibility/route.js` now logs `offer.eligibility_check` (server-side) with `eligible`, `reason`, `slug`
- **Updated `/api/log` allowlist** — added `offer.page_view`, `offer.form_submit`, `offer.card_error`
- **Updated `OfferClient.js`** — fires `offer.page_view` on mount with `slug` + `email`
- **Updated `OfferPortal.js`** — fires `offer.form_submit` before API call; fires `offer.card_error` on card problem; now calls `/api/stripe/offer-subscription` (not `/api/stripe/renew-subscription`)
- **Analytics API** — `app/api/admin/analytics/route.js` queries all `offer.*` events, groups by slug in JS (can't use `->>` on jsonb in parameterized queries), returns `offerFunnels` and `recentOfferConversions`
- **Analytics UI** — `AnalyticsClient.js` renders per-slug offer funnel (page views → eligible → form submits → card errors → conversions) plus recent conversions list
- **Deployed and production-verified** — all endpoints confirmed live: `offer-subscription` GET → OK, eligibility all 3 paths correct, log allowlist working, 308 trailing-slash redirects handled correctly by browsers (consistent with existing app pattern)

## Technical Details

### Event Namespace Separation

| Flow | Events |
|---|---|
| `/renew` (paywall redirect) | `renewal.attempt`, `renewal.success`, `renewal.failed` |
| `/offer/[slug]` (email campaign) | `offer.page_view`, `offer.eligibility_check`, `offer.form_submit`, `offer.card_error`, `offer.attempt`, `offer.success`, `offer.failed` |

All offer events include `slug` in the `data` jsonb field. The analytics route groups by `row.data?.slug` to produce per-offer funnels.

### Why Separate Routes

The offer and renewal flows call the same underlying Stripe logic but are triggered differently (email link vs post-login paywall redirect). Keeping them on separate API routes means `offer.*` and `renewal.*` logs are always cleanly separated with no source tagging needed.

### Analytics Grouping Note

`app_logs.data` is jsonb. The `->>` operator and `DISTINCT` fail in parameterized neon template-literal queries. Offer funnel aggregation fetches all `offer.*` rows and groups by `row.data?.slug` in JavaScript instead.

## Files Created

- `app/api/stripe/offer-subscription/route.js` — new dedicated offer payment route

## Files Modified

- `app/api/offer/[slug]/eligibility/route.js` — added eligibility logging
- `app/api/log/route.js` — added offer events to allowlist
- `app/offer/[slug]/OfferClient.js` — `offer.page_view` on mount, passes `slug` to OfferPortal
- `app/offer/[slug]/OfferPortal.js` — `offer.form_submit` / `offer.card_error` logging, calls new route
- `app/api/admin/analytics/route.js` — offer funnel queries + recentOfferConversions
- `app/admin/analytics/AnalyticsClient.js` — offer funnel UI section

## Git / Deploy

- All 6 modified files committed in commit `aea14a8`
- `app/api/stripe/offer-subscription/` was initially untracked (missed in commit) — user added and deployed separately
- Deployed to production and verified all endpoints live

## Note for Next Session

**Goal:** Monitor offer conversions and review whether the `legacy15` campaign is performing, or whether additional offers / outreach is needed.

**First action:** Query `app_logs` for `offer.*` events and check `/admin/analytics` offer funnel section for real data — `node -e "require('dotenv').config({path:'.env.local'}); const {neon}=require('@neondatabase/serverless'); const sql=neon(process.env.DATABASE_URL); sql\`SELECT ts,event,email,data FROM app_logs WHERE event LIKE 'offer.%' ORDER BY ts DESC LIMIT 20\`.then(r=>r.forEach(x=>console.log(x.ts,x.event,x.email,JSON.stringify(x.data)))).catch(console.error)"`

**Quirks:**
- `app_logs.data` is jsonb — never use `->>` or `DISTINCT` in parameterized neon queries; fetch rows and process in JS

**Deeper context:** `app.gymnasticbodies.com/sessions/OfferAnalytics.md`
