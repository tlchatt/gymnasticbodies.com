# UNRESOLVED WORK — handoff from the support/billing session (2026-08-05)

Session: `e096772e-4611-495c-b1f7-506fd77fd795` (app.gymnasticbodies.com project dir).
Transcript: `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/e096772e-4611-495c-b1f7-506fd77fd795.jsonl`

This session ran **support, billing, and member-identity remediation** while a parallel session ran the
**AWS→Neon cutover** (workout seeding, course/levels routes, my. frontend). Read the OVERLAP section first.

---

## ⚠️ OVERLAP WITH THE PARALLEL SESSION — READ FIRST

**Confirmed collision (already happened, benign):** this session's agent BUILT
`lib/preventionEmails.js` + the Stripe-webhook extensions in the working tree and left them
uncommitted awaiting owner approval. The parallel session committed them anyway —
commit `5f562a6` "Commit lib/preventionEmails, which the Stripe webhook imports". **They are now
pushed and live.** Nothing was lost, but it means *uncommitted work in this repo is not safe from
the other session*; stage/commit deliberately or keep work outside the repo.

**Shared write surfaces — coordinate before touching:**
| Surface | This session wrote | Parallel session writes |
|---|---|---|
| Neon `user` / `user_setting` | created 520+ accounts (provisioning), billing repairs | workout seeding, paywall/cutover fields |
| Neon `user_logs` | none | 1.22M day-docs seeded |
| Neon `support_*` tables | ~40 cases, replies, ticket links | none observed |
| Stripe (live) | refunds, credits (`trial_end`), card detaches, dispute closes | none observed |
| `app.gymnasticbodies.com` working tree | prevention webhooks (now committed by them) | active development + commits |
| `my.gymnasticbodies.com` | none | active development + commits |

---

## 🔴 URGENT / OWNER DECISION NEEDED

### 1. Timothy Neumann — charged 4×, no access, demands a phone call
- **Identities:** `tim@par5performance.com` (Neon: current/stripe) AND `tim.neumann5@gmail.com` (no account). Phone **440-915-6219**.
- **Root cause:** TWO Stripe subscriptions on the same customer. We credited one (`sub_1ThZNxAhvJ5jyCLHcNZeyf19`, trial→Nov 12) and **never noticed the duplicate** (`sub_1TecMZAhvJ5jyCLHH41dXDSo`).
- **Charges:** Jun 4 ($50), Jun 12 ($50), Jul 12 ($50), **Aug 4 ($50 — the day before this note)** = **$200**.
- **He also can't use the product** — he is one of the 13 course-wall victims (below).
- **RECOMMENDED, NOT DONE:** refund all 4 charges ($200); verify the duplicate sub can never bill again; **phone call** (he asked twice; owner/Luke, not automated). Do not promise "it works now" until the course wall is down.
- Tickets: #186, #391 (gmail identity), #301 (par5 identity).

### 2. Course wall — 13 PAYING members blocked from classic courses
- **Mechanism (verified, memory `project_course_wall_two_rails`):** `my.` tries AWS/Keap auth first, falls back to Neon. On the OLD rail, `CourseLibrary` asks the AWS course-library endpoint; when AWS answers the literal string `"YOU AREN'T ENROLLED IN THIS COURSE."` the code **deliberately skips its local/Neon fallback** and shows the OhNoModal ("go subscribe"). AWS has no record of Stripe-era memberships → paying members told to subscribe.
- **Requires BOTH:** working legacy Keap password (→ old rail) AND entitlement only in Stripe/Neon. **Neither canonical test account reproduces it** (`claudePlans/test-users.json` documents why).
- **Scope:** only the legacy classics — **Foundation 1–4, Handstand 1–3, Stretch (SMS/SFS/STB)**. Modern courses (Rings, Elements, Movement, Fundamentals, Restore, FI) fall back gracefully and work.
- **Two code sites** in `my.gymnasticbodies.com/src/Containers/CourseLibrary/index.jsx` (~line 3549 and ~line 23484) — a fix must touch BOTH.
- **Decision pending:** 3-line interim patch (if our records say current → use the existing local fallback instead of the popup) **vs.** wait for the AWS cutover to retire the rail. Owner leaned toward the cutover; the parallel session owns it.
- **The 13 (current/paying, confirmed walled since Jul 20):** willy23sd@yahoo.com, mikaelwessel@gmail.com, ollebull.wedenmark@gmail.com, rcbyrd@gmail.com, mingxuanqu@qq.com, mtung@isg.la, jeremy.demaria1@gmail.com, jan.dochnal@gmx.de, janika.leoste@gmail.com, s.kitzinger@protonmail.com, huemack@hotmail.com, journey2gainz@gmail.com, fredrik.ake.johansson@gmail.com  (+ tim@par5performance.com above).
- **Owed:** "fixed + credit" email once the wall is actually down. 10 wrote in (reply on their tickets), 3 silent (outbound). **5 already hold goodwill credits** from the Jul 28 wipe-victim round — owner decision on whether to stack another credit (standing policy `feedback_generous_credit_policy` says be generous).
- Telemetry only starts **2026-07-24**; the bug has existed since **2026-05-22** (first Stripe entitlement). May–July victims are invisible unless they wrote in.

### 3. Legacy $15 offer email — 21 recipients, DRAFTED AND APPROVED-PENDING, NOT SENT
- List: `/tmp/claude-1000/.../scratchpad/offer-send-list.json` (regenerate with `scratchpad/offer-send-list.js` — it recomputes from telemetry).
- Recipients = lapsed members confirmed hitting the wall, minus those already emailed Aug 3, minus current members.
- **Eligibility gate is by design:** `app/api/offer/[slug]/eligibility/route.js` only unlocks the offer for emails that have an `outbound_emails` row for that campaign — so the link works *because* we send it. Current members are correctly refused.
- **Owner asked to sequence this around the upcoming PAYWALL INTENSITY CHANGE** (landing the offer just before/with the tightening turns a lockout into a way in). Draft copy is in the transcript ("A new Gymnastic Bodies platform, and a legacy member rate").

### 4. 11 walled members with NO Neon account — offer would reject them
james@jamesryan.dev, andandyak@gmail.com, wwwsnipes@yahoo.com, xavier.bernardy@gmail.com, kevin.marcotte@gmail.com, timo_kumpumäki@hotmail.com, mguerrerolao@gmail.com, ole_j_jorgensen@hotmail.com, a.sillars@hotmail.co.uk, lch.wong.nz@gmail.com, schollierg@gmail.com — provision (pattern in `scratchpad/provision-cohort.js`) before including them in any offer send.

---

## 🟡 BUILT / DONE-BUT-UNFINISHED

### 5. Prevention webhook batch — CODE IS LIVE, dashboard steps NOT done
Committed by the parallel session (`5f562a6`) and pushed. Handlers: `charge.dispute.created`
(auto-detach cards + high-priority case + alert), `invoice.payment_failed` (member email, once per
invoice), `invoice.upcoming` (renewal reminders), `radar.early_fraud_warning.created`,
`trial.converted` telemetry. **Owner must still do the Stripe dashboard steps** (they are listed in
`claudePlans/prevention-webhook-batch-2026-08-03.md`): add the 3 events to the webhook endpoint, set
the upcoming-invoice lookahead to ~30 days, enable trial-ending emails. **HARD DEADLINE: before
Oct 28**, when the goodwill credits start resuming billing (Task #3).

### 6. Video optimization — RUNNING, unfinished
- Background job (`runner2`) transcodes oversized Blob videos to `{id}_web.mp4`. **Originals are never touched.**
- Progress at handoff: **649 ledger entries**, still running, biggest-first so the heavy files are done.
- Ledger: `claudePlans/video-optimization-ledger-2026-08-03.jsonl` · inventory: `claudePlans/blob-video-inventory-2026-08-03.json`.
- Triage rules (my calibration, not the owner's): >40MB enters the queue; ≤~3 Mbps + index-at-front = already fine, skip; index-at-back = fast remux; >~3.5 Mbps or >1920px = full re-encode with the owner's recipe + `-movflags +faststart`.
- **STILL NEEDED:** (a) a serving-side change so players prefer `_web.mp4` when it exists — **not written**; (b) honest re-look at the stall complaints: the named "stall generator" files turned out already well-encoded, and the `my.video.stalled` counter fires on ordinary buffering, so it **overcounts**; likely client bandwidth/player behavior, not encoding.

### 7. Legacy cohort phase 2 — accounts DONE, campaign NOT SENT
- **488 accounts provisioned** 2026-08-03 (+ 33 writers on Jul 31, + Greg Griffin & Joseph Prado manually, + 2 stragglers). Audit list: `claudePlans/legacy-bulk-provision-2026-08-03.json`.
- **486 got real Keap passwords**; **2 could not** and need a reset at cutover: `caleb.ec.kuo@gmail.com`, `honeycutt.james@gmail.com`.
- The **proactive** "app fixed + $15 offer" email to these ~490 has **not been sent** (Task #5). The 33 writers WERE emailed Aug 3.

### 8. Identity cleanup — analysis done, decisions open
- **Dual-identity members found** (write from one address, log in with another): Alexander Shkarupa (sibaynorilsk↔sibay@comcast.net, case #417), Jin Wa (jywa@me.com↔jin@jwacro.com, case #401), Karla (avidfilmeditor↔karla_gmrs, case #407), Claire Guillemet (guillemet.chp↔chpgu@kth.se, case #430), Brian Wilcoxon (brwilcoxon↔goodland11@msn.com, case #431).
- **Jin Wa claims LIFETIME ACCESS — needs an owner ruling before any offer email reaches her.**
- **17 dual-casing collision pairs** analysed, **nothing merged**: `claudePlans/collision-pairs-analysis-2026-08-03.md`. 10 = merge keeping the legacy row, 1 true two-sided merge (Udo Boehm), 2 both-current (paywall risk — Guillaume Kaminer, Duygu Haug), 1 safe husk delete, others minor. All await decisions.

---

## 🟢 COMPLETED THIS SESSION (context, do not redo)
- **Login-resync wipe bug** fixed + deployed (`206455c`): `registerWPass` no longer overwrites existing members from legacy Auth.net data. 21 victims repaired, +3-month credits, 25 emails sent.
- **Case-insensitive email lookups** deployed (`cb1ca0d`) + 2,036 mixed-case emails normalized (`claudePlans/email-normalization-2026-07-31.json`; 17 collisions excluded).
- **Gmail sync fixed** (`9c1d928`) — the hourly cron had never run (GET vs POST); query widened to catch direct + spam-filed mail. Verified firing hourly.
- **Reopen-on-reply** shipped (`f7bac61`) — member replies to resolved cases flip them to "Reopened (replied)".
- **Chargeback response:** never-rebill policy applied (all 5 disputers' cards detached, verified zero remaining); bettspr's 2 disputes accepted + documented (case #378); Steven/Madalyn/Carlos cased; dispute records stamped on every member's case.
- **Support-mail recovery:** 77 messages ingested from the owner's personal mailbox; ~40 cases created/linked.
- Matthew Walker dispute reply sent (no-contest + optional withdrawal); Dimitri refunded $75; Aaron & bettspr given free windows; Ben Moore's login fixed + 2 free months.

---

## 📋 STANDING TASK LIST (survives sessions)
1. **Aug 20** — Matthew Walker (mwalker2k9@gmail.com, case #63): if no reply, formally accept dispute `du_1Tu2CjAhvJ5jyCLHyCkIR0dU` before the **Aug 25** evidence deadline.
2. **Early Sep** — check Aaron Blake (Sep 2) and bettspr (Aug 30) free-window outcomes: did they add a card or lapse cleanly, and did any dispute appear? Ben Moore's $15 resumes Oct 1.
3. **BEFORE Oct 28** — prevention batch dashboard steps (§5); 21 credited members resume billing Oct 28–Dec 9.
4. **Nov–Dec** — verify resumed billing lands cleanly; recompute the dispute rate (was **4.7%** in July, 5× Visa's 0.9% threshold; target <0.9%).
5. **Phase 2 campaign** (§7) + the 11 unprovisioned walled members (§4).

## 🔑 KEY REFERENCE FILES
- `claudePlans/test-users.json` — canonical test accounts + **why neither reproduces the course wall**
- `claudePlans/legacy-bulk-provision-2026-08-03.json` · `claudePlans/email-normalization-2026-07-31.json`
- `claudePlans/collision-pairs-analysis-2026-08-03.md` · `claudePlans/prevention-webhook-batch-2026-08-03.md`
- `claudePlans/video-optimization-ledger-2026-08-03.jsonl` · `claudePlans/blob-video-inventory-2026-08-03.json`
- `claudeTools/keap_migration_ledger.jsonl` — per-user password source (**the reliable "rides the old rail" signal**)
- Memory: `project_course_wall_two_rails`, `feedback_generous_credit_policy`, `project_credit_monitoring`, `feedback_approval_before_send`, `project_paywall_not_enforced`

## ✋ WORKING RULES CARRIED FORWARD
- **Never send email without showing the full draft and getting explicit approval** — even after edits.
- **Credit generously** when we cause harm — clearly MORE than the harm period.
- **Never re-bill a disputer**; their cards stay detached and they re-add payment themselves.
- Originals (videos, secrets, `.env.local`) are never modified in place.
- Owner deploys to production via git; do not run `vercel --prod`.
