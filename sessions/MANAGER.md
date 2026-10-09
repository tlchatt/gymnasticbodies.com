# Manager — Gymnastic Bodies

Read this FIRST on startup, compaction or rotation (skill `project-review-manage`).

- **Manager session ID:** `987aa382-2760-494d-94a5-e595dda95c78` — resume: `tclauder 987aa382-2760-494d-94a5-e595dda95c78`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com` (git root; `sessions/INDEX.md` lives one level up at `/var/www/Work/Gymfit/sessions/INDEX.md`, outside the repo)
- **Board client slug:** `gymnastic-bodies`
- **Review baseline commit:** `12f6aee` (2026-10-08)
- **Last check-in:** 2026-10-09 ~00:15 ET
- **Each check-in:** flag any uncommitted work in the tree to its owning session right away — finish and commit, or discard. Nothing gets left to go stale.

## Today — 2026-10-09

_Carried over from 2026-10-08: items 1–3 (numbers kept)._

| # | Item | Session | Task | Hours | Status |
|---|---|---|---|---|---|
| 1 | Luke: mobile white screen + subscribe warning → mobile icon labels | `cc26628b-4f8f-4876-9691-e177603f1efe` | none | `67ede9d8` open | 🟡 carried |
| 2 | October chargeback users → support-agent real cancel/refund/delete | `96d475f4-f803-4e81-9ce1-375faef72746` | none (candidate `35ee9965`) | none matched | 🟡 carried |
| 4 | Matthew Walker (mwalker2k9@gmail.com, Neon alias +10): Stripe = 1 charge $50 Jul 9, returned via lost dispute; legacy Woo/Auth.net $179.88/yr last charged 2023-10-02 (card 9244, profile 567122056) — live Auth.net check FAILED (local creds inactive). Luke cancelled him + Carlos Areces 1 min apart Sep 28 (likely never-rebill-disputers). chargeback ban came from OUR bug (Jul 9) — keep ban + explain, or reinstate through 2026-12-23; email owed either way. Also: Luke cancelled his sub Sep 28 with no note (ask Luke). Lower: Carlos Areces (rhinopc60@hotmail.com) same backfill | `96d475f4` (passed from) | none | — | 🔴 owner: keep ban / reinstate |
| 5 | Banned-member policy + exact reply for the support agent. Agent improvised for Dean Torcasio (case 818 / ticket 1055, play 283): falsely said we refund on chargebacks; lookupMember does not return banned/banReason; Dean got 2 same-day emails. Impl after decision: lookupMember returns banned, BANNED rule + template in lib/support/investigate.js, test on ticket 1055 | `96d475f4` (passed from) | `b7ac6d8c` | — | ⏸ parked for later (board task) |
| 6 | Meet the GB team on how to implement the chargeback Ban / Block policy (items 4 and 5 hang on it) | — | `78840146` | — | ⏸ meeting to schedule |
| 7 | Thoracic Bridge full video: owner found an older complete copy, upload pending. Then 11 members are owed "it is live now" (we wrote "We will email you as soon as it is live"): georgebelange #763, pierce.whitfield #470, patriothb #781, shearonlevi #750, wrsummers #743, ibarak545 #779 (+ Edit/Sunday/continuous-play escalations #700/#779), stephen.desrosiers86 #666, nickybrennan87 #659, travisdaiglecdc #824, maynard.yelo #572, andre.hayter #825. Draft to owner first; close each case after sending. Parked eng escalations: Iris (Edit, Sunday gen, continuous play), James Lord + Per Nyberg (guided plan empty/missing exercises) | `96d475f4` (passed from) | `e17309bc` | — | ⏸ waits on video upload; 37 complainers total (claudePlans/thoracic-bridge-complainers-2026-10-09.json) |
| 8 | SECURITY: app/api/user/support-message/route.js:29-35 has no login check — trusts body userId; anyone with a member id can post support messages as that member, which the support agent may act on (cancel/refund/delete). Found by 96d475f4 audit, verified by manager | `071bee16-bc45-46cd-b697-ce6609c932c6` | `1dca034a` | `53c5fdde` open | 🟡 dispatched 2026-10-09 09:40 |
| 9 | AWS shutdown: back up then turn off Lightsail forum/WP boxes, courses RDS, idle ALBs/Fargate/CloudFront/S3, support plan (~$1,000/mo; Oct 1-8 = $272). Owner ordered. | `41dadbf1-ad9a-4e49-884d-056e98d46760` | `264fa864` | `37247c62` open | 🟡 dispatched 2026-10-09 |
| 3 | 8 members from 09-30 offer-crash apology hold an unretracted "we will email you a link" promise | `20126359` (closed) | none | — | 🔴 owner: walk-back / keep / leave |

## Past days

### 2026-10-08

| # | Item | Session | Task | Hours | Status |
|---|---|---|---|---|---|
| 1 | Luke: mobile button white screen + subscribe warning (now: mobile icon labels) | `cc26628b-4f8f-4876-9691-e177603f1efe` | none | `67ede9d8` open | 🟡 running |
| 2 | October chargeback users → support-agent real cancel/refund/delete | `96d475f4-f803-4e81-9ce1-375faef72746` | none (candidate `35ee9965`) | none matched | 🟡 running |
| 3 | Oct 28 renewal reminders: Stripe webhook never received `invoice.upcoming` / dispute / EFW events | manager | none | — | 🔴 dispute+EFW alerts on; `invoice.upcoming` off. 8 members from 09-30 offer-crash apology hold an unretracted link promise — owner: walk-back / keep / leave |

## Review walkthrough — remaining items (2026-10-08)
- Uncommitted tree: 11 untracked session notes, ~60 untracked `claudePlans/*`, 205 deleted `.playwright-mcp` logs, uncommitted `app/admin/support-ops/` (since CloudSupportAgent, Aug), live sessions' in-flight edits
- 2 old stashes (2025-12-23 sendgrid; 2026-01-09 subscription route)
- INDEX gaps: UNRESOLVED-HANDOFF-2026-08-05 + VideoWebmTruncation-followup have no row; AWSMigrationsForum row date drift
- AWS/Lightsail decommission still blocked (forum cut over 09-30)
- Aric admin grant pending (AdminLoginsResetFix)
- Old support backlog (unsent drafts, pricing/lifetime decision) — needs triage vs current inbox
- Notes contain plaintext passwords (AdminLoginsResetFix, TimSupport, VideoIssuesPostUserMerge) — before committing untracked notes

## Log
- 2026-10-08 21:05 — Manager started. Full review (Phases 1–2). Verified-done and dropped: bcc80b4/34e3fab live, video truncation fixed 09-02, plaintext-password log gone, forum cutover 09-30, board 8433a3bd/7c2eae67 done.
- 2026-10-08 21:10 — Live Stripe webhook `we_1TYcT9AhvJ5jyCLHVUtQydHK`: added `invoice.upcoming`, `charge.dispute.created`, `radar.early_fraud_warning.created` (owner ordered). 33 trialing subs bill before 12-31 (22 from Oct 28 on = the credit group).
- 2026-10-08 21:25 — Owner: "only send a heads-up to the ones we promised one to." Searched outbound_emails + support_replies: no written reminder promise found (the Oct-28 reminder rule was an internal safeguard from e096772e). Removed `invoice.upcoming` from the live webhook again (dispute + EFW alerts stay on). No reminders sent. Item 3 → ✅ closed unless owner names a promised group.
- 2026-10-08 21:45 — Record corrected (transcript search): the ONLY written reminder promise is the 2026-09-30 offer-crash apology (session `20126359-f422-446e-861d-d6c0e83c5c02`, campaign `offer_crash_fix_2026-09`): "Before your access runs out, we'll email you a link to continue at the same $15/month rate." 8 recipients (anderer.marcel #930, bentsoutherland #956, lesperance, morgan.ash88, dee5020, k_r_schmitt, tullock, poffner; cornel got no promise). Owner rejected a reminder email; fix shipped as `4a3b3c3` (renewOffer flag → $15 offer page). Walk-back drafted 13:02 but NEVER sent (0 rows). Access ends ~Nov 20–28. Item 3 reopened: owner to choose walk-back / keep / leave. July +3mo credit emails promised no reminder.
- 2026-10-09 00:15 — Review item 2 (uncommitted tree), owner approved A–G: e4c1622 (11 notes), ca711af (CLAUDE.md), 82f9cd3 (migration 0010), 9d0d166 (.gitignore: neon dumps + claudePlans data), be4c0f1 (.playwright-mcp logs), bd6f110 (16 plan .md). G (Support Ops page, Aug 13) was committed as e9b5616 then UNDONE before any push (owner: dated + overlaps today's support-agent executor work) — files left uncommitted on disk for the support-agent session to judge. Not pushed. `_next.mjs` = one-off support-case query script (not Next config) — awaiting owner.
- 2026-10-09 — Deleted untracked `_next.mjs` (Aug 11 one-off support-case query script), owner ordered. Item 2 complete.
- 2026-10-09 — Chargeback session (96d475f4) handed over Matthew Walker ban decision as item 4. Support Ops review verdict: discard (orphaned Aug design; old poller.js + Aug execute.js copy are a hazard if started; not running). Awaiting owner: 1 / 1+2 / 1+2+3; stashes awaiting drop.
- 2026-10-09 — Chargeback session handed over item 5: banned-member policy + reply wording for the support agent.
- 2026-10-09 — Owner: meet with the GB team on implementing the chargeback ban/block policy. Board task 78840146. Items 4 (Matthew Walker) and 5 (banned-member reply) wait on it.
- 2026-10-09 — Chargeback session handed over item 7 (Thoracic Bridge live-now emails owed to 11 members once the full video is uploaded). Note: the 2026-09-02 27.7-min rebuild is wrong (reversed order, dropped from Intermediate 1 rotation); CLAUDE.md video section corrected but uncommitted (another session).
- 2026-10-09 — Board task e17309bc for Thoracic Bridge upload + live-now email. Pulled every member who wrote in about Thoracic: 37 (23 since Aug 23), 11 of them promised in writing. Audience (11 vs all 37) is owner's call when drafting.
- 2026-10-09 — Matthew Walker traced (transcripts + live Stripe): no second active sub found; old annual Woo/Auth.net plan last billed Oct 2023; Auth.net live check blocked (credentials inactive). Raised for GB-team meeting 78840146.
- 2026-10-09 — Luke's admin cancels audited (app_logs): 30 Jul 22–Oct 6 (12 Stripe, 16 app-only, 1 delete + coachbaylis 2×$75 refunds). All 16 app-only checked vs live Stripe: no live subs, no charges since. Only Matthew + Carlos (Sep 28 06:12/06:13) look policy-driven. Carlos: 1 sub $179.88/yr Jun 14, dispute du_1TmQJZ lost (product_unacceptable) — no money held.
- 2026-10-09 — Item 8 (support-message route unauthenticated) logged, verified in code. FYI: communication-flows draft spec committed 94a8f39 (claudePlans/communication-flows.md), open decisions marked ⚑.
- 2026-10-09 09:40 — Dispatched worker session 071bee16 (window "Support-message endpoint auth fix", L5) for item 8; task 1dca034a; hours 53c5fdde. Told to plan the auth approach with the owner before coding, no push/deploy without the owner.
- 2026-10-09 — Review item 4 (AWS still billing ~$1,000/mo) → owner: turn them off. Dispatched worker 41dadbf1 (window "AWS shutdown for Gymnastic Bodies", L5), task 264fa864, hours 37247c62. Told: verify no live use, back up, show one table, execute on confirmation, keep Route 53.
- 2026-10-09 — Aric admin: owner says handled, good to go (DB still role=user, not in adminUserIds — owner's call). Forum smoke test live: index, category, topic, paging, sitemap (15,008 URLs), old index.php + attachment redirects all OK.
