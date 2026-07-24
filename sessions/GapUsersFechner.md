# Session: GapUsersFechner

- **Session ID:** `f2765d2b-f5dd-45a3-b111-75e096dd6749`
- **Session name:** GapUsersFechner
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Dates:** 2026-07-23 → 2026-07-24
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/f2765d2b-f5dd-45a3-b111-75e096dd6749.jsonl`
- **Data written:** `sessions/GapUsersFechner.md` (this), many `claudePlans/*`, memories under `~/.claude/projects/.../memory/`, scratchpad scripts under the session tmp dir.

## First user inputs
1. "We're picking up from a previous session, here is a note it left you… (WPMigrationGoLive handoff) Don't perform any actions just review."
2. "'2. app.→www merge…' How are we functioning now for app. vs www"
3. "Okay lets go through it."
4. "I don't know what a 'system host' is"
5. "Keep the functionality of app. where it is. We will probably eventually merge my. into app. and keep www where it is."

**First command:** `dig … www.gymnasticbodies.com` (no `dig` on this box → switched to `drill`).

---

## What this session was
Started as the `app.→www` merge from the WP-golive backlog, then turned into a deep customer-support/billing investigation triggered by one user (**Thomas Fechner, pt_fechner@web.de**), which uncovered a systemic billing-migration bug + a systemic support-mail-loss bug, and ended with a **full modular rebuild of the `/accountDetails` "My Account" dashboard**.

## 1. Host canonicalization — SHIPPED (only deployed code this session)
- www = content, app. = application (permanent split; my. eventually merges INTO app.; never blanket-redirect app.→www). Host-scoped redirects in `next.config.mjs` (apex→www; app.-content→www via negative-lookahead exemption of `/api`,`/admin`,`/renew`,`/accountDetails`,`/subscribe`,`/offer`,legacy pages; www app-routes→app.). `alternates.canonical` on `[slug]`/`exercises`/`blog`.
- Commits **`a7de890`** (code) + **`bfb59ff`** (docs) pushed to `main` → Vercel prod. Live-verified 29-check matrix. Memory: `project_host_architecture`.

## 2. Thomas Fechner → billing-migration bug → 104 accounts fixed (DB LIVE)
- Cross-referenced WordPress/WooCommerce/Auth.net local exports (`data/legacy-exports/`) + AWS exports. Thomas = 5-yr annual subscriber ($179.88/yr), last paid **2025-09-14** → owed through ~2026-09-14, but Neon had `renewaldate:"N/A"` → wrongly `noncurrent` → paywalled.
- **Root cause:** migration lost the `renewaldate` for legacy WooCommerce subscribers.
- **Fixes (all LIVE in prod Neon):** Thomas granted access through **2027-03-14** (paid remainder + **6-mo goodwill**) + reply email sent (campaign `billing_fix_2026-07`). Then a subagent audit found **103 more victims** (`claudePlans/wc-migration-billing-victims-2026-07-23.json`) — all bulk-fixed to their computed paid-through (`migration_type=current`), then given a **+3-month credit** (renewaldate = paid_through + 3mo). Scripts logged `admin.grant_access` to `app_logs`.

## 3. Support-mail loss — reconciled (DB LIVE)
- The admin Gmail sync only ingested Contact-Form mail (carries `list:support@` header); **direct replies to outreach never synced** — DMARC From-rewrite + spam-filing + a `list:`-only query with no `in:anywhere` + cursor gaps. **281 missing customer messages** found in the `admin@gymnasticbodies.com` mailbox (52 in Spam). Report: `claudePlans/mail-reconciliation-2026-07-24.md`.
- **Write phase (LIVE):** ingested **221** into `support_emails`; created **28** cases for staff-answered-outside-the-system threads. 6 of the 103 victims had emailed us unanswered.

## 4. Gmail creds saga + RULES (memory)
- Local `.env.local` GMAIL_* were empty because they're marked **Sensitive** in Vercel (pull down empty) AND a prior `vercel env pull` had wiped the working local copy. Pulled prod env (added `Bash(vercel env pull *)` to `.claude/settings.local.json`). Set up a fresh **admin@gymnasticbodies.com** Desktop-OAuth client (id `947300678117-…`) and saved creds to `.env.local`. Discovered the missing direct-reply mail lives in **admin@'s SPAM** (greggorywiley@tlchatt.com was a dead end / contact-forms only; its creds are in the Maruchan project's `.gmail-token.json`).
- **Memory `feedback_never_remove_local_secrets`:** never wipe/overwrite local `.env` secrets; never mark Vercel vars Sensitive; always save provided secrets; Keap-key note.
- **Global `~/.claude/CLAUDE.md` (user added):** NEVER credit Claude/AI in git commits/PRs/comments — no `Co-Authored-By` trailer.

## 5. My Account dashboard — FULL REBUILD (code UNCOMMITTED / dev-only)
Built via multi-agent batches. Modular + resilient: `app/accountDetails/page.js` runs independent fetchers via `Promise.allSettled`; each section hides on null so one failure never blanks the page. **Status is derived from the expiration date everywhere** (new `lib/subscription.js` → `isSubscriptionActive`/`subscriptionStatusLabel`), never the raw `user_setting.status` string — applied on account + admin (488 stale-"Active" users correctly flip to Expired).
- **NEW `lib/accountData.js`** — 8 resilient fetchers: `getProfileSection` (reads `user` table directly — the fix for Fechner's blank Profile), `getSubscriptionSection`, `getPaymentSection`, `getActivitySection`, `getWorkoutHistorySection`, `getLevelsSection`, `getThriveSection`, `getPreferencesSection`, `getSupportSection`.
- **NEW `components/account/`** — `accountUi.js`, `SubscriptionSection`, `PaymentSection` + `AddPaymentMethod` (Stripe SetupIntent, light theme), `ActivitySection`, `WorkoutHistorySection` (12-mo SVG contribution heatmap), `LevelsSection` (mastery bars, heuristic), `ThriveSection` (sparkline), `PreferencesSection`, `SupportSection` (two-way **Cases (above) + Messages (accordion)**, inline reply + Contact → `POST /api/user/support-message`).
- **NEW routes:** `POST /api/stripe/setup-intent`, `/api/stripe/save-payment-method`, `/api/user/support-message`. Helpers `createSetupIntent`/`getOrCreateStripeCustomer` (`lib/stripeServerFunction.js`), `updateUserSettingPaymentMethod` (`lib/userSettings.js`). Card meta stored in `user_setting.data` JSON + `stripe_customer_id` column — **classifier-safe** (never writes `stripe_subscription_id`).
- **Rewrote `components/AccountDetailsComp.js`** (removed all MUI → fixed hydration error; Profile/Security decoupled to `profile` prop). **Section order:** Subscription → Activity → (Manage) → Payment → Profile → Security → Workout → Levels → Thrive → Preferences → Support.
- **`lib/commonFunctions.js` `getAccountInformation` fix:** removed the `getAllDataFromFile(userEmail)` email-based Auth.net fallback that returned spurious customer ids → Auth.net "Error" then overwrote the good DB profile with blanks (root cause of blank My Account) + fired a slow Auth.net call every load. Now only enriches when a real `authorize_customer_id`/id exists.
- Plans: `claudePlans/my-account-dashboard-UNIFIED-plan.md` + `-payment-on-file-plan.md` + `status-from-expiration-audit.md` + `-data-inventory.md`. Memory `project_paywall_not_enforced` (paywall is advisory-only; `/api/user/log` ungated).

## 6. Admin-action cases — corrected model (DB LIVE)
- Owner corrected: **don't auto-create a case per admin action.** Cases tie a support **thread + action**; proactive actions are Activity-only.
- Retroactive: created 125 standalone cases → **deleted them** → re-tied **22** acted-on users WITH threads into resolved cases (8 new + 14 appended to existing, emails linked); **103 proactive credits → no case** (Activity only). Thomas's case #355 titled from his email thread, 2 emails linked, resolved.
- Going-forward: `createAdminActionCase` in `lib/adminSubscription.js` **appends to the user's OPEN case if one exists, else no-op**; the 5 admin routes (grant-access/send-password-reset/extend-subscription/refund/cancel-subscription) call it.

## 7. Emails — APPROVED, HELD
- `claudePlans/billing-fix-email-copy-2026-07-24.md`: Version A outbound (97 non-emailers, campaign `billing_fix_credit_2026-07-24`) + Version B reply (6 who emailed). Copy approved (tech-stack framing, 3-mo credit, payment-provider swap, My-Account pointer). **Send is HELD until the dashboard deploys** (emails point users there). 3-mo credit already applied.

## Environment / gotchas
- Dev: `https://app.gymnasticbodies.dev` (systemd `--user app-gymnasticbodies-dev.service`, port 3013). Restart after `next.config`/`.env.local` edits. Do NOT `npm run build` (shares `.next`).
- No `dig` → use `drill`. `.env.local` now has live Stripe + GMAIL admin@ creds (do not wipe).
- Verified page content by stripping HTML and reading visible text (after a shallow grep-only "review" missed real bugs — lesson logged).

## DEPLOYMENT STATUS (important)
- **DB writes are LIVE in prod Neon:** 104 account fixes + credits, 221 ingested support_emails + 48 cases (28 handled-outside + 22 tied − reworked), Thomas's email sent.
- **Host canonicalization CODE is deployed** (`a7de890`,`bfb59ff`).
- **The entire My Account dashboard + admin status-wiring + action-case code is UNCOMMITTED (33 changed files) and dev-only — NOT deployed.**

## Note for Next Session
(printed to chat)
