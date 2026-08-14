# Adminable Dynamic Pricing — Plan (2026-08-13)

Approved by owner (Greg) 2026-08-13. Green light on all points.

## Goal
Every price the app charges or shows is driven by a single DB-backed config that is fully
editable from `/admin`, with no redeploy. Changing the Subscribe price is "handled smartly by
Stripe" (mint a new Stripe Price, repoint new signups, leave existing subscribers on their old
Price). Existing relationships keep billing their established rate.

## The four buckets (owner's framing)
1. **Normal Subscribe** — new signups (`create-subscription`), ONE real Stripe Price. No annual.
2a. **Renew, no payment history** — one defined flat rate (today $50/mo).
2b. **Renew, has payment history** — honor former rate exactly (per-user, from `user_setting`). No cap, no threshold, no choice UI.
3. **Offer to non-renewers** — many, keyed by slug, each its own `/offer/<slug>` URL. Legacy is its own `kind`.

## CRITICAL: defined rates only, no math (owner correction 2026-08-13)
- **Annual is REMOVED entirely** — no monthly/annual toggle, no annual Stripe Price, no annual bug to fix.
- **Nothing is computed from another number.** No "annual÷12", no "$60/mo equivalent", no "Save $X/year",
  no monthly-equivalent thresholds. Every number on screen is a rate defined explicitly in the config and
  rendered as-is. A label like "regular rate of $50" is a DEFINED field, not a calculation.
- Ripping out the `/renew` threshold/cap/choice logic: no-history → defined renew rate; has-history → exact former rate.

## CRITICAL: every price mention is {variable}-driven (owner 2026-08-13)
- **No literal dollar figure anywhere** — not in `subscribe.json`/`offers.json` copy, not in component JSX,
  not in email templates, not in prose. Every price string is a template token resolved from the config
  at render: e.g. `{{subscribePrice}}`, `{{renewPrice}}`, `{{offerPrice}}`, `{{offerRegularRate}}`.
- Copy fields that today embed a price (offer subheadline "A special rate … $15/month", drip email
  "$15/month … regular rate of $50/month", any "$75" marketing line) are rewritten to carry tokens; a
  small render helper substitutes the config value. Changing the config changes every rendered mention.
- Applies to: subscribe page, renew portal, offer page(s), `cronMarketingDrip` email, admin previews.

## FINAL owner decisions (2026-08-13, executed)
- **Standard Subscribe = $50/mo.** Minted live Stripe Price `price_1U4951AhvJ5jyCLHR452r5Aa` on product
  `prod_UXhQNfdJZTXpPg` (applyStandardPrice.js). Old $75 Price `price_1TYc1TAhvJ5jyCLHIdfyRDpb` left intact
  for existing subscribers (grandfathered).
- **Historical renew rate NIXED.** Everyone renews at the flat $50 standard — no per-user historical rate,
  no cap, no choice screen, no yearly÷12 conversion needed. renewalStatus + renew-subscription are server-
  authoritative on the config rate.
- **Monthly only.** Annual removed everywhere.
- **Every price mention is {{variable}}-driven** from the config; no literal $ in copy/components/emails.
- offers.json + subscribe.json pricing[] deleted (config is the source of truth).

## Decisions (locked)
1. Storage: existing `site_settings` table, `key='pricing'`. No migration.
2. Stripe on Subscribe change: mint a new Stripe Price on the same product, store its id, new signups use it; existing subs untouched (grandfathered).
3. Offer URLs: `/offer/<slug>`. Bare `/tim` vanity = hypothetical, NOT built now. Legacy is the only offer for now.
4. Offer editability: full (price/term/dates + copy). "Doesn't matter for now" → expose all, it's free.
5. Also fix the latent bug: new signups ignore annual selection and bill the one monthly Price. Each Subscribe plan gets its own Stripe Price so annual actually bills annually.

## Config shape (`site_settings.value` where key='pricing')  — NO annual, defined rates only
```json
{
  "subscribe":      { "amount": 75, "term": "monthly", "trialDays": 7, "stripePriceId": "price_1TYc1T..." },
  "renewNoHistory": { "amount": 50, "term": "monthly" },
  "offers": {
    "legacy15": {
      "kind": "legacy", "active": true,
      "amount": 15, "term": "monthly", "regularRate": 50,
      "campaign": "marketing_drip_legacy15", "endDate": "2026-09-30",
      "headline": "Welcome Back.", "headlineAccent": "Legacy Offer.",
      "subheadline": "A special rate reserved for Legacy Members — {{offerPrice}}/month to rejoin.",
      "ctaLabel": "Rejoin for {{offerPrice}}/month",
      "metaTitle": "Legacy Member Offer | GymnasticBodies"
    }
  }
}
```
Copy fields carry `{{offerPrice}}` / `{{offerRegularRate}}` tokens, never literals. `regularRate` is a
DEFINED comparison rate for the offer (not computed). 2b (has-history) is per-user, not in the config.

## Reads to make dynamic (from recon — every stale-number surface)
- `app/subscribe/page.js` (+ `subscribe.json` prices removed/derived) → getPricing().subscribe
- `components/RenewalPortal.js` (GRANDFATHERED const + thresholds) ← passed from renew page server props
- `app/api/user/renewalStatus/route.js` (defaults) → getPricing()
- `app/api/stripe/create-subscription/route.js` → getPricing().subscribe[term].stripePriceId (per selected term)
- `app/api/stripe/renew-subscription/route.js` (fallback) → getPricing()
- `app/api/stripe/offer-subscription/route.js` → getPricing().offers[slug]
- `app/offer/[slug]/page.js` + OfferClient/OfferPortal → getPricing().offers
- `app/api/cronMarketingDrip/route.js` (email $15/$50 copy) → getPricing()
- Cleanup dead literals: `app/subscribeOld/`, `components/AccountDetailsComp-original.js` (confirm dead, delete/leave)
- Note: `webhook/route.js:474` `>= $100` annual-reminder assumption — revisit if annual drops below $100.

## Build order
1. `lib/pricing.js` — `getPricing()` reads site_settings row, deep-merges over a hardcoded DEFAULTS (current values) so a missing/partial row can never break checkout. `getSubscribePlan(term)`, `getOffer(slug)`, `getRenewPricing()`.
2. Seed script `claudeTools/seedPricing.js` — writes the config row from today's exact values (idempotent, insert-or-update). DB-only, safe.
3. Wire all readers above to getPricing(). Subscribe page + offer page become server-driven; RenewalPortal takes pricing via props from the (already client-wrapped) renew page — thread through RenewClient.
4. `/api/admin/pricing` — GET (return config), PUT (validate + save). On PUT: for each subscribe plan whose amount changed, `stripe.prices.create({ product, unit_amount, recurring })` and store the new id. requireAdmin.
5. `/admin/pricing` page + AdminNav link — sections for subscribe/renew/offers; offer CRUD (add slug → live URL). Dark/orange design system, inline-per-project component reuse.
6. Live Stripe annual-Price mint — DISCRETE confirmed step (production Stripe write). Confirm key mode first.
7. Verify: browser-test /subscribe, /renew, /offer/legacy15 render from config; admin edit round-trips; grandfathering unaffected.

## Guardrails
- getPricing() must never throw on a bad/missing row — always fall back to DEFAULTS.
- Never re-price an existing subscription. Only new signups pick up a new Subscribe Price.
- Stripe Price minting is a production write — confirm live-key mode and idempotency before running.
- Payment-logic changes: keep the existing `findActiveStripeSubByEmail` duplicate guards intact in all three routes.
