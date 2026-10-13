# Session — Gymnastic Bodies · Kyle Consolie promise check

_Dated snapshot, written 2026-10-13. Everything below was true as of then and may have gone stale._

- **Session name:** Gymnastic Bodies · Kyle Consolie promise check (#4 on the manager's list; derived name `app-gymnasticbodies-com-b5`)
- **Session ID:** `5d20c098-5b0c-44e8-869d-ec048f0ba34a`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Dates:** 2026-10-12 → 2026-10-13
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/5d20c098-5b0c-44e8-869d-ec048f0ba34a.jsonl`
- **Dispatched by:** manager `987aa382`, then `97dab3f3` (took over 2026-10-12)
- **Detail write-up:** [`sessions/Dispute-consolie7-2026-10.md`](Dispute-consolie7-2026-10.md)
- **Other data dirs:** scratchpad `/tmp/claude-1000/-var-www-Work-Gymfit-app-gymnasticbodies-com/5d20c098-…/scratchpad`
  (query scripts, email body, dry-run results). A temporary git worktree for the prod build was created
  there and then removed. No plans or memory written.

## First inputs

1. Manager dispatch: the daily promise-check alert "Refund failed (charge_for_pending_refund_disputed) —
   member was told they were refunded". Covers consolie7@gmail.com, case #830, refund `re_3UNa9o…`. Confirm the facts, tell Greggory,
   propose an email + Slack reply, then mark it resolved.
2. Manager (new 97dab3f3): confirm board task ee4a6177 ("Failed Stripe refund") is the same refund.
3. Manager: Greggory, "we need to close his case". Verify the ban/block, then close his cases.
4. Manager: drop the Slack reply (Greggory answered Luke himself).
5. Manager: Greggory, "Correciton eamil is fine". Send the email.

First command: read `sessions/MANAGER.md`, `sessions/OctoberChargebacksCommsFlows.md` and `sessions/DisputeRate-2026-10.md`.

## Goals and status

| Goal | Status |
|---|---|
| Live facts (Stripe + Neon) on Kyle's failed refund | ✅ Refund failed because his chargeback landed the same day. Dispute `du_1UOfYP…` **lost**, so the $50 went back to him through the dispute. GB is out $50 + $15 fee. Nothing is owed. |
| Board task ee4a6177 identity | ✅ Same refund. It's the only non-succeeded refund since Oct 7, and `refund.failed` fired 15:17:54 UTC Oct 9. |
| Ban/block complete? | ✅ Neon banned, 0 sessions; card/email/customer in `blocked_payment_identities` + all 3 Radar lists; sub canceled; card fingerprint on no other customer (all 1,769 charges scanned). |
| Close his cases | ✅ #754 and #830 were already closed. A dated note was appended to both. |
| Slack thread reply | ⛔ Dropped (Greggory answered Luke himself). |
| Correction email | ✅ Sent 2026-10-12 ~18:44 UTC, outbound_emails #68516 on case #830, word for word as approved. #830 closed again with a note. |
| Phone as a ban identity (exploratory) | ✅ Findings only, no change. Reported to the manager for the chargeback-process plan (#41). |
| Promise-check change | ✅ `b233068`, **shipped** by the manager (push ec7948a, deploy 2obvnfq6h). Prod dry run: 0 mismatches. |

## Technical overview

- `lib/promiseCheck.js` `checkRefundId`: a failed/canceled refund with `failure_reason =
  charge_for_pending_refund_disputed` now calls `stripe.disputes.list({ charge })`.
  - Dispute `lost` → ok "money returned via lost dispute".
  - Dispute still open → skip "pending until it closes", so no alert.
  - Anything else → still a mismatch.
  - The same function serves `admin.refund` and `support_fire.refund`.
  - Why: the member was made whole by the dispute, so it isn't a broken promise. A won dispute means he got nothing, so it stays flagged.
- **Test:** temp git worktree with symlinked node_modules. `next build --webpack` was needed because Turbopack rejects an out-of-root
  node_modules symlink. Ran `next start -p 3091` and hit `/api/cronPromiseCheck?dryRun=1` with x-cron-secret.
  - Before: 59 / 53 ok / 5 skip / 1 mismatch.
  - After: 59 / 54 / 5 / 0. The skips were identical.
- "Mark resolved": the only marker promiseCheck knows is the `promise_check.flagged` claim row. Row 538996 already
  existed, so the alert never re-posted. With the code change it now counts as ok.
- Ban check: Radar `valueListItems.list({ value_list, value })` on the 3 default lists, plus a full `charges.list`
  auto-pagination scan for the card fingerprint.
- Phone findings:
  - Kyle `3155755638` (Neon `user_setting.data.phone` + charge billing).
  - Only /subscribe collects a phone (free text). Renew/offer reuse the stored one or 'N/A'.
  - 5 of 10 banned accounts have a real number.
  - Radar has no default phone list. A custom string list + rule on `::customer:phone::` needs Radar Plus/Pro.

## Git / Vercel

Commits by explicit path, no AI attribution: 33ce255, 2a8f752, c237364, 1508d06, 0b8d958 (write-up); **b233068**
(code); ec7948a (MANAGER.md Ready-to-ship line). This session pushed and deployed nothing. The manager shipped b233068.

## Data writes (production)

- `support_cases` #754, #830: appended dated admin notes; status stayed `closed`.
- `outbound_emails` #68516 (via `claudeTools/support.js send-email --case-id=830`, campaign `dispute_correction_2026-10`).
- No Stripe writes, no Slack posts.

## Tools used

Bash (node + Stripe SDK/Neon read scripts), Slack CLI (read thread only), WebFetch/curl (Stripe docs:
refunds, radar/lists, radar/rules/reference, radar/how-radar-works), SendMessage (manager),
`owner-said.js` (verified 3 owner approvals).

## Lingering

- Phone-as-ban-identity: idea only. It belongs to chargeback-process plan #41 (session 5515a2a6).

## Note for Next Session

_As of 2026-10-13._ Kyle Consolie's failed-refund alert is fully handled.
- His $50 came back through the dispute he won.
- The correction email was sent (#68516).
- The ban was verified, and cases #754/#830 are closed with notes.
- The promise check now treats "refund cancelled by a lost dispute" as kept (b233068, live; prod dry run 0 mismatches).

Nothing is open from this session. The phone-number-ban idea sits with the chargeback-process plan (#41). Detail:
[`sessions/Dispute-consolie7-2026-10.md`](Dispute-consolie7-2026-10.md); this note:
`sessions/2026-10-12-kyle-consolie-promise-check.md`.
