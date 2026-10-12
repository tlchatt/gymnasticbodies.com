# Dispute — consolie7@gmail.com (Kyle Consolie), Oct 2026

- **Session:** worker `5d20c098-5b0c-44e8-869d-ec048f0ba34a`, dispatched by manager `987aa382`
- **Date:** 2026-10-12 (snapshot as of this date — facts below were read live from Stripe + Neon that day)
- **Trigger:** promise-check alert in GB support Slack (`C0B745W8BHN`, ts `1791646240.731009`), posted
  **Sat 2026-10-10 15:30 UTC** (11:30 ET): "Promise not kept — refund: Refund failed
  (charge_for_pending_refund_disputed) — member was told they were refunded". One reply, from Luke
  (2026-10-11 04:52 UTC): "does this mean a refund was actually issued?"

## Facts (read-only, 2026-10-12)

| What | Live state |
|---|---|
| Charge `ch_3UNa9oAhvJ5jyCLH0P6EPMop` | $50, 2026-10-06 15:19 UTC (trial converted after a cancel request we never processed), Visa ·0526, refunded $0, disputed |
| Refund `re_3UNa9oAhvJ5jyCLH0NJ8pRXW` | created 2026-10-09 00:56 UTC by `support-rerun`, **status `failed`, reason `charge_for_pending_refund_disputed`** — never reached him |
| Dispute `du_1UOfYPAhvJ5jyCLHX5pDL8NP` | opened 2026-10-09 15:17 UTC, reason `subscription_canceled`, **status `lost`** (accepted by hand in the dashboard 17:47 UTC — see case #830 note). Balance txn: −$50 + $15 fee ("Chargeback withdrawal"). **His $50 went back to him through the dispute.** |
| Subscription `sub_1UL1sdAhvJ5jyCLHrnUV9kAZ` | canceled 2026-10-09 15:18 UTC (ban); was set to end Nov 6 |
| Neon user | `banned = true` ("Chargeback du_1UOf…"), still `current/stripe` in the classifier columns (ban blocks sign-in regardless) |
| Case #754 "Cancel membership" | closed 10-09 |
| Case #830 "CHARGEBACK" | closed 10-09 22:52 UTC; admin note already records the failed refund + lost dispute + "Owner: accept" |

Stripe docs (docs.stripe.com/refunds, checked 2026-10-12): `charge_for_pending_refund_disputed` = "A
customer disputed the charge while the refund is pending … Stripe recommends accepting or challenging the
dispute instead of refunding to avoid duplicate reimbursements."

**Net:** Kyle is whole ($50 back via his bank). GB is out $50 + $15 dispute fee. No refund is owed — a
refund now would pay him twice.

## What we told him (every email)

- 2026-10-02 reply (case 754): "set to cancel at the end of your trial … You will not be charged" — wrong, the cancel never ran.
- **2026-10-09 04:57 UTC reply (case 754):** "We've refunded the full $50 today … Your membership is now
  properly cancelled … you're welcome to keep using the app through November 6 at no cost."
  - "refunded $50" — **not true**: the refund failed ~10h later; the money came back via the dispute instead.
  - "use the app through November 6" — **no longer true**: the chargeback ban closed his account 10-09 15:18.
  - "properly cancelled / won't be charged again" — true.
- Nothing sent since. (Two marketing drips in Sept are unrelated.)

## Proposal (awaiting Greggory)

The new chargeback process (reach out, ask the member to withdraw, then refund) **doesn't apply here**: the
dispute is already closed as lost and he already has the money. So: a correction email only, no refund offer.

Draft email (on case #830; send only on Greggory's approval):

> Subject: A correction to our October 9 email
>
> Hi Kyle,
>
> A quick correction to our email of October 9. We said we had refunded your $50. That refund didn't go
> through: later that day your bank opened a dispute on the same charge, and our payment processor
> cancels a pending refund when that happens so you aren't paid back twice. The dispute was closed in
> your favor, so the $50 came back to you through your bank instead. You don't need to do anything, and
> you won't be charged again.
>
> One other change: because of the dispute, your account has been closed, so the offer to keep using the
> app through November 6 no longer applies.
>
> Sorry again for the trouble with your cancellation.
>
> Greggory Wiley
> GymnasticBodies

Draft Slack thread reply (answers Luke):

> No — the refund never reached him. It failed because Kyle's chargeback landed the same day, and Stripe
> cancels a pending refund when the charge is disputed. The dispute was accepted (lost), so he got his $50
> back through his bank; GB is out the $50 plus the $15 dispute fee. Nothing more is owed and we're not
> refunding again (that would pay him twice). Plan, Greggory's call: a short correction email to Kyle saying
> the money came via the dispute, not our refund, and that the "use the app through Nov 6" offer ended when
> the account was closed. The alert won't repeat.

## Promise-check status

`lib/promiseCheck.js` only knows one "handled" marker: the `promise_check.flagged` claim row for the
source key. Row **538996** (`key: app_logs:523000`) was written with the 10-10 alert, so the 10-11 and 10-12
runs counted it (`mismatches: 1, alerted: 0`) and did not re-post. It drops out of the 14-day window
~2026-10-23. No write needed.

## Out of scope (noted, not acted on)

- `promiseCheck` treats a refund that failed because a dispute was lost as a broken promise forever (within
  the window). It could count `charge_for_pending_refund_disputed` + dispute `lost` as "money returned".
  Ask Greggory whether to send to the manager.

## 2026-10-12 — ban/block verified, cases closed (manager order, task 586270ef)

Order relayed by manager `97dab3f3` (Greggory, 17:37 UTC, confirmed with owner-said.js: "On Kyles case we need to close his case, he has all the propper ban / block proceedure etc right?").

Ban/block check (read-only), all in place:
- Neon: one account only (no other "consolie" user), `banned = true`, no expiry, 0 live sessions.
- `blocked_payment_identities`: card fingerprint `bfG7yME0jJChktnR`, email, `cus_VLjINrLPu3AEGG` (all 2026-10-09).
- Stripe Radar: each value present in `card_fingerprint_blocklist`, `email_blocklist`, `customer_id_blocklist`.
- Stripe: one customer only (search on email/name), sub canceled, no cards attached. Full scan of all 1,769
  charges: that card fingerprint appears on no other customer.

Cases: #754 and #830 were already `closed` (10-09); appended the dated note to both
(refund failed → dispute lost → $50 returned via dispute; ban/block verified; closed per Greggory). No email sent.
The promise check is unaffected by case status (still claimed, row 538996).

- 2026-10-12: Slack thread reply DROPPED (manager: Greggory answered Luke himself). Correction email still held for his ruling.
- 2026-10-12: Correction email SENT as drafted (Greggory approved via manager 97dab3f3, "Correciton eamil is fine", verified with owner-said.js) — outbound_emails #68516 on case #830, Message-ID <case-830.03bfdc399a26e03b@gymnasticbodies.com>. Case #830 re-closed with a dated note.

## 2026-10-12 — Phone as a ban identity (exploratory, read-only; manager request)

Greggory: "Adding a number if we have on might be a good idea." Nothing changed.

1. **Kyle:** phone `3155755638`. It's in Neon `user_setting` (subscription).data.phone and on his Oct 6 charge's
   `billing_details.phone`. Stripe `customer.phone` is null. There's no phone in his support emails, and Neon has no
   column named *phone* anywhere: it lives only in `user_setting.data`.
2. **Collection:** only new signups collect one. `/subscribe` uses `components/PaymentPortal.js`, where phone is a
   required free-text field. It goes to `create-subscription`, then onto the Stripe customer and the card's billing details.
   Renew (`RenewalPortal.js` sends `'N/A'`) and offer reuse whatever `user_setting.data.phone` already holds.
   It's never validated or normalized.
   **Banned accounts (10):** 5 have a real number: consolie7, fomanyif, thedean777777 (Neon only; Stripe says N/A),
   steven.r.michael.jr, bettspr (+44…). The other 5 have `N/A`.
3. **Radar:** there's no default phone list. Defaults are card BIN/country/fingerprint, charge description,
   client IP country/address, customer ID, email, email domain (docs.stripe.com/radar/lists). There's also no
   built-in phone rule attribute (docs.stripe.com/radar/rules/supported-attributes). A phone block in Stripe would
   need a custom *string* list plus a custom rule on metadata (`::customer:phone::`,
   docs.stripe.com/radar/rules/reference#metadata-attributes). Custom lists and rules need **Radar Plus or Pro**
   (docs.stripe.com/radar/how-radar-works). The account has only the 9 default lists today.

Sketch: add `'phone'` to the `blocked_payment_identities.type` CHECK (raw SQL), stored digits-only.
`banMember` collects phones from `user_setting.data.phone`, Stripe `customer.phone` and charge
`billing_details.phone`, skipping N/A. `blockedPaymentReason` gains `phone`: the form value in create-subscription,
the stored phone in renew/offer, plus `pm.billing_details.phone`. Our table is enough because every checkout goes
through our routes, so the Radar mirror is optional and needs Radar Plus. Caveat: phone is unverified free text,
so it's a weak signal (like email). The card fingerprint stays the block that matters.
