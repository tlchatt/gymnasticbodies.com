# RenewOfferLoginHandout — worker session (board task 2810c30e)

- **Session ID:** `070445b0-9e33-400a-af2f-9b272ddc7e88`
- **Dispatched by:** manager `987aa382` on 2026-10-09
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Status as of 2026-10-09:** findings + plan written; **waiting for owner approval before any code change** (payment/auth code).

## Findings (2026-10-09, from reading the code — nothing executed against Stripe)

**Hole A — free login, live now.** `app/api/stripe/renew-subscription/route.js:51-64` and
`app/api/stripe/offer-subscription/route.js:49-62`: if the posted email's member already has
`stripeSubscriptionId` + `customerSegment = 'stripe'`, the route inserts a 7-day `session` row and
returns its token. No card, no password. The token works on every member route (they read
`lib/sessionUser.js`). Anyone who knows a paying member's email can get their login with one POST.

**Hole B — a declined card also gets a login.** `createStripeSubscriptionWithPriceData`
(`lib/stripeServerFunction.js:106`) sets no `payment_behavior`, so Stripe's default `allow_incomplete`
applies: a declined charge returns a subscription with status `incomplete` and a PaymentIntent of
`requires_payment_method`. Both routes only special-case `requires_action` (3DS), so a decline falls
through to: mark the member `active`/`current`, mint a session, return success.

**Hole C (smaller) — paying for someone else.** The success branch hands the login to whoever paid,
with no proof they are the member. Costs the attacker $50 and leaves a card trail.

**Callers:** `components/RenewalPortal.js:110-142` and `app/offer/[slug]/OfferPortal.js:64-95` redirect
to `my./?authToken=<token>...&source=renewal`. my. arrives at `/renew` with
`?email&token&userId` (`my./src/Store/Action/loginActions.js:355`), so a renewing member from my.
already holds a session token; email-link renewals (`{{renewalLink}}`) don't.
`components/PaymentPortal.js` → create-subscription mints no session.

**Adjacent (pre-existing):** after 3DS, both portals read `result.success` from the first response
(which only had `requiresAction`), so a successful 3DS renewal shows "Renewal failed" and never
writes Neon (only the webhook does).

## Plan for (1) — awaiting owner OK

1. **Already-active branch (both routes):** never mint a session. Return
   `{ success:false, alreadyActive:true, message:"You already have an active membership — please sign in." }`;
   portals show it with a Sign-in link to my.
2. **Only a paid subscription counts:** after `subscriptions.create`, proceed only if
   `subscription.status === 'active'` (PaymentIntent `succeeded`). `requires_action` → 3DS as now.
   Anything else → cancel the incomplete subscription, return the card error, no Neon write, no session.
3. **Who gets a login after a real payment:** if the request carries the member's own live session
   token (`Authorization: Bearer`, checked with `getUserIdForToken` = same user), return that token,
   mint nothing. Otherwise — owner choice:
   - **(a, recommended)** mint a session only after confirmed payment (keeps email-link renewals
     one-click; Hole C remains, but costs a real charge).
   - **(b)** never mint; send them to my. sign-in with the email filled in.
4. Portals: send `Authorization: Bearer <token>` when they have one (RenewalPortal gets it from the URL).

Test on .dev with requests that stop before Stripe: already-active email → no `session` row created
(count before/after), `alreadyActive` response. Payment branches proven by code reading only.

## Follow-ups (same task, need owner OK)
- (2) No CRON_SECRET/admin check in `app/api/classifyUsers` and `app/api/cronMarketingDrip`;
  `cronRenewalOutreach` has `requireAdminOrCronSecret` (L60) — confirmed.
- (3) `lib/sendgrid.js:271` logs the SendGrid API key (moved from :255).
- (4) `migration.js` posts to `localhost:3001/api/migration` — route no longer exists; `testAccountDetails.js` sign-in TBD.
- (5) my. home-screen fetches not signing out on 401 — not yet inspected.

## Update 2026-10-12 — fix committed (`c58c296`), handed to the manager

Owner ruling (2026-10-12): "No sign in should ever occur on renew / offer or any other payment page, until the transaction is complete."

As of 2026-10-12:
- Sessions are now minted in one place, `createMemberSession` (`lib/sessionUser.js`), called only after a confirmed payment.
- renew/offer: already-active → 409 `alreadyActive`, no token. Declined ('incomplete') → sub cancelled, 402, nothing recorded. 3DS → page calls back with `subscriptionId`; `retrieveConfirmedSubscription` (`lib/stripeServerFunction.js`) checks active + created < 1h + member's customer/email, then records + signs in. This also fixes the old "Renewal failed" after a successful 3DS.
- create-subscription (signup): declined → sub cancelled, no account, no sign-in. Trial ('trialing') still counts as complete.
- Test: prod build on localhost:3014 (the .dev service would not start — "OS file watch limit reached"; two other node processes, the claude.tlchatt.com server pid 1643 and the wbw sync-worker, hold ~523k of the 524,288 inotify watches). Already-active renew + offer → 409, no token, session count 5→5; bogus confirm id → 402.
- History: only 3 `already_active` hits ever (eric.m.k.brown 2026-07-01, jackdendy 2026-08-20, amonaghan 2026-10-02) — each got a session from the hole; all look like real members returning, no sign of abuse.
- Not done: deploy (manager). Items (2)–(5) still waiting for the owner's OK.

## Update 2026-10-12 (later) — items 2–5 done, handed to the manager

Manager relayed owner go-ahead (OWNER VOICE confirmed with owner-said.js). As of 2026-10-12:
- `c58c296` is LIVE (manager deployed via Vercel API, dpl_48wbd8KzY5Dz1FEwoi9w4VCyTuCh; prod check 409 alreadyActive, no token).
- app. `b87b8e6`: CRON_SECRET gate on classifyUsers + cronMarketingDrip; SendGrid key log removed; migration.js retired. Tested on local prod build :3014 (403 without secret ×3; Bearer passes).
- `/var/www/Work/Gymfit/claudeTools/testAccountDetails.js` (not in git): signs test accounts in, passes `?token=`. Result 34/40; the 6 failures are stale expectations ("Support History", "Workout Activity", authNet "No Renew button") from the c600523 My Account rebuild — not updated (outside this task).
- my. `cb096d8`: 401 → sign-out on the two home-screen fetch paths. Lint only; not built.
- Not done: deploys (manager). Open: .dev service can't start until inotify watches free up (pid 1643 claude.tlchatt.com server + wbw sync-worker hold ~523k of 524,288).
