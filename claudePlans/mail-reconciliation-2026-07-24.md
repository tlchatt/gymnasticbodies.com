# Support Mailbox ↔ `support_emails` Reconciliation

**Generated:** 2026-07-24 · **Mailbox:** admin@gymnasticbodies.com (confirmed) · **Read-only audit — no DB writes, no sends.**
**Query:** `in:anywhere (to:support@gymnasticbodies.com OR list:support@gymnasticbodies.com) newer_than:540d`

---

## Summary (read this first)

The hourly Gmail sync has **under-ingested by a wide margin**. Of **414 customer messages** found in the live mailbox over the last 540 days, only **133** are represented in `support_emails`; **281 are MISSING** (across **187 distinct senders**).

| Metric | Count |
|---|---|
| Support-related messages scanned | 617 |
| ‎ ↳ in Inbox / Spam / Trash | 542 / 75 / 0 |
| Unique Gmail threads | 519 |
| **Customer** messages (contact-form + direct reply) | 414 |
| ‎ ↳ contact-form / direct-reply | 233 / 181 |
| Staff / internal messages (excluded) | 196 |
| Automated (bounces, spam-filter) (excluded) | 7 |
| Already in `support_emails` | 133 |
| **MISSING customer messages** | **281** |
| Handled-outside-the-system threads (need cases) | 28 |
| WC-migration billing victims (of 103) who contacted us | 6 |

`support_emails` currently holds 124 rows; `support_cases` holds 68.

### MISSING breakdown

| Split | Count |
|---|---|
| **By type** — contact-form | 144 |
| **By type** — direct reply | 137 |
| **By location** — in Inbox | 229 |
| **By location** — in Spam | 52 |
| contact-form in inbox / spam | 144 / 0 |
| direct-reply in inbox / spam | 85 / 52 |
| in a thread where staff already replied | 50 |
| maps to a known Neon user | 218 (162 noncurrent) |
| subject mentions cancel/refund/billing/renew | 36 |

---

## Two distinct failure modes

**1. Spam is invisible to the sync.** The production sync queries `list:support@gymnasticbodies.com after:{cursor}` — it never adds `in:anywhere`, so Gmail excludes Spam and Trash. **52 missing messages are sitting in Spam**, all of them **direct customer replies** (0 contact-form emails land in spam). These are DMARC-rewritten Google-Groups replies (`From: "Name via support <support@gymnasticbodies.com>"`) that Gmail's spam filter distrusts — exactly the class the reporter flagged.

**2. Inbox backlog / cursor gaps.** 229 missing messages are in the **Inbox** — the sync could see them but didn't. 144 are contact-form submissions (which parse cleanly) and 85 are direct replies. This points to the sync not keeping up with volume and/or its `MAX(receivedAt) − 2min` cursor skipping ranges. The gap is **not** evenly spread over time — it concentrates in the paywall-campaign period:

| Month | Missing (total) | contact-form | direct-reply |
|---|---|---|---|
| 2026-01 | 77 | 39 | 38 |
| 2026-02 | 6 | 0 | 6 |
| 2026-03 | 2 | 0 | 2 |
| 2026-04 | 2 | 0 | 2 |
| 2026-05 | 9 | 0 | 9 |
| 2026-06 | 89 | 72 | 17 |
| 2026-07 | 96 | 33 | 63 |

The Jun–Jul 2026 spike coincides with the renewal/paywall go-live: a surge of contact-form submissions and direct replies to the "Having trouble renewing…" / "A special offer…" outreach, most of which never made it into the inbox.

---

## Handled outside the system (28 threads → should become cases)

Threads where a staff member (support@, admin@, or luke@gymnasticbodies.com) replied **directly in Gmail**, but the customer's message was never ingested into `support_emails` and no case exists. These conversations happened entirely off the ticketing system.

| Customer(s) | Subject | Thread ID |
|---|---|---|
| ryanosborn92@gmail.com | Re: Cancel my subscription | 19d24e0e96a93f34 |
| mhartenburgdc@protonmail.com | my.gymnasticbodies.com Contact Form Submission from Matthew | 19bb425cf4c53083 |
| csgoldsmith@gmail.com | Re: Help: Videos are not loading | 19c02648433f6ce3 |
| bilalmgs@hotmail.com | my.gymnasticbodies.com Contact Form Submission from Bilal Du | 19ba8b107a98c93b |
| alexander@qready.ca | my.gymnasticbodies.com Contact Form Submission from Alexande | 19bb788d09a4d45b |
| ovidoxas@gmail.com | my.gymnasticbodies.com Contact Form Submission from Ovidijus | 19bc2f4f85671ae9 |
| richardwofford@ymail.com | my.gymnasticbodies.com Contact Form Submission from Richard | 19bae91a799c75a0 |
| uzi@usasson.com | Assistance Required: Downloading app for my premium account | 19bd86405b518818 |
| miquelmalet@pm.me | my.gymnasticbodies.com Contact Form Submission from Miquel M | 19bc653ae5ce45f8 |
| luislunafb@gmail.com | Re: GymFit access issue – previously purchased course access | 19c0755e5d2f26ca |
| ivandarinovkulev@gmail.com | my.gymnasticbodies.com Contact Form Submission from Ivan | 19ba7de81cbad43e |
| kramizeh@att.net | I can't login to Manage Subscriptions | 19bd7e05592762a5 |
| fighttimefitness105@gmail.com | Courses not working | 19be09a42bf0e76e |
| teresika31@gmail.com | Re: Cancel subscription | 19bca12e7cd1fa3d |
| johannes.walser@hotmail.com | my.gymnasticbodies.com Contact Form Submission from Johannes | 19bb8d71ee890559 |
| rjbeseke@gmail.com | Subscription | 19ba996dffb3bb45 |
| cmwalker654@gmail.com | my.gymnasticbodies.com Contact Form Submission from Corey Wa | 19bb2927ea405c5f |
| mateusz.sobanski@yahoo.co.uk | my.gymnasticbodies.com Contact Form Submission from Mateusz | 19bbdf542a9769fe |
| mrobertweiss@gmail.com | my.gymnasticbodies.com Contact Form Submission from manuel r | 19baec2f0b07c926 |
| info@estherdewinter.nl | my.gymnasticbodies.com Contact Form Submission from Esther D | 19bac9c7c0572ccf |
| marcuswdwalker@gmail.com | my.gymnasticbodies.com Contact Form Submission from Marcus W | 19ba97ebae1b5ce1 |
| ernstlangjan@gmail.com | my.gymnasticbodies.com Contact Form Submission from Ernst La | 19ba75a9c2cdee14 |
| chrisstadtherr@gmail.com | my.gymnasticbodies.com Contact Form Submission from Chris | 19bab432c2e9b675 |
| andersend123@gmail.com | my.gymnasticbodies.com Contact Form Submission from Dan Ande | 19bc1e5fd71d445a |
| mayajaccs@gmail.com | my.gymnasticbodies.com Contact Form Submission from Maya jac | 19bb8e21a0f8f6b7 |
| lacrosseinfo@gmail.com | my.gymnasticbodies.com Contact Form Submission from Rafael G | 19ba5668b4906d14 |
| webcontact7@yahoo.co.uk | my.gymnasticbodies.com Contact Form Submission from clive ne | 19bbcc1e05f3baf1 |
| carl.franzetti@gmail.com | my.gymnasticbodies.com Contact Form Submission from Carl Fra | 19bb428beaeadc2f |

---

## WC-migration billing victims who contacted us (6 of 103)

Cross-referenced against `claudePlans/wc-migration-billing-victims-2026-07-23.json`. These are people flagged as wrongly-billed / wrongly-paywalled who **reached out for help**. 5 of the 6 have at least one message **still missing** from `support_emails`; the rest are already ingested. All 6 are `noncurrent` in Neon.

| Email | Name | Subject (first contact) | Date | Location | Msgs |
|---|---|---|---|---|---|
| bilalmgs@hotmail.com | Mr B Dukandar | my.gymnasticbodies.com Contact Form Submission from Bil | 2026-01-10 | inbox | 3 |
| miquelmalet@pm.me | Miquel Malet Casas Malet | my.gymnasticbodies.com Contact Form Submission from Miq | 2026-01-16 | inbox | 3 |
| angrywilson@gmail.com | Greg Dona | my.gymnasticbodies.com Contact Form Submission from Gre | 2026-06-03 | inbox | 2 |
| olivier.renard.1973@gmail.com | Olivier Renard Renard | Re: Having trouble renewing your GymFit membership? | 2026-07-03 | SPAM-only | 2 |
| indian_pride_28@yahoo.com | Nicole Foret | app.gymnasticbodies.com Contact Form Submission from Ni | 2026-07-08 | inbox | 1 |
| brycegraw@gmail.com | Bryce Graw | my.gymnasticbodies.com Contact Form Submission from Bry | 2026-07-12 | inbox | 1 |

*Missing from `support_emails`:* bilalmgs@hotmail.com, miquelmalet@pm.me, angrywilson@gmail.com, olivier.renard.1973@gmail.com, indian_pride_28@yahoo.com.
*Already ingested (contacted but present):* brycegraw@gmail.com.

Note: `olivier.renard.1973@gmail.com` replied to the renewal outreach and the reply is **spam-only** — a billing victim whose cry for help the sync would never have seen.

---

## Repeat senders with ≥3 missing messages (unanswered follow-ups)

Customers who emailed multiple times with nothing ingested — likely never got a reply. One case each should be opened, linking all their messages.

| # msgs | Email | Name | Neon type | staff replied? |
|---|---|---|---|---|
| 7 | alexander@qready.ca | alexander@qready.ca | noncurrent | yes |
| 5 | aaronjblake@gmail.com | aaronjblake@gmail.com | current |  |
| 5 | rayprz444@gmail.com | rayprz444@gmail.com | noncurrent |  |
| 4 | justin@justinoconnorsales.com | justin@justinoconnorsales.com | noncurrent |  |
| 4 | tim@par5performance.com | tim@par5performance.com | current |  |
| 4 | montes.shane@icloud.com | montes.shane@icloud.com | noncurrent |  |
| 4 | jeremy.demaria1@gmail.com | jeremy.demaria1@gmail.com | noncurrent |  |
| 4 | mghazi2@gmail.com | mghazi2@gmail.com | noncurrent |  |
| 3 | ivandarinovkulev@gmail.com | ivandarinovkulev@gmail.com | noncurrent | yes |
| 3 | bilalmgs@hotmail.com | bilalmgs@hotmail.com | current | yes |
| 3 | cmwalker654@gmail.com | cmwalker654@gmail.com | noncurrent | yes |
| 3 | mhartenburgdc@protonmail.com | mhartenburgdc@protonmail.com | noncurrent | yes |
| 3 | csgoldsmith@gmail.com | csgoldsmith@gmail.com | current | yes |
| 3 | sjp5408@gmail.com | sjp5408@gmail.com | current |  |
| 3 | ovidoxas@gmail.com | ovidoxas@gmail.com | current | yes |
| 3 | uzi@usasson.com | uzi@usasson.com | current | yes |
| 3 | jeremygriffiths2@me.com | Jeremy Griffiths | noncurrent |  |
| 3 | siteadmin@abs.gov.au | siteadmin@abs.gov.au | — |  |
| 3 | alex.bodnar.hkr@teepublic.com | alex.bodnar.hkr@teepublic.com | — |  |
| 3 | tombartels183@hotmail.com | tombartels183@hotmail.com | noncurrent |  |
| 3 | mtrejgis@gmail.com | mtrejgis@gmail.com | noncurrent |  |
| 3 | geodeighan@gmail.com | geodeighan@gmail.com | noncurrent |  |
| 3 | mukhtyarullah.nc2420.18@gmail.com | mukhtyarullah.nc2420.18@gmail.com | — |  |

---

## Methodology & caveats

- **Scope:** `in:anywhere` includes Spam and Trash. 540-day window. Pulled 519 full threads (662 total thread-messages, incl. non-query messages such as in-thread staff replies), covering all 617 query-matched messages.
- **True sender** resolved by replicating `lib/gmail.js` `resolveSender()`: `X-Original-Sender` → `Reply-To` → `From` (stripping the `"Name via support"` DMARC wrapper). Contact-form emails (From `contact@gymnasticbodies.com`) use `Reply-To` as the real customer and always count as a customer message.
- **Internal/staff** = true-sender domain `gymnasticbodies.com` and not a contact form (support@, admin@, luke@). Automated senders (mailer-daemon, no-reply, spam-digest) are excluded from both customer and staff.
- **Dedup vs `support_emails`** used three checks: raw Gmail message-id prefix, full synthetic id (`{msgId}_{base64(email)[:8]}`), and the `lower(from_email)+normalized-subject` fallback. **Important:** Google Groups delivers the same email as *multiple distinct Gmail messages* (different message-ids, different threadIds, one copy in Inbox and one in Spam). The message-id the sync stored is therefore usually **not** the instance this pull captured, so raw-id/synthetic matching rarely fires and dedup rests mainly on the **email+subject fallback**. The MISSING figure follows the reporter's specified method and should be treated as a close estimate; the write phase must re-verify each message before ingesting/creating a case.
- **RFC Message-ID dedup** of the missing set collapsed 0 records — the apparent "duplicates" are genuinely distinct follow-up emails (distinct RFC ids and dates), not double-deliveries of one email.
- **Pull completeness confirmed:** 102 of 124 `support_emails` rows align to this pull by email(+subject); the 22 that don't are staff replies (4), test seed rows (3), and old (May-2026) contact forms since deleted from the live mailbox (15) — none represent a gap in the missing analysis.
- **Companion file:** `claudePlans/mail-reconciliation-missing-2026-07-24.json` — the 281-record ingestion/case-creation work-list (one row per missing message; `duplicateCopies`/`allGmailMessageIds` fields flag any true double-deliveries; `threadHasStaffReply`, `threadHasLinkedCase`, `matchedUserId`, `is103Victim` included).
