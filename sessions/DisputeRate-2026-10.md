# GB dispute (chargeback) rate — snapshot as of 2026-10-12

Worker session for the manager (987aa382). Read-only: live Stripe API reads + one Neon read. Nothing changed in Stripe or Neon.
Question from the owner: "What's the dispute rate for GB and how acceptable is that?"

## Short answer (as of 2026-10-12)

- **Last 90 days: 0.72%. Last 30 days: 0.55%. October so far (Oct 1–12): 0.91%.**
- **July was the bad month: 6.9%** (6 disputes on 87 charges). It has been low since: August 0%, September 0.18%.
- **Verdict: WATCH, not at risk.** GB is far too small to be fined by Visa or Mastercard (their fine programs need 1,500 / 100 disputes a *month*; GB gets 0–6). The line that matters is **Stripe's own 0.75%** "excessive" mark, which can trigger a Stripe account review. The 90-day rate is just under it and October is currently just over it.
- At GB's volume **every single dispute moves the monthly rate ~0.1–0.2%**, so the rate swings hard. The real lever is preventing the next few.

## 1. The numbers (live Stripe, pulled 2026-10-12)

Method = how the card networks count: disputes by the date the dispute was opened ÷ successful card charges in the same calendar month. (Stripe only started charging GB members in May 2026, so there is no earlier history.)

| Month | Successful charges | Disputes | Rate | Visa | Mastercard | Early fraud warnings |
|---|---|---|---|---|---|---|
| May | 8 | 0 | 0% | 0 / 8 | 0 / 0 | 0 |
| Jun | 49 | 1 (Amex) | 2.04% | 0 / 28 | 0 / 17 | 0 |
| **Jul** | 87 | **6** | **6.90%** | 4 / 42 = 9.5% | 2 / 33 = 6.1% | 1 (Mastercard) |
| Aug | 201 | 0 | 0% | 0 / 121 | 0 / 61 | 0 |
| Sep | 565 | 1 | 0.18% | 1 / 331 = 0.30% | 0 / 175 | 0 |
| Oct 1–12 | 438 | 4 | 0.91% | 2 / 243 = 0.82% | 1 / 151 = 0.66% (0.57% on Sep sales, Mastercard's method) | 0 |
| **Trailing 30 days** | 903 | 5 | **0.55%** | 0.58% | 0.34% | 0 |
| **Trailing 90 days** | 1,250 | 9 | **0.72%** | 0.84% | 0.50% | 0 |

Since May: 12 disputes on 1,348 charges (0.89%), $831 disputed, 11 of 11 decided disputes **lost** (none were contested), plus Stripe's $15 fee each (~$180).
The 4.7% July figure in earlier notes used a different count; by the networks' method July was 6.9%.

**The disputes:**

| Opened | Member | Amount | Reason | Card | Result |
|---|---|---|---|---|---|
| Jun 26 | rhinopc60@hotmail.com (Carlos Areces) | $179.88 | product unacceptable | Amex | lost |
| Jul 4 | madfitclub@icloud.com | $50 | fraudulent | Mastercard | lost |
| Jul 9 | steven.r.michael.jr@gmail.com | $75 | product unacceptable | Visa | lost |
| Jul 17 | mwalker2k9@gmail.com (Matthew Walker) | $50 | product unacceptable | Mastercard | lost |
| Jul 23 | bettspr@yahoo.co.uk | $74.96 | subscription cancelled | Visa | lost |
| Jul 24 | bettspr@yahoo.co.uk | $76.26 | subscription cancelled | Visa | lost |
| Jul 30 | steven.r.michael.jr@gmail.com | $75 | product not received | Visa | lost |
| Sep 22 | FOMANYIf@gmail.com | $50 | product unacceptable | Visa | lost |
| Oct 3 | FOMANYIf@gmail.com | $50 | subscription cancelled | Visa | lost |
| Oct 8 | thedean777@hotmail.com (Dean Torcasio) | $50 | product unacceptable | Mastercard | lost |
| Oct 9 | consolie7@gmail.com (Kyle Consolie) | $50 | subscription cancelled | Visa | lost |
| **Oct 12 (today)** | **skipa44@icloud.com** | $50 (charge of Aug 25) | product not received | Amex | **open — response due Nov 4** |

11 of 12 are members who wanted out or were unhappy ("cancelled", "unacceptable", "not received"), not stolen cards. Only one fraud-coded dispute and one early fraud warning in six months. So the problem is billing/cancel experience, not fraud.

Today's dispute shows the automation working: at 09:06 UTC the webhook banned the account (`admin.member_banned`), fired the Slack chargeback alert (`alert.chargeback`) and logged `dispute.created`.

## 2. The thresholds (checked 2026-10-12)

| Who | Rule | GB today |
|---|---|---|
| **Visa VAMP** (replaced VDMP/VFMP June 2025) | Counts disputes + Visa fraud reports ÷ Visa charges, same month. "Excessive" merchant = **1.5% AND ≥1,500 a month** (US, since 1 Apr 2026; was 2.2%). Stripe also lists a lower "non-compliant" level, **0.5% AND ≥5 a month**, where Visa *may* charge fees. | Can never reach 1,500. The ≥5 level is the one to watch: **July had 4 Visa disputes at 9.5%** — one short. October has 2 so far at 0.82%; 3 more Visa disputes this month would cross it. |
| **Mastercard ECP** | ECM = **1.5% AND ≥100 chargebacks a month** (on prior month's sales). Fines start month 2: $1,000, then $5,000, rising to $100,000. Fraud program (EFM) needs ≥1,000 MC e-commerce sales + $50,000 fraud a month. | Can't be reached at GB's size. |
| **Stripe** | "The credit card processing industry standard recognizes dispute activity above 0.75% as excessive"; a sudden spike or steep upward trend can also prompt action. Stripe reaches out first. Each dispute costs $15. | 90-day 0.72% (just under), October so far 0.91% (just over). This is GB's real risk: a Stripe review/reserve, not network fines. |

**What happens at each level, in plain terms:**
- **Under 0.75% (fine):** nothing.
- **0.75%–1.5%, or a spike (watch):** Stripe may contact GB, ask for a plan to bring it down, and in worse cases hold back part of payouts (a "reserve") or limit the account. With Visa, a month with ≥5 Visa disputes over 0.5% can bring Visa fees passed on through Stripe.
- **Well above that and sustained (at risk):** Stripe can close the account. Card networks can block a business from taking cards with any processor (the "MATCH" list).

Sources: Stripe, [Measuring disputes](https://docs.stripe.com/disputes/measuring) (0.75%) · Stripe, [Dispute and fraud monitoring programs](https://docs.stripe.com/disputes/monitoring-programs) (VAMP table, Mastercard ECM/HECM/EFM fine tables, prevention practices) · Visa, [VAMP fact sheet 2025](https://corporate.visa.com/content/dam/VCOM/corporate/visa-perspectives/security-and-trust/documents/visa-acquirer-monitoring-program-fact-sheet-2025.pdf) (merchant Excessive ≥1,500 count; reduced to ≥150 bps in US on 1 Apr 2026; acquirer 50/70 bps) · Stripe, [Pricing](https://stripe.com/pricing) (fees below). Visa's per-dispute fee amounts are not in the fact sheet; vendor blogs say about $4–$8 per dispute (unverified).

## 3. What's already in place, and the next steps

**In place (live):** permanent ban + card/email block on any chargeback (fired correctly today); Slack alerts for chargebacks and early fraud warnings; refund watch (a refund that fails alerts and reopens the case); daily promise check; cancels now really cancel at period end; the support agent's cancel/refund now actually run; the "having trouble renewing?" email.

**Not in place:** pre-renewal reminder emails. `invoice.upcoming` was switched off on the live webhook 2026-10-08 (owner: only remind people we promised). About 22 credited members resume billing from **Oct 28** after three free months, and 33 trialing subscriptions bill before Dec 31. Surprise charges after a quiet period are the classic "I cancelled / didn't recognise it" dispute.

**Most effective next steps (owner decisions):**

1. **Send a short billing reminder before a charge** — Stripe's own guidance: "Typically 7 days before a yearly renewal and 2 to 3 days before a monthly renewal", and before a trial ends. At minimum for the Oct 28 resume group. Cost: $0 (existing email). This targets the exact reason behind most of GB's disputes.
2. **Make the bank statement say who we are.** The card statement currently reads **"GYMFIT LLC"**, while members know us as Gymnastic Bodies. Changing the descriptor (e.g. to "GYMNASTICBODIES") is free in Stripe settings. Not a big cause today (1 fraud-coded dispute), but cheap.
3. **Stripe dispute prevention, Visa only, if the rate climbs.** Visa resolution (RDR): **$15 each**, refunds automatically before the dispute is filed, and Visa does not count it towards VAMP. On a $50 charge it costs the same $15 as a dispute and the money is lost either way, but it keeps the dispute off the record. Mastercard resolution (Ethoca) is **$29 each**, more than a dispute costs, so not worth it at GB's size. "Dispute deflection lookups" are included free. Smart Disputes (Stripe contests for you) takes 30% of won disputes. GB has accepted every dispute so far, so it adds nothing yet. Stripe Radar fraud screening is already included with payments. More Radar (from $10/month or $0.05 per screen) wouldn't help, because GB's disputes aren't fraud.

Also worth a plain rule: a member who asks to cancel or for a refund within a few days of a charge gets it. A $50 refund costs less than a $50 dispute plus the $15 fee plus the record.

## Notes

- Today's open Amex dispute (skipa44@icloud.com, $50, response due 2026-11-04) is the same kind of case the "accept unless we have real evidence" question (task 8d86fe82) covers.
- Script + raw pull: session scratchpad only (not committed). The pull is read-only: charges since 2026-03-01, all disputes, all early fraud warnings.

## Close-out — 2026-10-12 (manager)
- Report shipped (ba98869). Task a3f984c2 → review for the owner's decisions (pre-charge reminder, statement descriptor, Visa RDR). Hours f0de0a4a closed; session closed by the manager.
