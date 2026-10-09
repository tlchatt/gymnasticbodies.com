# Communication Flows — DRAFT spec (for owner review)

**Status:** DRAFT 2026-10-09. Nothing here is built yet. Items marked **⚑** are open owner decisions;
items marked **✅ decided** were ruled by the owner in the 2026-10-08/09 support-agent session
(`96d475f4`). Code changes follow from this spec once it is agreed.

**Source:** read-only audit of the code + live data on 2026-10-09 (every place that records an
inbound message or sends mail to a member). File references are where each flow lives today.

---

## The model

Every message between GymnasticBodies and a member belongs to one **flow**. Flows are grouped into
three **categories**, and each flow has its own rules.

| Category | Direction | What it is |
|---|---|---|
| **Support** | member ⇄ us | A member asks for help; we answer. A conversation. |
| **Marketing** | us → member | Campaigns and drips that sell or win back. |
| **Administrative** | us → member (automated) | Messages about the member's account, billing or membership. |

**Terms (✅ decided):**
- A **case** is the official log of our communication with a customer **outside of automated
  communication** (✅ owner 2026-10-09). Automated sends (marketing, administrative) are recorded but are
  not cases; the moment a customer writes to us, or replies to anything, it is a conversation and lives in a case.
- AI-assisted support (the support agent's replies, escalation notices) is **human-handled with AI
  assistance** — a person approves it — so it is support communication and is logged in the case (✅ owner 2026-10-09).
  Even if AI is later allowed to auto-reply on some topics with no human approval, those replies are still
  part of a customer conversation, so **still a case**. "Automated" in the case definition means automated
  marketing/administrative sends — not replies to a customer who wrote to us (✅ owner 2026-10-09).
- A **communication** is a thread of messages back and forth. ("Ticket" today = one message; the
  word goes away — see Admin wording below.)
- **Every Support communication is always tied to a case.** Marketing and Administrative messages
  are not cases.
- A member **reply** to *any* Marketing or Administrative message is inbound Support — it enters the
  Support category and gets a case under the Support rules.

**The questions every flow answers:**
1. Recorded? Where (`support_emails` / `support_replies` / `outbound_emails`)?
2. Tied to a case?
3. What happens when the member replies?
4. Sender + reply-to address.
5. Who can trigger it — a person, the AI agent, a cron, a webhook?
6. Owner approval needed before sending?
7. Suppression — who must never receive it (banned, opted out, already paying, …)?

**Proposed:** label every recorded send with its category in `outbound_emails.type`
(`support` / `marketing` / `administrative`) and its flow in `campaign`. No schema change needed —
`type` is free text today. ⚑ confirm.

---

## 1. SUPPORT

### Case rules (apply to every Support flow)

| Member sends… | Earlier case closed < 60 days ago | Earlier case closed ≥ 60 days ago |
|---|---|---|
| **A reply** to one of our Support emails | ✅ **Reopen that case** | ✅ **New case**, linked back to the old one |
| **A fresh message** (not a reply) | ✅ **New case**, linked back to their last case | ✅ **New case**, linked back |

- ✅ **Fresh message while the member's previous case is still OPEN:** add it to the open case
  (today's behaviour) — one open case per member.
- "Is it a reply, and to which case?" — decided from the email headers: we stamp our case id into the
  Message-ID of every Support email we send, and read it back from the member's In-Reply-To /
  References. Fallback: the case of an earlier message in the same Gmail thread.
- Email matching ignores capitals everywhere (today the sync's sender match is case-sensitive).
- "Linked back" = the new case's notes name the old case id (no schema change).

### Support flows

| Flow | Today | Rules (proposed / decided) |
|---|---|---|
| **S1 Member writes in — email** (to support@, via Gmail sync + instant push) — `app/api/admin/gmail/sync/route.js`, `app/api/gmail/push/route.js` | Always cased since 2026-08-26. Picks case by sender email (case-sensitive); never uses the Gmail thread. | Case rules above. Records in `support_emails`. |
| **S2 Member writes in — contact form** — `app/api/user/contactUs/route.js` | Emails support@, then S1 picks it up. | Same as S1. |
| **S3 Member writes in — in-app message** — `app/api/user/support-message/route.js` | Always cased. ⚠ Route has **no login check** — trusts the userId in the request (security gap, handed to manager). | Case rules above. Fix the login check (separate task). |
| **S4 We reply — admin / support staff** — `/api/admin/tickets/[id]/reply`, `claudeTools/support.js reply` | Recorded in `support_replies`, on the message's case. Only possible from the message ("ticket") page. | Reply lives on the **case**. Stamp case id in Message-ID. ✅ Owner approves every draft before send (project Support Email Rule). |
| **S5 We reply — AI support agent** (Slack Accept → fire) — `lib/support/execute.js` | Replies on the member's *latest message by email*, not the play's case; if the member never wrote in, the email is sent and **recorded nowhere**. | Reply on the **play's case**; always recorded. ✅ Slack Accept = approval. ✅ A failed action holds the reply. ✅ When Neon and Stripe disagree → escalate, never deny. |
| **S6 Escalation notice** — `execute.js` | ✅ Built 2026-10-08: every escalation emails the member ("escalated to engineering, we'll email when fixed"). | On the case; never claims "fixed". |
| **S7 Proactive support email** (we start a support conversation: corrections, apologies, "it's live" follow-ups) — `support.js send-email` / `sendOutboundSupportEmail`, `/api/admin/outbound/send` | Recorded in `outbound_emails`, usually **no case**. | Must attach to the member's case (existing or new). ✅ Owner approves the draft. |
| **S8 Chargeback / banned-member reply** | Agent improvised wording ("refund the charge…" — inaccurate). | ⚑ Policy + exact wording — parked with manager, waiting on GB-team ban-policy meeting (task 78840146 / b7ac6d8c). |
| **S9 Chargeback record** (webhook creates a case when a dispute arrives) — `app/api/stripe/webhook/route.js` | Creates a case with no message (internal record). | Internal case, no member email. ✅ Member is banned automatically (lib/blocklist.js). |

---

## 2. MARKETING

✅ No cases. A member reply → Support (case rules).

**Rule structure (✅ owner 2026-10-09):** every marketing campaign = a shared **baseline** + its own
**campaign rules** (audience, date ranges, exclusions, touches). Past payers are the target audience —
the baseline only excludes people who are **active right now**.

**Baseline — applies to EVERY marketing email (four rules):**
1. No banned members (banned account, or card/email on the payment block list).
2. No unsubscribed members. ✅ Use SendGrid's built-in unsubscribe (a "Marketing" unsubscribe group)
   and connect it to the app. **Not built — none exists today (no link, no record, footer off).**
   Handed to the manager as its own task 2026-10-09 (needs a DB column + a pause decision).
3. No bounced / invalid / spam-complaint addresses.
4. Sent from marketing@, reply-to support@; recorded in `outbound_emails` as type `marketing` with its
   campaign name. The send itself is not a conversation, so not a case — once the member replies we are
   talking to them, and that IS a Support case (✅ owner 2026-10-09).

Greeting "Hi {first name}," / "Hi there," is a standard for every email in every category (not a marketing rule).

**Campaign rules** (audience, date ranges, whether to skip active members or open cases, max touches, spacing, pace, end date) live with each campaign below (audience, lapse window, max touches, spacing, end date).

| Flow | Today | ⚑ Rules to set |
|---|---|---|
| **M1 Legacy $15 offer drip** (`marketing_drip_legacy15`) — `app/api/cronMarketingDrip/route.js` | Cron; recorded in `outbound_emails` type `marketing`. ~18.3k sends. | Suppress: banned members, current payers, opted out? Frequency cap? |
| **M2 Lock-in campaign — engaged** (`legacy_lockin_20260522_engaged`, segments lapsed + purchased) | Cron; ~23.2k sends. | Same questions. |
| **M3 Lock-in campaign — cold** (`legacy_lockin_20260522_cold`, segment inactive) | Cron; ~19.5k sends. | Same questions. |
| **M4 One-off campaigns** (`email-group`, compose page with type marketing) — `claudeTools/support.js email-group` | `email-group` creates a case per recipient but never links it, and sends with **no reply-to**. | ⚑ Should bulk sends ever create cases? (Per this spec: no.) Fix reply-to. Owner approves copy. |

---

## 3. ADMINISTRATIVE

✅ No cases. A member reply → Support (case rules).

| Sub-category | Flow | Today | ⚑ Rules to set |
|---|---|---|---|
| **Billing** | **A1 Payment failed** — `lib/preventionEmails.js` (webhook `invoice.payment_failed`) | Recorded as `system_billing_notice`, no case. | Recorded ✅. |
| | **A2 Renewal reminder** (`invoice.upcoming`) — `lib/preventionEmails.js` | Webhook event currently **off** (manager, 2026-10-08). | ⚑ Turn on? Which members? |
| | **A3 Refund / credit confirmations** | Sent by hand as Support (S4/S7). | ⚑ Stay Support, or become Administrative? |
| **Account** | **A4 Login details at signup** — `app/api/stripe/create-subscription/route.js`, `app/api/user/subscription/route.js` | **Not recorded.** | Record as `administrative` (proposed). |
| | **A5 Password reset link** — `/api/user/resetLink`, `/api/admin/users/[id]/send-password-reset`, `/api/admin/users/create-free` | **Not recorded.** | Record as `administrative` (proposed). ⚑ Contains a live link — store the body or only the fact it was sent? |
| | **A6 Email-change verification** — `/api/user/change-email` | **Not recorded.** | Same as A5. |
| **Membership** | **A7 Subscription cancelled** — webhook `customer.subscription.deleted`, `app/api/user/subscription/route.js` | **Not recorded**; skipped when the account is already marked cancelled (so admin cancels send nothing). | ⚑ Should every cancel (member, admin, agent) send one? Record it. |
| | **A8 Chargeback / ban notice** | None automatic (Dean + FOMANYIf were emailed by hand 2026-10-09). | ⚑ Tied to S8 decision. |
| **Membership timeline** | **A10 "Having trouble renewing?"** (`renewal_auto_drip`) — `app/api/cronRenewalOutreach/route.js`, daily 14:00 UTC | ✅ **Administrative** (owner 2026-10-09: account notices around a member's timeline are administrative). Today: recorded as type `support`, no case. Sends to anyone who viewed /renew 24–96h ago and never logged `renewal.success`, unless they wrote to support or got ANY email in the last 30 days. Gaps (audit 2026-10-09): only `renewal.success` counts as paying — **26 of 349 sends since Sep 3 went to people who had already paid via signup or the offer page**; no check of current membership/trial; a marketing email in the last 30 days silently suppresses it (cross-flow coupling); blank names render "Hi ,"; banned members not excluded. | ✅ Rules (owner 2026-10-09): never send to anyone current, trialing, or paid by ANY route (checked at send time incl. live Stripe — past_due members still get it, they are the ones who need to renew); exclude banned; skip only members with an OPEN case; repeat window = this same email in the last 30 days; greeting "Hi {name}," / "Hi there,"; record as type `administrative`. See A10 detail below. |
| **Internal** | **A9 Internal alerts** (chargeback filed, EFW, errors) — `sendInternalAlertEmail` | To staff, not members. | Out of scope for member rules; listed for completeness. |

---

### A10 detail — "Having trouble renewing?" (agreed rules)

Daily cron, 14:00 UTC:
1. **Find candidates:** viewed /renew 24–96 hours ago.
2. **Drop anyone who has since paid by any route:** `renewal.success`, `signup.success` or
   `offer.success` after the page view.
3. **Drop anyone active right now:** Neon `migration_type = current`, OR a live Stripe subscription
   that is active / trialing (case-insensitive customer lookup + Neon-stored customer id).
   **past_due is NOT dropped** — a failed renewal is exactly who this email is for.
4. **Drop banned members** (`user.banned`) and anyone on the payment block list.
5. **Drop anyone with an OPEN support case** (support is already talking to them). Closed cases and
   past messages don't block it.
6. **Don't repeat:** drop anyone sent THIS email (`renewal_auto_drip`) in the last 30 days. Other
   emails — marketing, or other administrative notices like an upcoming-renewal reminder — don't block it.
7. **Drop bounced / invalid / spam addresses** (`user.emailStatus`).
8. **Send:** "Hi {first name}," or "Hi there,"; from + reply-to support@; renewal link.
9. **Record:** `outbound_emails` type `administrative`, campaign `renewal_auto_drip`, no case.
10. **A reply** → inbound Support → case (Support case rules).

## Admin screens + wording (proposed)

- Rename **"Ticket" → "Message"**. The inbox becomes a **Communications** view grouped by case.
- **Reply from the case page** (today you can only reply from the single-message page).
- The case page shows only that case's messages (today it shows the member's whole send history).
- ⚑ confirm.

## Cleanup / backfill (Support only)

- 272 inbound messages from Jan–Aug 2026 have no case → group by Gmail thread, then sender within
  14 days; attach to an existing case in that window, else create a **closed** "[backfilled]" case
  (no Slack, no open-queue flood). Also cases the 33 replies sitting on them.
- ⚑ Delete the ~10 internal/test messages with no case, and the 28 empty cases (keep the
  chargeback-record cases)? Recommendation: yes.
- 18 AI plays created by script on 2026-10-09 (the re-run) have no case — block case-less plays going forward.
- Update the stale "Auto-case creation rules" table in `app.gymnasticbodies.com/CLAUDE.md` (it says
  marketing replies and cold messages get no case — the code now cases every inbound message).

## Out of scope here (handed elsewhere)

- In-app support-message route has no login check (S3) — security fix, separate task.
- Banned-member policy + wording (S8/A8) — manager, pending GB-team meeting.
