# Session: PromotionalAndSignupIssues

- **Session name:** PromotionalAndSingnUpIssues (renamed mid-session)
- **Session ID:** `0d24e01b-ee66-4af3-a3e8-a286596c7659`
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Session dir:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/`
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/0d24e01b-ee66-4af3-a3e8-a286596c7659.jsonl`
- **Dates:** 2026-09-18 → 2026-09-30 (spanned several days)
- **Other dirs used:** `claudePlans/` (roadmap draft + reconcile/forensic JSONs), Technologic tasks board

## What this session was
Started as a health check on the two automated email streams (the promotional "$15 legacy"
offer drip and the "failed to renew" auto-drip), grew into: (1) a full rebuild of the
promotional drip into two group-targeted crons with new lock-in copy, (2) an email-deliverability
bounce-suppression system, and (3) a Stripe↔Neon "paying but noncurrent" reconcile that turned
out to be a non-issue. All promo + deliverability work is deployed and verified live.

## First user inputs
1. "Lets check up on the 'promotioanl offer emails rate' and the 'failed to renew emailis'"
2. "So 613 errors or 22 errors?"
3. "Okay and hwo are the rules for sending on renewal failure working?"
4. "Is that all time 'renewed' thats very low 3.7 percent."
5. "They were subscribed elsewhre and we just needed to re-capture updated payment."

## Accomplishments (all COMPLETE + deployed unless noted)

### 1. Promotional offer drip — split into two group crons (COMPLETE, live)
- **Was:** single `cronMarketingDrip` hourly (later ramped to ~1,000/day, then split).
- **Now:** two crons hitting `/api/cronMarketingDrip?group=engaged|cold`, every 2 min,
  **offset** — engaged `*/2 * * * *` (even min), cold `1-59/2 * * * *` (odd min) — 2/run each,
  ~1,440/day per group, ~2 emails/min combined.
- **Group split by `customer_segment`:** engaged = `lapsed`+`purchased` (has history, ~1.5% conv),
  cold = `inactive` (~0.3% conv). Separate campaign tags: `legacy_lockin_20260522_engaged` /
  `_cold`.
- **Fixed "lapse cutoff" (line in the sand):** eligible if `renewaldate <= '2026-05-22'` OR
  renewaldate blank (never active). No account-age condition. 2026-05-22 = paywall-launch date.
- **Send rules:** max **3 sends/person** (first-touchers before repeats, `ORDER BY sent_count`);
  DB-only exclusions — `email_status IS NULL`, not converted (`offer.success`/`renewal.success`),
  no linked `stripe_subscription_id`. NO live-Stripe check, NO spacing gate (owner: keep simple).
- **New copy:** roadmap-driven "Lock in your $15 legacy rate before it's gone" (subject +
  body render `{{offerPrice}}`/`{{offerRegularRate}}`/`{{offerLink}}`). Same email to both groups.
- **Offer endDate bumped 2026-09-30 → 2026-11-30** in the pricing config (`site_settings` key
  `pricing`, `offers.legacy15.endDate`) so the crons keep sending; redemption is gated by
  `active` not endDate, so it never actually cut off.
- Commits: `6ddc6d6` (ramp), `44a3e45` (split), `faa31c8` (eligibility fix — below).

### 2. Offer eligibility bug (CRITICAL, found + fixed same day)
- The split renamed campaign tags, but `/api/offer/[slug]/eligibility` still matched only the
  old `offer.campaign` (`marketing_drip_legacy15`) → every new recipient got `not_found` and
  **could not redeem**. Fixed: for `legacy15`, match the whole family
  (`marketing_drip_legacy15%` OR `legacy_lockin_%`). Eligibility is checked live per visit, so
  the fix was **retroactive** — all already-sent links work. Commit `faa31c8`. Verified live.

### 3. Cold under-filling fix (found via "why is cold only ~720/day?")
- Cold = old inactive list with a small number of **invalid/malformed emails** that SendGrid
  400s; before the fix, failed sends recorded nothing and stayed at the top of the oldest-first
  queue → retried every run, halving throughput (~3,445 `marketing_drip.error` "Bad Request",
  all cold). Fix: on a 400/Bad Request, flag `email_status='invalid'` so it drops out forever.
  Commit `d2cc9f8`. Verified flagging live. Format scan showed the *list itself* is clean
  (0 spaces/commas, ~44 typos in 41k) — it was retry-churn on a few bad addresses, not a dirty list.

### 4. Email deliverability / bounce-suppression system (COMPLETE, live)
- **Migration 0010** (`0010_acoustic_enchantress.sql`): added `user.email_status` +
  `email_status_at` (null=OK; `bounced`/`invalid`/`spam_report` suppress; blocks NOT flagged).
- **Real-time SendGrid Event Webhook** `/api/sendgrid/events` (signature-verified, ECDSA P-256;
  public key `SENDGRID_WEBHOOK_PUBLIC_KEY` in Vercel non-sensitive + .env.local) flags accounts on
  bounce/drop/spam and writes an `email.bounced` note to `app_logs`.
- **Guards** added to `cronMarketingDrip`, `cronRenewalOutreach`, and the admin outbound route.
- **Backfill** + reconcile against SendGrid suppression lists: **fully in sync, 0 gaps**
  (1,829 flagged in Neon as of 2026-09-30; grew from ~343 as cold burned through). Commit `04c866d`.

### 5. Renewal ("failed to renew") drip — reviewed, healthy, unchanged
- `/api/cronRenewalOutreach`, daily 14:00 UTC. Fires on **abandoned renew-page views**
  (`renew.page_view` 24–96h ago, never `renewal.success`, no recent support/outbound). NOT a
  payment-failure trigger. Converting ~3.7% (fine for a re-capture audience). The real leak is the
  `/renew` funnel: ~85% land and never start the form; card errors are ~95% "incomplete field"
  (form UX), not declines. → left as Technologic tasks (see below).

### 6. Stripe↔Neon "paying but noncurrent" reconcile — investigated, NON-ISSUE (closed)
- Full read-only reconcile of **all 554 live Stripe subs** → 9 "victims". Forensics
  (`claudePlans/payer-forensics-2026-09-30.json`) proved **nothing is broken**: every payer is on
  a healthy `current`/`stripe` account with the sub linked. The 9 = 3 correct `past_due` +
  4 email-drift-from-merges/renames + 2 old duplicate signups. The "mismatch/no-account" was an
  artifact of matching by the (now-stale) Stripe *billing* email. **No AWS login-sync rewrites
  email** — the only things that change `user.email` are self-serve change-email (`verify-email`
  route) and the dedup merge scripts (tombstone the husk). Owner's call: only act if a duplicate
  customer has an OPEN support case — none do (Dean's #474 is closed). **No action taken.**
- Two live relinks WERE done earlier in the session (`mark@neptunepg.com`, `ggysber2@gmail.com`)
  when they showed noncurrent with an unlinked active sub — flipped to `current`/`stripe`,
  logged `admin.relink_stripe_sub`.

## Git / deploys
All pushed to `main` → Vercel auto-deploy (app. is git-linked). Commits: `6ddc6d6`, `04c866d`,
`44a3e45`, `faa31c8`, `d2cc9f8`. Migration 0010 applied to prod Neon. Vercel env
`SENDGRID_WEBHOOK_PUBLIC_KEY` added (non-sensitive, all 3 envs). Each staged by explicit path
(other sessions had in-flight work — never `git add -A`).

## DB writes to prod Neon
- Migration 0010 (email_status columns).
- email_status backfill + ongoing webhook/invalid-on-send flags (1,829 total).
- `site_settings` pricing `legacy15.endDate` → 2026-11-30.
- 2 Stripe relinks (mark, ggysber2).

## Files created / modified (mine)
- `app/api/cronMarketingDrip/route.js` (rewritten — group split, cutoff, copy, invalid-flag)
- `app/api/sendgrid/events/route.js` (new — webhook receiver)
- `app/api/offer/[slug]/eligibility/route.js` (campaign-family match)
- `app/api/cronRenewalOutreach/route.js`, `app/api/admin/outbound/send/route.js` (email_status guards)
- `Drizzle/db/schema.ts` + `drizzle/0010_acoustic_enchantress.sql`
- `vercel.json` (two offset drip crons)
- `claudePlans/user-facing-roadmap.md` (member roadmap draft — iterating; NOT committed)
- `claudePlans/stripe-neon-reconciliation-2026-09-30.json`, `claudePlans/payer-forensics-2026-09-30.json`

## Tools / subagents used
- Subagents: promo status/projections (fork), full Stripe reconcile, payer forensics (general-purpose).
- Skills: `technologic-tasks`, `vercel-secrets`.
- SendGrid API (suppressions + Event Webhook config), live Stripe (sk_live), Neon.

## Technologic tasks touched
- Closed `28474204` (pr.mecheng provision) — RESOLVED, forensics showed no issue.
- Still open (future work, NOT this session's): `02d9f813` /renew card-form friction,
  `7f159301` /renew form-abandon leak.

## Note for Next Session
_Snapshot as of 2026-09-30. Everything below was true at that moment; dates/numbers go stale._

**State as of 2026-09-30:** The promotional `$15 legacy` offer campaign is fully rebuilt, deployed,
and running; email-deliverability suppression is live and self-maintaining; the Stripe "paying but
noncurrent" scare was investigated end-to-end and is a **NON-ISSUE** (do not re-open it).

**Running in production right now:**
- Two offset drip crons (`/api/cronMarketingDrip?group=engaged|cold`, `*/2` and `1-59/2`, 2/run).
  Engaged (~10.5k universe) fully sent, now on 2nd/3rd touches; cold (~40k) trickling.
  Offer runs to **2026-11-30**. Campaign tags `legacy_lockin_20260522_{engaged,cold}`.
- Real-time SendGrid bounce/spam flagging via `/api/sendgrid/events` → `user.email_status`.

**To check when you pick up (as of 2026-09-30):**
1. **Cold throughput recovery** — was ~720/day (invalid-email retry-churn), the `d2cc9f8` fix should
   have brought it back toward ~1,440/day as junk gets flagged out. Confirm.
2. **Conversion by group** — engaged ~1.5%, cold ~0.3% at last read; watch the tags.
3. Bounce rate on cold (dirty list) — flagging contains it, but watch sender reputation.

**Durable facts that SHOULD be promoted to app. CLAUDE.md (currently UNDOCUMENTED there;**
**I did not edit it because another session had it mid-edit):**
- **Every sender is guarded by `user.email_status`** (bounced/invalid/spam are skipped). Any NEW
  email sender must add `AND email_status IS NULL`.
- **SendGrid Event Webhook** `/api/sendgrid/events` (signature-verified) flags bounces/spam live;
  `SENDGRID_WEBHOOK_PUBLIC_KEY` is in Vercel (non-sensitive).
- **The offer drip is two group crons** (engaged/cold) with a **fixed lapse cutoff 2026-05-22**.
- **Offer redemption is gated by `active`, NOT `endDate`** — endDate only stops the *email cron*.

**Do NOT re-investigate** the "9 paying-but-noncurrent" list — resolved 2026-09-30, all healthy,
artifact of stale Stripe billing emails after merges/renames. Only act on Dean Torcasio's double-bill
if he opens a support case (currently none).

**Open future work (Technologic board, NOT started here):** `/renew` card-form friction
(`02d9f813`) and `/renew` form-abandon leak (`7f159301`) — the real renewal leaks.

**Uncommitted in working tree:** `claudePlans/user-facing-roadmap.md` (member roadmap draft, still
iterating on Gregg's voice notes), plus reconcile/forensic JSONs in `claudePlans/`.

Session file: `app.gymnasticbodies.com/sessions/PromotionalAndSignupIssues.md`
