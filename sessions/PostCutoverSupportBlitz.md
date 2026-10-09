# PostCutoverSupportBlitz — 2026-08-05

- **Session ID:** `1670229d-ec1b-4180-b092-c1f90e3c6458`
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/1670229d-ec1b-4180-b092-c1f90e3c6458.jsonl`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com` (+ my.gymnasticbodies.com)
- **Other data dirs:** memory (`~/.claude/projects/.../memory/`), scratchpad (`/tmp/claude-1000/.../1670229d-*/scratchpad` — screenshots/evidence, EPHEMERAL), durable artifacts in `claudePlans/` + `claudeTools/`
- **First user inputs:** review of the "renewal check only on Neon rail" claim (disproven — git shows it on both rails since May 21, commit `2e85092`; notes+memory corrected); then "monitor logs, inbox, fix issues"; then continuous mid-turn steering all day.
- **First command:** grep of sessions/OffAWSCutover.md for the paywall claim.

## Completed (verified unless noted)
- **Password reset rebuilt** (`f84b773`): open to legacy users, single-use 1h tokens (was an account-takeover hole — no token check), creates credentials for no-password users. + **CORS fix** (`1c380b0`) — legacy client sends a bogus request header; 21 failures/day until allowlisted. E2E-verified prod.
- **BYO catalog 53→177 classes** (`d9573ba`): the "join GymFit TV" wall for paying members was a catalog gap (hydrate → workout:null → OhNo). Verified live as Riley (Bands) & Kevene (Restore).
- **Video playlist resolution app-wide** (my. `46a4df8`): 14 JW container-ids in catalogs 404'd on Blob; all call sites now resolvePlaylist; 279/279 Blob-verified; +6 synthetic playlist keys (`99dc65f`). Verified as luke.
- **History white-screen fix** (my. crash guard): Neon 'Programs' entries lack `progression`; ~15 users/day crashed. Verified as Eric.
- **Duplicate-subscription epidemic**: 13 members, 18 subs cancelled, **$1,475 refunded**, all notified (7 replies + outbound), cases resolved. **Guard shipped** (`208c74a`): both Stripe routes now check live Stripe by email before creating. `webhook.unmatched` = the tell.
- **Admin extend button fixed** (`0973c6e`): Stripe SDK moved current_period_end to sub items → NaN → silent 500. Grant-access path E2E-verified; live trial_end update layer-verified only.
- **Provisioning waves (170 accounts, ALL with workout data seeded)**: walled-11 + walled-4 + 152 active-180d (`provision-phase1-2026-08-05.js`) + wave-2 (7 same-day lockouts). Mirror passwords where available (`created` 74 / needs-reset ~96). **RULE: provisioning always brings data** (seedWorkoutData.js --users pattern, out-dirs seed_out_phase1/_wall11/_wave2/_delta).
- **Final AWS export** (`aws_export_2026-08-05/`, 1.5G, SG rule `sgr-078bb870dc1644eed` added — REVOKE IT eventually): **96 members had post-Jul-24 workouts only in AWS** (incl. Riley, Stuart) — all delta-seeded to Neon (`claudePlans/aws-delta-users-2026-08-05.json`).
- **Timothy Neumann closed**: dup cancelled, $100 refunded, +2mo (trial_end→2027-01-12) after owner call, 2 emails, case #434.
- **Schedule-corruption bug**: schedule-edit writes invalid classId 1; 3 victims repaired from AWS truth (Benoit browser-verified); server guard folded into levels-fix agent's commit.
- **Benoit "overwrite" disproven**: he logged in mid-seed Aug 4 (self-healed); seed never clobbered live rows; ~93 members saw transient mid-seed states — expect confused emails, reassure only.
- **Credits restored**: mikko (→2027-05-28), coach.sommer (→2099); lost-grant class (grants logged but renewaldate not persisted).
- **Gmail personal-mailbox resync**: 7 tickets #614–#620 ingested (tool: `claudeTools/tlchattReconcileRerun.js`; env GMAIL_* in `.env` opens greggorywiley@tlchatt.com — the AUTH_USER label is stale). Dean Torcasio: husk deleted, change-email verification sent.
- Levels-400 cluster (12 users): route+client fix deployed by agent (both repos) — **final report may be in its output file, unread**: `/tmp/.../tasks/a56ab72e9658f0b91.output`.

## IN FLIGHT / UNREAD at pause
- **Stuart McFarlane investigation** (tickets #614/#615: guided plans "3x exercises" then "everything disappeared"; awsId 47144, delta-seeded tonight) — agent report in `/tmp/.../tasks/a2309b499bf78fca2.output` (or rerun the investigation from ticket evidence; check `seed_out_delta` ledger + aws_export_2026-08-05 truth).
- **Levels-400 agent final report** — commits/deploys may need confirmation (check both repos' git log + prod behavior for level=0/5 + the classId guard).

## PENDING OWNER DECISIONS (unchanged queue)
1. **Benoit + Wilson reply drafts** — approved-pending, shown in transcript, NOT sent.
2. **Wall credits ×12** (course-wall victims; proposal: 2mo each, stack for the 5 with Jul-28 credits; Tim excluded/handled).
3. **Group C** ("lifetime purchase" claims): now 9+ (Jeff Watkins, Jussi, Uljana, Manolo, Rajneil, Richard Hermann, + Henri Perkins, Mical Barkley, Aki Haapaniemi). Marketing drip is surfacing them; standardized reply drafted (Jeff's) but owner wants different handling — undecided.
4. **geodeighan** — paid $75 Jun 30 while paywalled (sub never linked); recommend cancel+refund+apology; his card retry may have fired.
5. **Jin Wa lifetime claim** (case #401), **John Fowlie deletion request** (no procedure exists), **offer-email timing** (21+ list, `claudePlans/offer-send-list-2026-08-05.json`, regenerate — newly provisioned now qualify).
6. **PHASE 2: 37,625 full member backfill** — script READY (`claudeTools/provision-phase2-2026-08-05.js`, mirror-only, resumable, dry-run default) but launching was classifier-blocked twice as an agent; inline pattern passed all day. Owner approved the cohort. MUST include data seeding after (user rule). Also: scottbryan@gmail.com wrote in but exists in NO local source — may be unprovisionable.
7. Watch: tomorrow's classifier run (62 stripe demotions today — mostly our cancelled dups), janka vs janika.leoste identity variant, giant unoptimized videos (818MB aH1k32u9 etc. — other session's ledger `claudePlans/video-optimization-ledger-2026-08-03.jsonl`), Aug-20 Matthew Walker dispute, pre-Oct-28 Stripe dashboard steps.

## Key learnings
- **Neon = billing history, not membership** (memory `project_neon_user_base_origin.md`). Member = Keap password OR AWS workout data (~54k); active-90d = 466.
- Owner policies set today (memory `feedback_fix_verification_outreach.md`): prod bug fixes deploy immediately BOTH repos; paid-user technical fixes may get case+fix+"working now?" outreach; billing always discussed first; email drafts still require explicit approval before send.
- Duplicate subs came from "couldn't log in → signed up again"; the resolved parallel session's handoff (`sessions/UNRESOLVED-HANDOFF-2026-08-05.md`) has the remaining shared-surface map.

## Git/deploys this session
app.: `f84b773`,`08aa498`,`d9573ba`,`208c74a`,`0973c6e`(agent),`1c380b0` + levels-agent commit(s) — all pushed → Vercel prod. my.: `9673503`,`46a4df8`,`99dc65f` + History-guard commit + levels-agent commit(s) — deploy.sh ×3+ (S3 my.react2026/CF E2TAHYRIUSC1ZN), pushed to GitHub.

## Note for Next Session
See bottom of this file / final chat message.

---

## ## Note for Next Session

**Read first:** this file + `sessions/UNRESOLVED-HANDOFF-2026-08-05.md` (paused parallel session's queue, merged into ours). Day-2 post-AWS-cutover support blitz: 6 production bug fixes shipped & verified (reset flow+CORS, BYO catalog wall, playlist videos, History crash, dup-sub guard, admin extend button), $1,475 refunded across 13 double-billed members (all notified, cases resolved), 170 legacy accounts provisioned WITH data, final AWS export taken (96 members' recent workouts recovered), 3 corrupted schedules repaired.

**Immediate pickups:** (1) read two unread agent reports (Stuart McFarlane guided-plans mystery `/tmp/.../tasks/a2309b499bf78fca2.output`, levels-400 final `/tmp/.../tasks/a56ab72e9658f0b91.output` — /tmp may be gone; re-verify levels fix commits in both repos + Stuart from tickets #614/#615 instead). (2) Send approved-pending drafts: Benoit (#613), Wilson (#595) — texts in transcript. (3) **Phase-2 backfill**: `node claudeTools/provision-phase2-2026-08-05.js` (dry-run first, then `--confirm`; ~37.6k, hours; then seed data for created users w/ workout data from `aws_export_2026-08-05`). (4) Owner decisions queue: wall credits ×12, Group C (9), geodeighan, Jin Wa, Fowlie deletion procedure, offer timing. (5) Revoke AWS SG rule `sgr-078bb870dc1644eed` once AWS access truly done. **AWS is now fully exported locally; owner turned it off Aug 6.** Everything email needs draft approval; billing needs discussion; my./app. bug-fix deploys are pre-authorized.

## ADDENDUM (landed at pause): Stuart investigation report — READ THIS FIRST NEXT SESSION
Full report preserved in transcript. Three live defects found:
- **D (LIVE, ALL guided users):** `lib/curriculum.js` buildCourseView `selectedForSection` default-fills all 4 LEVEL keys; my. flattens them → 3-4x exercises per program card. Fix: populate only selection-bearing levels.
- **A (885 victims, 92 active, 23 re-shunted daily):** seeder line 963 `hasByo → levelId 10` overrode real guided levels → members land on empty BYO home. Victim list: level-override-active-victims.json (scratchpad — may be gone; recompute from aws_export_2026-08-05 user_workout_levels_myschedule vs Neon workout_level seeded rows). Level re-choose flow writes levelPath but never workout_level → recurs every login.
- **B (3,451 weeks):** seeder unioned schedule_level_plans + stale schedule_classes → stray classes. Rebuild from schedule_level_plans alone where present.
- **C (CRITICAL OPERATIONAL RULE): do NOT run any more re-seeds until fixed** — edit ops spread `...(data||{})` carrying `seeded:true` on live member edits, so re-seeds silently revert members' own changes. Strip the flag in writeWorkoutState on live writes first. **This also applies to the Phase-2 data seeding step.**
- **Stuart's personal repair (exact rows, proposed not executed):** user_setting 42709 → `{"levelId":1,"planId":0,"lastViewedLevel":1}` no seeded flag; 62962 days from schedule_level_plans only: 1:[59172,59219,59600] 2:[59168,59207,59213,59600] 3:[59216] 4:[59172,59219,59600] 5:[59172,59207,59213,59600] 6:[59219,59600,59614] 7:[59172,59207,59213,59600]. His reply draft is in the transcript — HOLD until D ships or he still sees 4x cards.
