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
- **cancel** (existing action, period-end by default) so the next cycle never bills them.
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

**Reminders (automatic, in the existing daily /api/cronPromiseCheck):**
- open chargeback case, no member reply after **7 days** → Slack alert "no response: ban? / file evidence"
  (Q2);
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
2. No reply after 7 days: Slack nudge, or automatic ban? Recommend **nudge**.
3. Access: keep until the paid period ends (cancel at period end)? Or end now? Recommend **period end**.
