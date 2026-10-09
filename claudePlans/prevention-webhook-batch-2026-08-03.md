# Chargeback-Prevention Webhook Batch — Implementation Summary (2026-08-03)

Status: **BUILT, not deployed, not committed.** Code-only change in the working tree; owner deploys via git. No DB writes were made, no emails sent, `.env.local` untouched.

Context: July dispute rate hit 4.7% (5x Visa's threshold); 3 disputes lost by default because nothing watched them; ~22 goodwill-credit members have billing resuming Oct 28 – Dec 9 via `trial_end` pushes — surprise charges after months of silence are a dispute factory.

## Files

| File | Change | Lines |
|---|---|---|
| `app/api/stripe/webhook/route.js` | Extended — 3 new event handlers + 2 extensions to existing handlers + shared helpers | 83 → 596 |
| `lib/preventionEmails.js` | **New** — member email templates + internal alert sender | 130 |
| `claudePlans/prevention-webhook-batch-2026-08-03.md` | This summary | — |

`lib/sendgrid.js` was deliberately NOT touched (carries another session's uncommitted edits) — all new email functions live in `lib/preventionEmails.js`.

## Handlers (trigger → actions)

### 1. `charge.dispute.created` (new)
- **Never-rebill policy:** resolves the disputed charge → customer, detaches ALL card payment methods (`paymentMethods.list` + `detach`), clears `invoice_settings.default_payment_method` (empty-string unset). A detach failure is captured into the case notes + alert ("DETACH FAILED — detach manually in Stripe") instead of aborting the handler.
- **Support case:** standalone, `priority: 'high'`, title `CHARGEBACK — <reason> — $<amount>`, `from_email` = customer email, `admin_notes` with dispute id / charge / amount / reason / evidence due date / cards-detached policy note / "respond before the deadline" instruction. (Standalone case is correct here — the 2026-07-24 no-standalone-case rule applies to *admin actions*; this is a customer-originated risk event.)
- **Internal alert** to `support@gymnasticbodies.com`, subject `Chargeback filed: $X <reason> <email>`, body includes case link.
- **Telemetry:** `app_logs` event `dispute.created` (durable awaited insert).

### 2. `invoice.payment_failed` (extended)
Existing status writes (`inactive` + reclassify `noncurrent/lapsed`) unchanged. Added, isolated in its own try/catch:
- Member email — subject `Your Gymnastic Bodies payment didn't go through`: charge failed, **no access change**, update card at My Account → Manage Subscription (https://my.gymnasticbodies.com), reply if anything looks wrong.
- **Once per invoice**: guarded via `app_logs` `payment_failed.member_notified` matched on `data.invoiceId` — candidate rows fetched by event+email (both indexed) and filtered in JS (json column — no `->>`). Stripe retries the same invoice for days; only the first attempt notifies.
- Guard row is only written after a successful send (a failed send leaves no guard, so a later Stripe retry can notify).

### 3. `invoice.upcoming` (new) — **requires a dashboard step, see below**
- Fires only when the upcoming invoice is worth warning about: subscription coming off trial (`sub.trial_end` still in the future at event time — covers the Oct 28 – Dec 9 goodwill cohort) **or** amount ≥ $100 (annual-sized). `amount_due <= 0` skipped.
- Member email — `Your Gymnastic Bodies membership renews on <date>` for `$<amount>`, plus how to update/remove payment method or cancel, same footer/reply-to.
- Dedup **per invoice period** via `app_logs` `renewal_reminder.sent` keyed on `subscriptionId + periodKey` (upcoming invoices have no invoice id yet; periodKey = `period_end ?? next_payment_attempt`).
- Renewal date shown = `next_payment_attempt ?? trial_end ?? period_end`, formatted long-form (e.g. "October 28, 2026").

### 4. `radar.early_fraud_warning.created` (new) — **requires a dashboard step**
- Internal alert to support@ (`Early fraud warning: $X <fraud_type> <email>`), high-priority case (`EARLY FRAUD WARNING — <fraud_type> — $<amount>`), `app_logs` `efw.created`.
- **No auto-refund** — owner decides; case + alert both carry: "refund fast to prevent the chargeback from counting" (a refund issued before the dispute lands keeps it off the network dispute count). Notes also show whether the charge is already refunded.
- No card detach here (spec: alert + case + log only).

### 5. `trial.converted` telemetry (in existing `invoice.payment_succeeded`)
- Condition kept simple per spec: invoice `amount_paid > 0`, subscription has `trial_end`, `invoice.period_start >= sub.trial_end`, and no prior `trial.converted` logged for this subscription.
- Logs `app_logs` `trial.converted` `{ email, userId, subscriptionId, amount }` (amount in dollars). Queryable locally for /admin analytics later.
- Isolated try/catch — cannot affect the existing renewal-date write.

## `lib/preventionEmails.js`
- Exports `sendPaymentFailedEmail`, `sendRenewalReminderEmail`, `sendInternalAlertEmail`.
- Member emails: plain text, from/reply-to `support@gymnasticbodies.com`, organizational voice (modeled on `claudePlans/billing-fix-email-copy-2026-07-24.md`), "Warm regards, The Gymnastic Bodies Team" footer.
- **Every member email is recorded in `outbound_emails`** (`type: 'support'`, `campaign: 'system_billing_notice'`) via the same drizzle insert shape as `POST /api/admin/outbound/send` — so member replies auto-case through Gmail sync. Internal alerts to support@ are deliberately NOT recorded (outbound_emails is the member-outreach ledger; Gmail sync skips internal senders).
- Send failure → logged + `false` returned; record-failure after a successful send → `outbound.record_failed` error log (email already went out).

## Safety / idempotency
- Webhook **signature verification untouched**.
- The 3 new event types are dispatched BEFORE the subscription-keyed `user_setting` lookup (their payloads are charge-keyed or id-less and would mismatch), each inside try/catch; Stripe always gets a 200.
- Both extensions inside existing handlers have their own try/catch so a prevention failure never breaks the existing status/classification writes.
- Dedup guard rows (`payment_failed.member_notified`, `renewal_reminder.sent`, `trial.converted`, plus `dispute.created`/`efw.created`) are written with an **awaited direct `app_logs` insert** (`logDurable`) — `logger.info`'s fire-and-forget insert isn't reliable enough for a dedup key.
- All `app_logs` reads fetch candidate rows via drizzle (event/email indexes) and filter the json `data` in JS — no `->>` in neon queries, per project rule.

## Stripe dashboard steps for the owner (required before this fully works)
Endpoint: Developers → Webhooks → `https://app.gymnasticbodies.com/api/stripe/webhook`

1. **Add enabled events** to the endpoint: `charge.dispute.created`, `radar.early_fraud_warning.created`, `invoice.upcoming` (the code ships dark until these are subscribed; existing events keep working regardless).
2. **Set the upcoming-renewal lookahead:** Settings → Billing → Subscriptions and emails → "Upcoming renewal events" — default is 3 days; **30 days recommended** so the Oct 28 – Dec 9 trial-end cohort gets real notice before billing resumes.
3. **Turn on Stripe's own trial-ending emails** (Settings → Billing → Subscriptions and emails → "Send a reminder email before a trial ends") as a belt-and-suspenders layer on top of our reminder.
4. **Statement descriptor:** verify it clearly reads as GYMNASTICBODIES (Settings → Business → Public details) — "don't recognize the charge" was a dispute driver; an ambiguous descriptor feeds it.

## Verification
- `node --input-type=module --check` — both files pass.
- `npx eslint app/api/stripe/webhook/route.js lib/preventionEmails.js` — clean (exit 0, no findings).
- Full `npm run lint` — 20 pre-existing errors / 8 warnings in files NOT touched by this batch (TextBlock, FitnessQuiz, TestimonialsCarousel, MediaQueries, etc.) — left alone per "fix only what you introduced".

## Deliberately skipped / notes
- No live test fire (no deploys, no DB writes, no emails per task rules). Suggest post-deploy: `stripe trigger charge.dispute.created` against a test-mode endpoint, or Stripe dashboard "Send test webhook".
- EFW handler does not detach cards (spec said alert/case/log only; disputes do detach).
- `customer.subscription.deleted` cancellation email still goes through legacy `sendSubsCancelledEmailSG` (unrecorded, from lib/sendgrid.js) — pre-existing behavior, out of scope here, but worth migrating to the recorded pattern later.
- Case statuses used: `open`/`high` on creation only — no auto-resolution; disputes stay open until a human works them.
