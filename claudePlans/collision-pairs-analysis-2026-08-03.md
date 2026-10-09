# Dual-Casing Collision Pairs — Analysis (2026-08-03)

Read-only analysis of the 17 collisions from `claudePlans/email-normalization-2026-07-31.json`
(`collisions` array): each pair is a **mixed-case** user record whose email could not be
lowercased because a second user record already owns the **lowercase** form.
**No merges or deletions were performed.** Every recommendation below needs owner sign-off.

## The pattern (holds for 15 of 17 pairs)

| | Mixed-case account | Lowercase account |
|---|---|---|
| ID style | UUID (bulk import, `migration.js` batches 2026-04-17 / 2026-04-20) | better-auth 32-char (native app signup) |
| Subscription | Real legacy record (`renewaldate`, on-hold/Active/Inactive) | Usually none, or a 30-day access row from signup |
| Credential | Added **2026-07-31** by the Keap password migration | Member-created at signup |
| Sessions | 0 (never logged in directly) | 1–2, all on signup day |
| user_logs | Legacy AWS history **seeded 2026-08-03/04 by the bulk cohort run** (created_at reflects seed time, content is real member history) | 0 (exception: Udo has 1 live log) |
| Support rows | none | none |

So the naive reading "lowercase is live, mixed-case is a husk" is **wrong for most pairs**:
the mixed-case record is the member's real legacy identity (entitlement + workout history +
Keap password), and the lowercase record is a thin shell the member created post-migration
when their old login stopped working. The member's *typed* login (lowercase) resolves to the
shell — which is exactly why these members see an empty account. Both sides now hold a
credential, so a blind delete on either side can lock the member out or destroy history.

## Per-pair table

Legend: `cred` = credential rows; `sess` = session count @ last date; `rd` = renewaldate in
subscription setting; `logs` = user_logs rows; `oset` = non-subscription user_setting rows
(workout seeds). All pairs have 0 support emails/cases on both sides unless noted.

| # | Email (lowercased) | Mixed-case (UUID) | Lowercase (native) | Classification | Recommended action |
|---|---|---|---|---|---|
| 1 | chris.cantwell.01@gmail.com | created 04-17, **no cred**, 0 sess, sub on-hold rd 2026-06-08, 0 logs | created 03-01, cred, 2 sess @03-01, rd 2026-03-08, levelPath, 0 logs | Mixed = credential-less WC sub stub; lowercase = only login | Fold stub (its later rd 06-08 is the real paid-through) into lowercase, then delete stub. Low risk. |
| 2 | udoboehm1@gmail.com | created 04-17, cred 07-31, sub Inactive rd 2026-04-13, **1,287 logs** (seeded), 5 oset | created 04-13, cred, 1 sess, **1 live log @07-30**, no sub row | **Both have data** — legacy history on mixed, live usage on lowercase | True two-sided merge: move seeded history + sub record onto one survivor. Do not delete either yet. |
| 3 | adis4president@hotmail.com | created 04-17, cred 07-31, on-hold rd 2026-05-12, 644 logs (seeded), 3 oset | created 04-13, cred, 1 sess @04-13, nothing else | Mixed holds all data; lowercase = signup-day shell | Merge keeping mixed as survivor (lowercase the email after removing shell). |
| 4 | toddistheman32@gmail.com | name **"Todd"**, created 04-17, cred 07-31, Inactive rd 2026-03-25, 19 logs, 3 oset | name **"Gary T Clevinger"**, created 03-26, cred, 1 sess, on-hold rd 2026-03-26 | **Name mismatch** — possibly two different people on one mailbox | Investigate before any merge. Do not auto-resolve. |
| 5 | randyarchibald4@gmail.com | created 04-17, cred 07-31, on-hold rd 2026-05-26, 6 logs (seeded), 4 oset | created 03-26, cred, 1 sess, active rd 2026-04-26 (expired), 0 logs | Mixed holds legacy record; lowercase = shell w/ expired 30-day row | Merge keeping mixed as survivor. |
| 6 | hisoka.gum8@gmail.com (Diego Morales) | created 04-17, cred 07-31, on-hold rd 2026-05-20, 7 logs, 4 oset | created 03-20, cred, 1 sess, active rd 2026-04-20 (expired) | Mixed holds legacy record; lowercase = shell | Merge keeping mixed as survivor. |
| 7 | bernsteinmail@aol.com (James) | created 04-20, cred 07-31, active rd 2026-06-28 (expired), 3 logs, 0 oset | created 03-28, cred, 1 sess, active rd 2026-04-27 (expired) | Both thin; mixed has the later paid-through | Light merge: keep mixed (later rd + Keap cred), remove shell. |
| 8 | guillaume.kaminer@gmail.com | created 04-20, cred 07-31, **current/subscriber, Active rd 2027-03-29**, 2 logs, 3 oset | created 03-30, cred, 1 sess, **current/subscriber, active rd 2027-03-30** | **Both current** — same annual entitlement recorded twice | Careful consolidation to ONE current account; never blind-delete (both are "current" in classifier). |
| 9 | darren@darrenstarproductions.com | created 04-20, cred 07-31, **current, Active rd 2027-04-15**, 4 logs, 3 oset | created 04-15, cred, 1 sess, no sub, lapsed | Mixed holds current entitlement + data; lowercase = shell made the day the legacy sub renewed | Merge keeping mixed as survivor. |
| 10 | chestu01au@gmail.com (Stuart Chesters) | created 04-20, cred 07-31, **current, Active rd 2027-04-18, 441 logs**, 5 oset | created 04-19, cred, 1 sess, nothing else | Mixed clearly substantive + current; lowercase = shell | Merge keeping mixed as survivor. |
| 11 | appatrunks@gmail.com (Alberto) | created 04-17, **no cred, 0 sess, 0 logs, 0 oset**, Inactive rd 2026-04-02 (expired stub) | created 2025-12-27, cred, 1 sess, **current/subscriber rd 2026-12-30** | **Lowercase is the live account; mixed-case is an empty husk** (only pair matching the naive hypothesis) | Safe to delete husk (expired stub, no credential, nothing attached). |
| 12 | stoehr.barbara@web.de | created 04-17, cred 07-31, on-hold rd 2026-05-02, **1,662 logs**, 5 oset | created 05-04 (2 days after legacy expiry), cred, 1 sess, nothing else | Mixed holds heavy history; lowercase = shell | Merge keeping mixed as survivor. |
| 13 | jeff.walker@thrivefinancialservices.com | created 04-17, cred 07-31, Active rd 2026-04-23 (expired), 1 oset, 0 logs | created 04-24 (day after expiry), cred, 1 sess, nothing | Both thin; mixed holds the sub record | Light merge: keep mixed, remove shell. |
| 14 | chris.corjay@gmail.com | created 04-20, cred 07-31, Inactive rd N/A, 2 oset, 0 logs | created 04-05, cred, 1 sess, nothing | **Both effectively empty** | Pick one survivor (suggest lowercase — member-created login), delete the other. Quick manual check first. |
| 15 | d.haug@josito.de (Duygu Haug) | created 04-17, cred 07-31, **current, Active rd 2027-03-27**, 1 log, 4 oset | created 03-27, cred, 2 sess, **current, active rd 2027-03-27** | **Both current** — duplicate entitlement | Careful consolidation to ONE current account (same as pair 8). |
| 16 | timlooney07@gmail.com | created 04-17, cred 07-31, **current, Active rd 2027-03-19**, 66 logs, 4 oset | created 03-16, cred, 1 sess, on-hold rd 2026-03-16 (expired) | Mixed substantive + current; lowercase = brief lapsed signup | Merge keeping mixed as survivor. |
| 17 | nickaes2504@gmail.com | created 04-17, cred 07-31, on-hold rd 2026-06-05, 92 logs, 3 oset | created 04-02, cred, 1 sess, active rd 2026-05-02 (expired) | Mixed holds legacy data; lowercase = shell | Merge keeping mixed as survivor. |

## Classification counts

| Classification | Pairs |
|---|---|
| Mixed-case holds the real data; lowercase is a thin re-signup shell → merge keep-legacy | 10 (#3, 5, 6, 7, 9, 10, 12, 13, 16, 17) |
| Both sides have data — true two-sided merge | 1 (#2 Udo) |
| Both accounts currently `current/subscriber` — duplicate entitlement, careful consolidation | 2 (#8 Guillaume, #15 d.Haug) |
| Lowercase live, mixed-case empty husk — safe to delete husk | 1 (#11 Appatrunks) |
| Mixed = credential-less sub stub, lowercase = only login — fold + delete stub | 1 (#1 Cantwell) |
| Both effectively empty — pick a survivor | 1 (#14 Corjay) |
| Name mismatch — investigate people before touching | 1 (#4 Todd/Gary) |

## Cross-cutting notes for the merge design

1. **Login resolution is the root bug.** Members typing their (lowercase) email resolve to the
   shell account and see an empty app — same failure class as the alt-identity support cases.
   Any merge design should also decide whether better-auth email lookup becomes
   case-insensitive, or all emails get normalized post-merge.
2. **Both sides now hold credentials** in 14/17 pairs (Keap password landed on the mixed-case
   side 2026-07-31; the member's chosen password is on the lowercase side). A merge must pick
   which password survives — suggest the member-created (lowercase) one.
3. **user_logs timestamps on mixed-case accounts reflect seed time** (2026-08-03/04 bulk run),
   not activity time; the content is genuine legacy history keyed to real workout dates in the
   day-JSON docs. Only Udo (#2) has post-migration live activity, and it is on the *lowercase* side.
4. **Do not let `classifyUsers` see a half-merged state**: pairs #8/#15 have `current` on both
   rows; deleting or demoting the wrong row mid-merge could paywall a paying member.
5. Raw per-pair JSON captured at
   `/tmp/claude-1000/-var-www-Work-Gymfit-app-gymnasticbodies-com/e096772e-4611-495c-b1f7-506fd77fd795/scratchpad/collision-pairs-raw.json`
   (session scratchpad — regenerate from Neon if needed; the query lives in the identity-cleanup session transcript).
