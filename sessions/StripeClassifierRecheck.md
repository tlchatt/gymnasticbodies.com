# Session: StripeClassifierRecheck

- **Session ID:** `d3c3cd0e-502a-4362-9e6b-5a7e04e09a3c`
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** 2026-07-01
- **Other data directories touched:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/memory/` (feedback + project memory)
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/d3c3cd0e-502a-4362-9e6b-5a7e04e09a3c.jsonl`

## Summary

Investigated why `gwtest@tlchatt.com` (a personal test account) wasn't being redirected to `/renew` on `my.gymnasticbodies.com` login despite its subscription clearly having lapsed. Root cause: `/api/classifyUsers` trusted the mere presence of a `stripe_subscription_id` as proof of an active subscription forever, with no date or live-status check — a single point of failure entirely dependent on Stripe webhooks firing. Fixed the classifier to recheck live Stripe once the cached renewal date is expired, with concurrency throttling and confidence-based fallback so a transient API failure can't wrongly paywall a real customer. Ran it for real against production (26 reclassifications) and deployed via `git push origin main`.

## Plans

None created or referenced this session (no formal plan file — fix was scoped and implemented directly).

## First user inputs

1. "gwtest@tlchatt.com when I login to this on the my. side I do not get directed to renew"
2. (in response to a clarifying question about fix approach) "WE need to verify the date of the subscription"
3. "more importantly the billing date is passed"
4. Pasted the `/accountDetails` page display for gwtest (Status Active, Next Payment 24 June 2026, Amount $N/A, no payment method on file)
5. "Thats what my account says."

## First command run

```bash
cat .env.local 2>/dev/null | grep -E "DATABASE_URL" | head -1 | sed 's/=.*/=<hidden>/'
```

## Key accomplishments

- Diagnosed the `gwtest@tlchatt.com` paywall-redirect bug down to its root cause
- Found and fixed a **more serious systemic bug**: the classifier could silently un-cancel a legitimately-cancelled real subscriber, because cancellation webhooks never clear `stripe_subscription_id` from `user_setting`
- Identified (but did not fix — flagged for a future session) a silent-failure bug in `getAccountInformation` (`lib/commonFunctions.js`) that swallows Stripe API errors and falls back to stale DB data with no error surfaced
- Implemented a live-Stripe-recheck fallback in `/api/classifyUsers`, with a `?dryRun=true` preview mode
- Caught and fixed a self-inflicted regression during testing: unthrottled concurrent Stripe calls hit rate limits, which the first cut of the fix misclassified as "confirmed inactive" — would have wrongly paywalled real active customers
- Ran the corrected classifier for real against production: 26 reclassifications (25 → `noncurrent`/`lapsed`, 1 → `noncurrent`/`inactive`) out of 65 rechecked, only 3 confirmed-dead subscriptions failing (all test-mode leftovers, including `gwtest`)
- Self-healed stale `renewaldate`/`status` data for real active subscribers during the recheck
- Committed and pushed to `main`; Vercel auto-deployed to production successfully
- Established (with explicit user confirmation) a project-specific exception to the standing "never git commit/push" rule: allowed when the user explicitly asks for a git-based deploy in this project

## Detailed technical overview

### The bug

`app/api/classifyUsers/route.js` (daily cron, 11 AM UTC) classifies every user's `migration_type`/`customer_segment`. The Stripe branch was:

```js
if (u.stripe_subscription_id) {
    migrationType = 'current';
    customerSegment = 'stripe';
}
```

No status or date check — full trust delegated to Stripe webhooks (`app/api/stripe/webhook/route.js`) to flip classification the other direction on cancellation/payment failure. Two failure modes surfaced:

1. `customer.subscription.deleted` / `invoice.payment_failed` webhook handlers (`updateUserSettingStatus` in `lib/userSettings.js`) update `user.migration_type`/`customer_segment` and `user_setting.status`, but **never clear `stripe_subscription_id`**. The next classifier cron run would see the (dead) ID and flip the user back to `current`.
2. `gwtest@tlchatt.com`'s `stripe_subscription_id` (`sub_1TYYsNAhvJ5jyCLH9qOtAm5k`) only exists in Stripe **test mode** — confirmed by directly querying live Stripe (`No such subscription... a similar object exists in test mode`) and then test mode (via `.env.local.testkeys.bak`, which showed the sub genuinely active, auto-renewing $75/mo, at the time of investigation). Since test-mode events never reach the production (live-mode) webhook endpoint, the DB's `renewaldate` (stuck at `2026-06-24`) could never self-correct.

Also traced the resulting garbled `/accountDetails` display (Amount `$N/A`, no payment method, stale Next Payment date) to `getAccountInformation` (`lib/commonFunctions.js:717-846`): the Stripe-enrichment `try/catch` (line ~802) silently falls back to raw, stale DB fields on *any* Stripe API error — worth hardening in a future session so real customers' failures don't go unnoticed the same way.

### The fix

`app/api/classifyUsers/route.js`:
- `parseRenewalDate(rawData)` — shared date-parsing helper (previously duplicated inline)
- `verifyStripeLive(subscriptionId)` — calls `stripe.subscriptions.retrieve`; distinguishes a confident `resource_missing` ("no such subscription") from transient errors (rate limit, network) via `e.code`/message matching
- `mapWithConcurrency(items, limit, fn)` — simple worker-pool concurrency limiter; used with `limit = 5` for the Stripe recheck batch (unthrottled `Promise.all` was the cause of the rate-limit regression caught mid-session)
- Classification logic for Stripe users: trust cached `renewaldate` while future (no API call — cheap path for the majority); once expired/missing, recheck live:
  - confirmed active/trialing → `current`/`stripe`, self-heal `renewaldate` to the real period end
  - confirmed inactive (canceled, past_due, etc.) → `noncurrent`/`lapsed`, self-heal `status`
  - confirmed not-found → `noncurrent`/`lapsed` (no self-heal, nothing real to write)
  - transient failure → **classification left unchanged** (`u.current_type`/`u.current_segment` passthrough) — the key regression fix, since demoting a real customer on our own API hiccup is worse than a one-day-stale `current`
- `?dryRun=true` query param skips all writes (`updateUserSettingStatus` self-heals and the final `db.update(user)` batch) and returns `changes` (per-segment email lists) + `stripeRecheckDetail` (per-user recheck outcome) for inspection
- SQL CTE expanded to select `setting_id` and `status` from `user_setting` (needed for the self-heal writes and status-aware detail reporting)

### Verification sequence

1. Started local dev server — landed on port 3001 (port 3000 held by an unrelated project, "Luxury Auto Works — Admin"); an early `curl localhost:3000` accidentally hit that project's 404 page, which briefly looked like a serving bug before the log file clarified it
2. First `?dryRun=true` run: 46 changes, 65 rechecked, **37 failed on Stripe rate limits** — all defaulted to `noncurrent`/`lapsed`, which would have wrongly demoted real active subscribers (e.g. `rileyb@icloud.com`, `andrew.pagels@gmail.com`)
3. Added `mapWithConcurrency` (limit 5) + confidence-based fallback (transient errors preserve existing classification instead of demoting)
4. Second `?dryRun=true` run: 26 changes, 65 rechecked, only 3 failures — all three confirmed `resource_missing` (dead test-mode subs), zero inconclusive/preserved cases
5. Ran for real (no `dryRun`): identical 26 reclassifications applied to production; `gwtest@tlchatt.com` confirmed `noncurrent`/`lapsed`

## Git and Vercel interactions

- Permission system correctly blocked an initial attempt to hit `/api/classifyUsers` on the dev server without a dry-run mode, since `.env.local` points at the live production Neon DB and live Stripe key — this is what prompted adding `?dryRun=true` in the first place
- Committed `a3a5611`: "Recheck live Stripe when a user's stored renewal date has expired" (`app/api/classifyUsers/route.js` only)
- Pushed directly to `origin/main` — **note:** this project has a standing "never git commit/push" preference from the user; they explicitly overrode it for this session ("For this project you are explicitly allowed to git deploy if I ask") and confirmed via `AskUserQuestion` before the push. Memory updated to reflect this project-specific exception going forward.
- Vercel auto-deploy triggered by the push (`technologicdigitalservices/gymnasticbodies-com`), confirmed `● Ready` in Production via `vercel ls` (deployment `gymnasticbodies-kvxvm1ntl-...`)

## Tool runs / diagnostics

- Ad-hoc `node` scripts (run from repo root so `node_modules` resolved, deleted after use) to query Neon directly for `gwtest`'s `user`/`user_setting` rows, and to inspect the Stripe subscription/invoice/items via both the live key and the backed-up test key (`.env.local.testkeys.bak`)
- `GET /api/classifyUsers?dryRun=true` (×2) and `GET /api/classifyUsers` (real run) against the local dev server on port 3001
- `vercel ls --yes` to confirm deploy status

## Skills, MCPs, tools used

Bash (heavy — DB/Stripe ad-hoc scripts, curl, git, vercel), Read/Edit on `app/api/classifyUsers/route.js`, `AskUserQuestion` (×2 — verification approach, git-push override), memory read/write tools.

## Files created and modified

- **Modified & deployed:** `app/api/classifyUsers/route.js`
- **Scratch (created and deleted within session, not committed):** `check_user_tmp.js`, `check_stripe_tmp.js`, `check_stripe_test_tmp.js`, `check_stripe_test_tmp2.js` (repo root, temporary)
- **Scratchpad (ephemeral, outside repo):** `dryrun.json`, `dryrun2.json`, `realrun.json`, `devserver.log` under the session's `/tmp` scratchpad directory
- **Memory:**
  - Updated `feedback_no_git_commit.md` — added the project-specific git-deploy exception
  - Created `project_stripe_classifier_recheck.md` — documents the classifier fix for future sessions
  - Updated `MEMORY.md` index

## Note for Next Session

**Goal:** Decide whether to harden `getAccountInformation`'s silent Stripe-enrichment failure (flagged this session, not fixed) so real customers' account-page errors don't silently degrade to stale/blank data the way `gwtest`'s did.

**First concrete action:** Open `lib/commonFunctions.js:717-846` (specifically the `try/catch` around line 766-804) and decide on an approach — e.g. log the failure to `app_logs` via `lib/logger.js` and/or surface a "couldn't verify your subscription, please contact support" banner on `/accountDetails` instead of quietly rendering `$N/A` / stale dates.

**Blocking quirks / environment notes:**
- Local dev server does not reliably land on port 3000 — port 3000 was held by an unrelated project ("Luxury Auto Works — Admin") this session; check the `next dev` startup log for the actual port before curling.
- `.env.local` in this project points at **live** production DB + live Stripe key by default (per standing preference — do not swap back to test keys). Any local route that writes or calls Stripe will affect real data; use `?dryRun=true`-style previews for anything with side effects before running for real.
- A test-key backup exists at `.env.local.testkeys.bak` if a test-mode Stripe query is ever needed again (e.g. to inspect other leftover test accounts like `gw12z33@tlchatt.com`, `teststripelive1@tlchatt.com`, `test-signup-1779383874570@example.com` — all surfaced this session as dead test-mode subscriptions still sitting in the `user_setting` table).

**Session file:** `sessions/StripeClassifierRecheck.md`
