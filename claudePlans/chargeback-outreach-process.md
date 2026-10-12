# Chargeback process: reach out first, through the support agent (task 6be8fd18)

Status: **PLAN, awaiting Greggory's OK** (2026-10-12). Nothing built.

Greggory (2026-10-12, Slack): "Lets update the "process" to reach out and offer a refund and manaul handling
first." and "These would all be part of the suggested "actions" from the Suport case agent."

## Today
`charge.dispute.created` webhook → detach cards → **banMember (automatic)** → case → Slack alert → log.

## Proposed
**Stays automatic in the webhook:** detach cards (never re-bill a disputing card), open the high-priority
case, Slack alert, `dispute.created` log. **Removed from the webhook:** the ban, for every dispute type
including fraud (Greggory, Q1: "nothing but payment removal and case really happen automatically any more").
The Slack alert and logging stay, because they are notices, not actions (to confirm with Greggory).

**New, automatic:** the webhook hands the case to the support agent (`fireCaseToSlack`, the same path an
inbound email uses). The agent investigates it like any case and posts a play card to Slack and
/admin/support. **Nothing runs until someone presses Accept** (5-minute undo; fail-and-hold as today).

**What the agent proposes (its play):**
- **reply** = the outreach email (template Greggory approves once; based on the skipa44 email): we
  received your dispute, we'd like to make it right, withdraw it and we refund, how each refund comes
  back, Greggory's cell, plus a line on any unanswered support it finds.
- **cancel** (existing action) with `immediate: true`: subscription cancelled and access ended now
  (Greggory, Q3: "cancel the access ASAP as the suggested action"). Still behind Accept.
- **ban_member** (NEW action → `banMember()`): never automatic. Proposed when the dispute is
  fraud-coded or the member has refused/ignored outreach. The reviewer can add or remove it on the card.
- **refund** (existing; already refuses disputed charges): proposed later, when the member replies
  that they've withdrawn. Their reply re-opens the case, the agent re-runs and proposes refunds of the
  *undisputed* charges. The disputed charge is refunded after the dispute closes in our favour (a
  reminder, below).

**Agent changes:** a `dispute` tool/field (open disputes, reason, due date, charge) in memberBilling;
a CHARGEBACK section in the investigate prompt (playbook: outreach first, refund only after withdrawal,
never refund the disputed charge, ban only per rules); `ban_member` added to actions, params and
labels.

**Reminders (automatic, in the existing daily /api/cronPromiseCheck). Keep these two only if Greggory confirms:**
- ~~7-day no-reply nudge~~ dropped. A separate daily Slack digest (its own task) will group stale cases by
  type and age, chargebacks included (Greggory, Q2).
- **5 days before** the evidence due date → Slack alert with the deadline;
- dispute closed **won** → alert "refund the disputed charge now as promised"
  (needs `charge.dispute.closed` enabled on the webhook).

**Accept/contest stays a human step in the Stripe dashboard.** We don't submit evidence by code.

## Files touched (planned)
`app/api/stripe/webhook/route.js` (drop the auto-ban, fire the agent, handle dispute.closed),
`lib/support/execute.js` (+ban_member handler), `lib/support/plays.js` (label),
`lib/support/investigate.js` (playbook + params), `lib/support/tools.js` (disputes),
`lib/promiseCheck.js` (3 reminders), CLAUDE.md "Chargebacks = permanent ban" section.
No schema change.

## Open questions for Greggory
1. ~~Fraud-coded disputes: auto-ban?~~ **Answered: no.** No automatic ban for any dispute (Slack, 2026-10-12).
2. ~~No reply after 7 days?~~ **Answered: Slack nudge, built separately** as a daily stale-case digest (not in this build).
4. Keep the two dispute reminders (evidence due in 5 days; dispute won → refund it)? Recommend **yes**.
3. ~~Access?~~ **Answered: end it immediately**, as a suggested cancel action (Accept), not automatic.
5. Which charges does the refund offer cover? Proposed: the disputed charge + any other charge in the last 60 days.

## Outreach email template (for Greggory's approval)
The agent fills the {braces} from Stripe and the case. It adds the support paragraph only when it finds
unanswered member messages. Sent from support@ on the chargeback case, signed by Greggory.

Subject: Your {charge_date} charge: we'd like to make it right

> Hi {first_name},
>
> We received your {card_issuer} dispute for your {charge_date} charge of ${amount}, and we want to make it
> right. We're a small business, and disputes genuinely hurt us with our card processor, so we'd be really
> grateful if you'd work with us on this directly. If you'll withdraw the dispute with {card_issuer}, we'll
> refund {refund_scope}:
>
> - {charge_date}, ${amount}: {card_issuer} has already credited this back to you while the dispute is open.
>   When you withdraw it, {card_issuer} puts the original charge back, and once the dispute closes we refund
>   that ${amount} to you directly. That last step can take a few weeks.
> - {other_date}, ${other_amount} (one line per other charge offered): as soon as you let us know you've
>   withdrawn the dispute, we'll refund it to your card ending {last4} (usually 5-10 business days to show).
>
> Just reply to this email once you've contacted {card_issuer}. If you'd like to talk it through, you're
> welcome to call me directly on my cell: +1 (423) 377-6111.
>
> {only if unanswered support messages exist:} We're also sorry your {dates} support messages went
> unanswered. {one honest sentence about cause/fix — only what the agent can verify}
>
> Thank you,
> Greggory Wiley (App Development Lead)
>
> ---
> For reference, your account activity (Eastern time): {short factual usage summary since the charge}.

## Administrative escalation (added 2026-10-12, Greggory)
"Lets make these also become an "administartive escalation" and make a new channel for that. Suggested
action "Admintratively escalate case for focused manaul handling.""

- New action **`admin_escalate`**, labelled "Administratively escalate case for focused manual handling".
  It's separate from `escalate` (engineering). On Accept it marks the case as an administrative
  escalation (case status `escalated` + an `admin_escalation` note/flag; no schema change if a status +
  admin_notes line is enough) and posts the case to a NEW Slack channel. That channel's id goes in env
  `SLACK_ADMIN_ESCALATIONS_CHANNEL_ID` (set non-Sensitive, like SLACK_ALERTS_CHANNEL_ID). Fail-and-hold
  if the post fails.
- Every chargeback play includes it. The agent may also propose it on other cases needing focused human
  handling (billing disputes, legal or threat language).
- Channel (pending Greggory's confirmation): **#gymnasticbodies-admin-escalations**. Invite Greggory
  Wiley, Luke, Chris, and the GB Support Agent bot. Coach Sommer is not in the Technologic workspace, and
  the bot can't add new workspace members (that's a Slack admin UI step).
