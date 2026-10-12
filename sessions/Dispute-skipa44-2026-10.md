# Dispute — skipa44@icloud.com (Robert Ander), Amex $50, "product not received"

Snapshot as of **2026-10-12** (worker session for manager `987aa382`). Read-only investigation: live Stripe
plus Neon. Nothing was submitted to Stripe, nothing accepted, nothing changed.

| | |
|---|---|
| Dispute | `du_1UParNAhvJ5jyCLHa6STvPZT`, status `needs_response`, **response due 2026-11-04 23:59 UTC** |
| Charge | `ch_3U8OwVAhvJ5jyCLH0uAYAwmu`: $50.00, 2026-08-25 18:19:28 UTC, "Subscription creation" (first $50/month renewal), Amex ••6905, ZIP + CVC checks **pass**, risk normal |
| Reason | Amex **C08**: "Goods/Services Not Received or Only Partially Received" (Stripe category `product_not_received`) |
| Stripe customer | `cus_V61bPbQklv8DWJ`, subscription `sub_1U8OwUAhvJ5jyCLHTj9RsdWr` (canceled by the ban 2026-10-12 05:06 UTC) |
| Neon user | `e532a633-3283-4391-b597-55d8173fdb5a`. Account since 2026-04-17 (Woo import); subscription startdate 2024-03-07 |
| Money now | $50 already pulled back by Amex (`charge.dispute.funds_withdrawn`) plus the $15 dispute fee. Contesting adds a **$15 countered fee, returned if we win** (Stripe, June 2025 pricing). |

## Recommendation: CONTEST (narrowly). This one meets the "real evidence" bar.

He says he never got the service. Our own logs show he paid, was back in the app 17 seconds later, watched
videos, logged a workout and saved a training plan the same afternoon. He then signed in on four more days
over the next four weeks and edited his weekly schedule. That evidence goes straight at a "not received"
claim, and it's the kind Stripe asks for on digital services ("focus on evidence of usage, login, or
download"; "activity logs showing proof that the customer accessed … the purchased digital product after
the payment was made").

**The weak spot, which must be disclosed:** 23 minutes after paying he wrote to support from inside the app:
*"My progressions are stuck and will not move … unable to generate workouts of choice/weekly schedule … only
daily view."* **Nobody ever replied.** No `support_replies`, no outbound email, no support-agent play.
Case #1038 shows "closed" only because the 2026-10-09 case backfill set it that way. Amex C08 also covers
"only partially received", so he could argue that a broken feature, plus our silence, means part of the
service was never delivered. Two smaller gaps: we have **no IP addresses for his logins** (the ban signs the
member out, which deleted his session rows, and app_logs don't store IPs), and the renew page shows no
terms or refund policy at checkout. The policy exists at `www.gymnasticbodies.com/terms-of-service`
("all subscription plans are nonrefundable").

**Plain odds:** better than a coin flip on "not received", hurt by the unanswered message. Win: we get $50
plus the $15 countered fee back. Lose: we're out another $15. Winning or losing, **the dispute still counts
toward the dispute rate**, because the rate counts disputes opened. Contesting is about the $50, not the rate.

If the owner would rather not argue a case where we ignored his support request: **accepting is defensible**.
That costs nothing beyond the $65 already gone.

## What he actually did (all times UTC; Neon timestamps corrected by −4h, checked against Stripe)

**Before paying: he was already using the app while paywalled.**
- Aug 15 16:42–17:16: video plays, workout logged (day Aug 13).
- Aug 18 16:06: login sent him to /renew. He tried to add a card twice (not completed), then kept using the
  app: videos at 16:10, 16:18 and 17:44, plus a workout logged.
- Aug 20 14:01: our automated "Having trouble renewing?" email. 16:30–16:55: videos and a workout logged.

**Aug 25, the disputed purchase:**
- 17:28 login, sent to /renew. 17:29 video play.
- 18:04–18:13 saved Amex ••6905 (3 setup attempts). 18:15 logged a Core workout (auto-progressed an exercise).
- **18:19:24** submitted the $50/month renewal. **18:19:28 Stripe charge.** 18:19:30 `renewal.success`.
- 18:19:47 landed back in the app (`my.renewal.landed`). 18:20:09 signed in (`my.renewal.auth_success`).
- 18:20:29 and 18:22:03 video plays.
- **18:42 and 18:44: in-app support messages** (quoted above, and a follow-up: "I have also tried switching
  from intermediate one to intermediate 2 and back …"). **No reply, ever.**
- 18:49 login success. 18:50 video play. 18:52 logged an Upper Body workout.
- ~22:11 saved a BYO training plan (`user_logs` byo row + `byo_settings`).

**After:**
- Aug 26 ~03:29: app opened (`current_location`, `workout_level` updated). Aug 27 15:10 login success.
- Sep 1 14:43: app open. **16:13: signed up a second account, `Skipa44@gmail.com`, on a 7-day free trial
  with the same Amex. He cancelled it 2 minutes later** (no charge). 16:14: **edited his weekly schedule** on
  the main account (`levels_schedule` updated). That's the "weekly schedule" feature he said he couldn't use.
- Sep 4 16:04 login success. Sep 18: Stripe's upcoming-invoice event (no reminder email went out; that
  webhook event was off). Sep 22 04:13 login success.
- **Sep 25 19:21: second $50 charge (`ch_3UJegHAhvJ5jyCLH0MfTBBGi`). It is NOT disputed.** App opened ~19:16.
- No video plays logged after Aug 25 (video logging works: 47k plays from other members since Aug 27), and
  no workouts logged after the Aug 25 session. The Oct 3 "history" rows are our own backfill script, not him.
- Oct 12 04:29 dispute opened. 05:06 the webhook banned him.

He never asked to cancel or for a refund. The two Aug 25 messages are his only contact with support.
We sent him one email: the Aug 20 renewal nudge. No receipt went out (`receipt_email` null).

## Draft evidence package (NOT submitted; owner decides)

Stripe fields (`du_1UParNAhvJ5jyCLHa6STvPZT`). Pre-filled already: customer name/email, billing ZIP 95966,
purchase IP 98.97.61.133, product description.

- **product_description:** GymnasticBodies online training membership: video workout courses and a workout
  logging app at my.gymnasticbodies.com, $50/month, renewed by the customer himself on 2026-08-25. A
  long-standing member (training history in his account goes back to March 2024).
- **access_activity_log** (text; times UTC). Paste the "Aug 25" and "After" timeline above, trimmed to:
  payment 18:19:28 → returned to the app 18:19:47 → signed in 18:20:09 → video plays 18:20:29, 18:22:03,
  18:50:07 → workout logged 18:52 → training plan saved ~22:11 → sign-ins Aug 27 15:10, Sep 4 16:04,
  Sep 22 04:13 → weekly schedule edited Sep 1 16:14 → app used Sep 25. State plainly that per-login IP
  addresses are not available.
- **customer_communication** (must include, per Stripe's guidance): his two Aug 25 in-app messages,
  verbatim, sent from inside the logged-in app after purchase, which itself shows he received access. State
  honestly that we did not reply. *[Owner to confirm before submitting: was "progressions stuck" a known bug,
  and when was it fixed? The guided-progression fix eef6eed shipped 2026-08-24, the day before. Don't claim
  it was fixed for him without checking.]*
- **refund_policy / cancellation_policy:** the Terms of Service text ("all subscription plans are
  nonrefundable. You may write in to support prior to a subscription's renewal to have it canceled or you may
  cancel it from your account page"), plus the fact that he never asked to cancel or for a refund.
- **uncategorized_text (argument):** The service was delivered and used. The cardholder completed the
  renewal himself (ZIP and CVC matched), was inside the paid app within seconds, streamed lessons and logged
  workouts that day, and signed in on four later dates. He did not dispute the following month's identical
  charge (Sep 25). His only contact with us was a feature question asked from inside the app, which is not
  non-receipt.
- One combined PDF is optional (≤ 4.5 MB, no links). Text fields alone are enough at this size.

## Did the ban fire correctly?  Yes, with one gap

- Neon: `banned = true`, banReason "Chargeback du_1UParNAhvJ5jyCLHa6STvPZT (product_not_received, 50)";
  no session rows left (signed out). Sign-in goes through better-auth `signInEmail` with the admin plugin,
  which refuses banned users.
- `blocked_payment_identities` #40 card `whq6lRVvxj3BwJXC`, #41 email `skipa44@icloud.com`, #42 customer
  `cus_V61bPbQklv8DWJ`, all by `stripe-webhook` at 05:06 UTC.
- Stripe Radar default lists: the same card fingerprint, email and customer are all present (created by API
  05:06:32–33 UTC).
- Subscription cancelled immediately (no cancellation email, as designed). Both cards detached from
  `cus_V61bPbQklv8DWJ`. Slack `alert.chargeback` + `dispute.created` logged. Case #1055 open (high).
- **Gap (not fixed; outside this task):** his second account `skipa44@gmail.com` (Neon
  `d71W8PRN5RAWKb4CIVy86TEyuPRMVJqY`, Stripe `cus_VBGqlN6fZVPnob`) is **not banned**, and its email and
  customer are not on either block list. **The same Amex is still attached to that customer**
  (`pm_1UAuJGAhvJ5jyCLHDCBNd7AO`, same fingerprint). Real risk is low: the card fingerprint is blocked, so
  checkout refuses it, and that account has no live subscription. Cause: `banMember()` expands
  email → customers → cards, but never card → other customers who used it. Hand to the manager if the owner wants it.
- Cosmetic: the Neon user still reads `current/stripe`, because the classifier trusts the cached
  `renewaldate` (2026-10-25) and the ban didn't reclassify. He can't sign in, and it will lapse after Oct 25.
- Possibly related, unconfirmed: an older account `anderson6062@twc.com` ("Robert Anderson", 2022 Braintree,
  lapsed) is still getting the $15 legacy-offer emails (Sep 27, Oct 4). Same first name only. Nothing ties
  it by card or customer.

## Is anything owed to him?

- **No written promise, refund or credit is outstanding.** He has no cancel request, no refund request, and
  no support reply that promised anything. promiseCheck has nothing to verify.
- **Owner's call: the Sep 25 $50 charge** (paid period Sep 25 → Oct 25). The ban cut that period short on
  Oct 12, with 13 days left. Ban policy is "no refunds", so nothing is owed. But he can dispute that charge
  too (another $15 fee plus another dispute on the record). Refunding it would head that off; keeping it
  follows the policy.
- **The unanswered Aug 25 support request is a real service miss.** A banned member gets no reply under
  current policy (banned-member reply wording is still waiting on the GB-team meeting, per
  OctoberChargebacksCommsFlows). Recorded here, not acted on.

## Sources checked

- Live Stripe (read-only): dispute, both charges, subscriptions, invoices, setup intents, payment methods,
  Radar value-list items, events since May for both customers.
- Neon: `user`, `user_setting`, `account`, `session`, `user_logs`, `app_logs`, `support_emails`,
  `support_cases`, `support_replies`, `outbound_emails`, `support_fires`, `blocked_payment_identities`.
- Stripe docs: [Respond to disputes](https://docs.stripe.com/disputes/responding) (countered fee returned
  on a win; one submission only), [Dispute categories](https://docs.stripe.com/disputes/categories)
  (Amex C08 = product not received; digital-service evidence list),
  [June 2025 dispute pricing](https://support.stripe.com/questions/june-2025-pricing-updates-for-disputes)
  (US: $15 received + $15 countered).
- Scripts + raw JSON: session scratchpad only (not committed).

## Outreach — owner decision 2026-10-12 (as of ~15:30 UTC)

Owner (relayed by the manager, confirmed with owner-said.js, session 987aa382, 2026-10-12 15:13 UTC):
"lets reach out to the custoemr and offer to refudn both charges, kindly ask him to cancel the dispute. Also
applogize for missing his support thread." + "Tell him he can call me driectly on my cell phone … Upate Slack
Accordingly." The ban stays.

- **Slack:** posted in the chargeback alert's thread (C0B745W8BHN, thread 1791781593.598729, reply
  1791818062.524079). Status: draft awaiting owner approval, no refunds issued.
- **Email:** drafted (subject "Your GymnasticBodies support messages, and a refund"), to go on case #1055
  via `support.js send-email --case-id=1055`. **NOT sent. Waiting on owner approval of the full text.**
- **Refunds:** none issued. The owner must name the timing. The Sep 25 charge (`ch_3UJegHAhvJ5jyCLH0MfTBBGi`)
  can be refunded any time. The Aug 25 charge can't be refunded while it's disputed (Stripe: "You can't
  issue a refund on a disputed charge until your customer's card issuer decides in your favor").
- **Still required even if he withdraws:** submit evidence by 2026-11-04, adding his withdrawal confirmation
  if he sends one. Stripe: "you can still lose the dispute if you don't submit evidence, even if the
  customer withdrew the dispute."
- **Correction (owner, 15:15 UTC): "Right we ask him to close and then refund."** He withdraws first, then we
  refund: Sep 25 once he confirms the withdrawal, Aug 25 once Amex closes the dispute. The draft and Slack
  were updated (Slack replies 1791818115.818759 and 1791818133.474419). Still not sent, no refunds issued.
- **Draft revised (15:20 UTC, per Greggory):** it now quotes his two support messages, adds "We pushed a fix
  for the progression issue on August 24", and lists his usage timeline ("here's what our records show").
  The Slack reply 1791818062.524079 was rebuilt as the plan, his timeline, his support messages and the
  quoted draft. Still not sent.
- **Caution on the Aug 24 line (checked read-only):** "Core B3 → B4" means moving to the next *exercise*
  (B3 Side Over Arch, ex 15 → B4 Arch Up, ex 16). His B3 has sat at its top mastery step (9, set 131) since
  2026-07-30. The Aug 24 fix (eef6eed) only advances mastery steps *within* an exercise and stops at the top.
  "Increase difficulty" also caps at step 9. Moving to B4 needs a manual "select" in the edit screen, which
  he said he couldn't reach on his phone. So that fix doesn't cover what he reported, and Neon shows he
  never moved past B3. Whether the edit screen works for him was not tested.
- **Draft restructured (15:25 UTC, per Greggory: "Business up top, facts about the user below"):** the top
  now has the apology ("a bug in our support system … lost track of a few support messages"), the refund
  offer, the withdraw-first ask, the refund steps and Greggory's cell. Below, under "For your reference":
  his quoted messages, "we shipped a fix for workout progressions on August 24" (no claim that his B3→B4 is
  fixed), and his account activity. The Slack quote was updated to match. Not sent.
  Note: his messages were stored (support_emails 753/754) but never answered. Why they were missed is not
  confirmed. They were logged with caseId null before the case-picker existed.
- **Plan step added (15:26 UTC, per Greggory): Greggory will also call him personally to apologise and ask
  him to withdraw the dispute.** Added to the Slack plan. The only phone on file is from his second account
  skipa44@gmail.com (user_setting phone 757-641-8891). The email is unchanged unless Greggory wants it to
  mention the call.
- **Fix-timing sentence (15:30 UTC):** Greggory asked to say the issues were resolved "within 24 hours"
  of his report. Git (both repos) shows no fix for what he reported shipped within 24h AFTER his message
  (Aug 25 14:42 ET). Relevant fixes all came BEFORE it: Generate Workout fills an empty day (app bc3d531 +
  my. 499a36d, Aug 19 10:39 ET) and mastery-step auto-advance (eef6eed, Aug 23 21:06 ET, live Aug 24). After
  his message: my. 338d48a (Aug 26 15:53 ET, home-screen section vs level, no switch-confirm modals) and
  my. 7c90f4f (Sep 30, weekly view Play Workout for every guided level). Neither is a progression fix, and
  neither is verified for him. The draft uses: "Other members had reported similar problems, and we shipped
  fixes shortly before you wrote: one for building a day's workout on August 19 and one for progressions on
  August 24." The Slack quote was updated. Not sent.
- **Reordered (15:32 UTC, per Greggory):** the chargeback offer and steps come first, then a separate "Your support messages" apology, then the reference notes. Slack quote updated. Not sent.
- **Fix line reworded (15:34 UTC, per Greggory):** "The problems you described were real. Other members ran into them too, and we shipped fixes for building a day's workout (August 19) and for progressions (August 24), right around when you were running into them." Slack quote updated. Not sent.
- **Reframed around the dispute (15:36 UTC, per Greggory):** it opens with "we received your dispute … want to make it right", then the offer, steps and cell. Support is cut to 3 sentences, and the activity timeline is one reference line. New subject: "Your August 25 charge: we'd like to make it right". Slack quote updated. Not sent.
- **Business-impact sentence added (15:38 UTC, per Greggory):** "We're a small business, and disputes genuinely hurt us with our payment processor and the card networks, so we'd much rather settle this with you directly." It deliberately doesn't say withdrawing removes the dispute from our rate (Stripe: a withdrawn dispute still counts). Slack quote updated. Not sent.
- **Reworded as an appeal for cooperation (15:39 UTC, per Greggory):** "We're a small business, and disputes genuinely hurt us with our card processor, so we'd be really grateful if you'd work with us on this directly." Slack quote updated. Not sent.
- **Signed by Greggory (15:41 UTC):** "Greggory Wiley (App Development Lead)", and the cell line reads "call me directly on my cell". Slack quote updated. Not sent.
- **SENT 2026-10-12 11:33 am ET (15:33 UTC).** Greggory approved: "Okay go ahead and send the message"
  (session 987aa382, 15:33:18 UTC, confirmed with owner-said.js). Sent via `support.js send-email
  --case-id=1055 --campaign=dispute_outreach_skipa44`, subject "Your August 25 charge: we'd like to make it
  right", signed Greggory Wiley (App Development Lead). Recorded as outbound_emails #68318 (type support,
  case 1055); the stored body matches the approved text exactly. Message-ID
  `<case-1055.caea9ee1cb314c18@gymnasticbodies.com>`. SendGrid accepted the send (no error). Its activity
  search showed nothing yet right after sending. The Slack plan says "email sent 11:33 am ET".
- **No refunds issued.** Next: when he replies that he's withdrawn, refund `ch_3UJegHAhvJ5jyCLH0MfTBBGi`
  (Sep 25) right away. Refund the Aug 25 charge once the dispute closes in our favour. Submit evidence
  (with his withdrawal confirmation) by 2026-11-04 either way. A reply re-opens case #1055 via the case
  picker. Greggory will also call him.
