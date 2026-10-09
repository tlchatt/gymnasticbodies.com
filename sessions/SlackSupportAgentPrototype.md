# Slack Support Agent Prototype — Session Notes

- **Session name:** SlackSupportAgentPrototype
- **Session id / scratchpad:** f57b8cf9-6d74-4d6f-ad9a-8bff12797ed1
- **Working dir:** /var/www/Work/Gymfit/app.gymnasticbodies.com
- **Dates:** 2026-08-19 → 2026-08-23 (snapshot as of 2026-08-23)
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/f57b8cf9-6d74-4d6f-ad9a-8bff12797ed1.jsonl`
- **Data written this session:** prod Neon (credits, migration_type, case notes), prod Stripe (trial_end/refund-pending), SendGrid (5 customer emails), Slack (`gymnstic-bodies-support` channel), 2 git deploys.
- **Key files:** `claudePlans/support-agent-flow-2026-08-19.md` (the flow + rules), scratchpad `slack-replies.md` (all drafted customer replies), `claudePlans/deleted-erik-matthiessen-2026-08-19.json` (delete backup, HELD).

## What this session was
Prototype of an **agentic support flow**: Luke escalates customer issues into the `gymnstic-bodies-support` Slack channel; the agent (this session, driven by Gregg) reads the case, investigates in Neon/Stripe, **fixes what it can, credits per policy, drafts a customer reply as a "proposed play," and sends on Gregg's approval.** Authorization is Gregg in-session (an actual Slack Accept button needs a Slack app — future build).

## Operating rules established (durable — see also claudePlans/support-agent-flow-2026-08-19.md)
- **NEVER reply to an unresolved issue.** Bug → make the fix LIVE, test as the user (impersonation), verify, THEN reply. "Fix in progress" replies are not acceptable.
- **Credit = ~2× the service interruption length.** "Generous means longer than the interruption." Rule of thumb: **2 weeks locked out = 1 month credit.** A cached video / partial-feature glitch with full app access = **no credit** (no interruption). Size to the LOGGED interruption window, not loyalty/severity.
- **You cannot back-pedal a credit once the email is sent** — right-size BEFORE sending.
- **No site-code changes without Gregg's involvement** was the original rule; he cleared code fixes this session but they still get tested-as-user before the reply goes out.
- **Never permanently delete data** — back up + HOLD the delete for Gregg.
- **Show the customer email draft (even after edits) and wait for approval before sending.**
- Per-machine browser rule now in global CLAUDE.md: pick the `isLocal:true` browser (this machine's Chrome-Beta agent).

## Code deployed this session (LIVE, prod)
- **app.** commit `bc3d531`: new `fill-day-from-template` op in `app/api/user/workout/levels/route.js` — "Generate Workout" on an empty guided-Level day fills from the level template (real classIds), never wipes other days, sentinel-level-safe.
- **my.** commit `499a36d` (bundle `main.a44b7002`, S3 `my.react2026` + CF `E2TAHYRIUSC1ZN`): `generateWorkoutLevels` now calls `fill-day-from-template`; dead category dropdown hidden for Levels. **Verified as the user** (impersonated Konstantinos-style test acct: empty day → Generate → fills with real Warm-Up/Mobility/Foundation Upper Body, other days intact).

## Customer emails SENT this session (5 — loop closed, cannot back-pedal)
| Case | Customer | Sent | Account action (verified) |
|---|---|---|---|
| 541 | Matt Smith msm0m_2000@yahoo.com | ✅ | paid-but-paywalled → restored current/stripe; **3-day** credit (→Sep 14) |
| 542 | Matthew Walker mwalker2k9@gmail.com (acct email is +10 alias) | ✅ | Generate-Workout bug fixed+verified; **1-month** credit (→Dec 23) |
| 534 | Konstantinos k.poutouroudis@gmail.com | ✅ | same bug; set current/stripe; **2-week** credit (→Sep 2) |
| 525 | Mark Berdelle mark.berdelle@gmail.com | ✅ | video NOT truncated (full 43.7min) → cache advice, **no credit** |
| 524 | Peter kariscomp@gmail.com | ✅ | honest "still working on it" (progression bug NOT fixed); **3-day** credit |

## NEXT SESSION — the explicit TODO (Gregg's instruction 2026-08-23)
**Go through ALL the Slack replies, ensure mails are sent, fix the issues, and test them as users.** Concretely:

1. **Audit every thread in `gymnstic-bodies-support`** — for each of Luke's escalations, confirm whether a customer email was actually SENT (support_emails.status='replied' + a row in support_replies), not just drafted in Slack. Only the 5 above were emailed. Everything below is drafted/held, NOT sent.

2. **Aug-14 batch — drafted in `slack-replies.md`, NOT posted to Slack, NOT emailed:** 513/522 Trevon (2wk credit), 523 Jason jstevens (credit 0 — video was fine), 517 keyadigital, 520/536 William (cancel), 521 Mac, 533 Gene (cancel), 544 Alexander (cancel). Post + send after re-verifying credits are right-sized.

3. **New escalations — plays drafted this session, NONE executed:**
   - **546 Jeremy Hallsey** — promised legacy $15/mo, charged $50 on Aug 12. Action: set sub to $15/mo + **REFUND $35** + reply. (financial — Gregg approve)
   - **549 Jason Camara** — "workouts not auto-increasing in difficulty" = progression bug (invalid_level_write). Diagnose + fix, then reply. No credit yet.
   - **Togger Akin toggerakin@pm.me** — membership VALID (annual thru Mar 2027); real issue is login/password-reset. Send fresh reset link (admin route now mints a real token) + reassure. Optional ~2wk credit for ~10-day lockout.
   - **Duncan funcan@gmail.com** — legacy-purchased access → **pricing HOLD** (Gregg call).
   - **Måns Magnusson monsun@me.com** — **NO Neon account** under that email → identity resolution (search name/phone +46707666779) before acting. HOLD.
   - **Ofir Hen ophhiir@gmail.com** — "PayPal?" → card-only now, send renewal link at legacy rate.

4. **Pricing/lifetime HOLDS — need Gregg's ONE policy decision** (honor lifetime for loyal heavy users vs blanket $15/mo): 405 Rafael ($15 promised), 374 Eric (annual-price confusion), 514, 516, 518, 519, 526/529/545, 527, 530, 532, 535, 543. This unblocks the biggest chunk.

5. **BUGS to actually fix + test as users (Gregg: "progress bug we will fix"):**
   - **Progression / auto-difficulty bug** — `workout.levels.invalid_level_write` rejects level writes so difficulty won't advance. Hits Peter (524), Jason Camara (549), Jason jstevens (523), and is the "progression reset" complaint. The Generate-Workout fix did NOT cover mastery/level auto-progression — separate path. Fix, then send Peter/Jason the real "it's fixed" reply.
   - **Thoracic Bridge video** — `KWnhXawG.mp4` is a **404** in Blob (was a JW playlist, no single file). Boyko (537) + George (512) HELD on this. Needs a real file sourced/created.
   - **Login / password-reset "something went wrong"** — Måns (no account) + watch for a reset-flow pattern.

6. **HELD for Gregg to run:** 528 erik.matthiessen account **delete** (backed up to `claudePlans/deleted-erik-matthiessen-2026-08-19.json`; agent does not hard-delete). Vega (jvega3682) — no account, identity resolution.

## Credits ledger (right-sized 2026-08-19/20, all live)
Matthew 1mo, Konstantinos 2wk, Matt Smith 3d, Trevon 2wk, Jason jstevens 0, Peter 3d, Mark 0. (Earlier over-sized amounts were reversed BEFORE any email went out — clean.) Boyko/George/keyadigital credits still to reconcile when Thoracic Bridge is fixed.

## Note for Next Session
See below — printed to chat.
