# WeekRepairsAndSupportTriage — 2026-08-05 → 2026-08-10

- **Session ID:** `5ca21ad3-8378-4ded-ae0f-ba2f54bbe309`
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/5ca21ad3-8378-4ded-ae0f-ba2f54bbe309.jsonl`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com` (+ `my.gymnasticbodies.com`, `claudeTools/` at the monorepo root)
- **Other dirs:** memory `~/.claude/projects/.../memory/`, scratchpad `/tmp/claude-1000/.../5ca21ad3-*/scratchpad` (EPHEMERAL — analysis scripts live here, durable artifacts went to `claudePlans/` and `claudeTools/`)
- **First user inputs:** "picking up from another session. Read 1 file" → "Okay" (start Defect D) → "Crazy stuff." → "What?" → "Why would you hold this?"
- **First command:** `Read sessions/PostCutoverSupportBlitz.md`

---

## The through-line

Picked up the four defects left by `PostCutoverSupportBlitz`, fixed three of them, ran the
37k provisioning backfill, worked the support inbox down, and then spent the back half
chasing a guided-week bug that is **still open** — see "Start here next session".

---

## Shipped (committed; two still unpushed)

| Commit | What |
|---|---|
| `09ecb9e` 08-06 | **Defect D pt.1** — program cards invented a default progression for every level; my. flattens all levels into one list, so a Foundation card showed 12 exercises instead of 3 |
| `bfdf572` 08-06 | **Defect C** — live member edits inherited the seeder's `seeded:true` flag, so re-seeds silently reverted members' own changes. Stripped in `writeWorkoutState`/`writeDayDoc` |
| `3335327` 08-07 | **Defect D pt.2** — collapse a card to the level the member is actually on (plan level, else most recently chosen progression). 7,117 doubled cards → 0 |
| `bd84542` 08-07 | **offer-subscription duplicate guard** — the one signup route `208c74a` missed. An offer campaign points thousands at it |
| `afb510b` 08-07 | admin extend-subscription falls back to `findActiveStripeSubByEmail`; **crediting documented in CLAUDE.md** |
| `bcc80b4` 08-07 | **UNPUSHED** — documents the unmatched-webhook bug |
| `34e3fab` 08-10 | **UNPUSHED** — normalise the level on schedule *writes*, not just reads |

**Uncommitted:** `app/admin/inbox/InboxClient.js` — status tabs/badges removed from the inbox
(owner: "just ignore status on inbox, it's entirely about case"). Lint-clean, **not browser-verified**
(couldn't authenticate to the admin API — better-auth signs its session tokens, a hand-inserted
`session` row won't validate).

## Data repairs (all live, all logged, all with backups in `claudePlans/`)

- **723** members' `workout_level` restored from AWS truth (`admin.level_repair`)
- **1,922** guided weeks rebuilt from `schedule_level_plans` (Aug 6)
- **1,111** guided weeks repaired by **per-day merge** (Aug 10) — 10,856 stray classes removed,
  1,344 days preserved, **0 days lost**. This finished the 1,386 the Aug 6 rebuild had to skip.
- **17 duplicate-email accounts merged** — survivor = the account they sign into; 2,947 logs and
  79 settings moved. Husks tombstoned, not deleted.
- **2 accounts deleted** (backed up): `lukesearra@gmail.com` (team member) and
  `tim.neumann5@gmail.com` (duplicate shell I created for a paying member)

## Provisioning — Phase 2 COMPLETE

**36,754 accounts created since Aug 6. 17,892 have a recovered password. Users total: 53,808.**
Plus the earlier support waves: 25 support writers + 1,059 data restores + 12 writer-identity links.
Password backfill recovered **93 from live Keap + 2 from the WP mirror**; base-wide credential-less
users went 401 → 306.

## Support

**64 open / 58 pending / 122 resolved.** By period: **45** since Aug 3, **69** Jul 3–Aug 2, **10** older.
**256 tickets still have no case** (2 recent, 100 prior month, 154 older) — the owner's rule is that
**ticket status is meaningless; the case is the unit of work**.

**64 emails sent** (every one shown as a full draft first — see the miss below):
`legacy_winback_2026-08-10` 50 · `tech_fix_2026-08-07` 9 · `entitlement_fix_2026-08-07` 4 ·
`cancel_apology_2026-08-10` 1.

Notable resolutions: David Cooney (paid 22 May, paywalled **77 days** because his live Stripe sub was
never linked to Neon — relinked, 4-month credit), Martin Shanks (same, paid before his Neon account
existed), Erik Hoftun, Simon Kitzinger, Tim Neumann, Laila Taouk (**never charged** — 9 failed
attempts on a card she cancelled after we ignored 4 cancellation requests).

---

## ⚠️ START HERE NEXT SESSION — schedule editing eats training days

**9 members have a week with fewer days than their AWS plan. All 9 share the same signature:**

| | |
|---|---|
| `seeded: false` | **the app wrote every one of these weeks** |
| updated Aug 6–10 | the window since members started using the app again |
| all are schedule editors | they are 9 of only **35** members who have edited a schedule at all |

So roughly **1 in 4 members who edit their schedule lose days.**

```
joona.noutere@gmail.com      [4,5,2,0,6,0]     vs AWS [3,4,1,3,4,1]   missing 4,6     levelId 10
mwalker2k9@gmail.com         [4,0,0,0,0,0,0]   vs AWS [1,4,1,1,4,1]   missing 2,3,4,6,7  levelId 1
hanschke1@web.de             [0,0,0,0,0,0]     vs AWS [3,4,3]         EVERYTHING GONE  levelId 2
michaeldauser@icloud.com     [3,0,0,0,3]       vs AWS [3,4,1,3,4,1]   missing 2,3,4,5,6  levelId 10
ramrodrig@hotmail.com        [3,4,1,2,4,0]     vs AWS [3,4,1,2,4,1]   missing 6        levelId 2
carlos.herrera1131@gmail.com [0,4,3,3,3,0,0]   vs AWS [3,4,3,3,3,3,3] missing 1,6,7    levelId 10
fvonheyden@gmail.com         [0,4,3,4,4,4,0]   vs AWS [4,4,3,4,4,4,4] missing 1,7      levelId 10
ehoftun@gmail.com            [0,0,0,0,0,0,0]   vs AWS [4,3,4,4,4]     EVERYTHING GONE  levelId 10
grigonis.donatas@gmail.com   [3,4,1,2,4,1,0]   vs AWS [3,4,1,2,4,1,3] missing 7        levelId 2
```

**Four of them wrote in:** Carlos (#471), fvonheyden (#492), Matthew Walker (#462),
Michael Dauser (#466). Erik Hoftun's case was closed for a different reason.

**levelId is 1, 2 AND 10** — so `34e3fab` (normalise the level on write) addresses one route in but
is **NOT the whole cause**. Members on a valid level are losing days too.

**PROVEN mechanism (fixed by `34e3fab`):** `readUserWeek` falls back to the level's template when a
member has no stored week. `levelSchedules` only has 1–4, so a sentinel level yields `{}` and the
next line persists an EMPTY week. Reproduced on a throwaway: `levelId 1` + clear day 3 →
`[3,4,0,3,4,1]`; `levelId 10` → `[0]`, six days destroyed. After the fix both give the correct week
and all six write ops preserve it.

**NEXT STEP (not done):** drive the actual edit flow — clear-day, add-workout, move-item — against a
mirrored account **on production**, reading `levels_schedule` after each operation to see which one
drops days. **There is no telemetry on any of the 8 schedule write ops**, which is why this is
undiagnosable after the fact; add it.

**Then repair the 9 from AWS truth.** Nothing has touched them.

---

## Also open

- **Unmatched-webhook bug** (documented in CLAUDE.md, unfixed): 81 `webhook.unmatched` events,
  26 of them `invoice.payment_succeeded` — payments we could not attach to a member. The log rows
  **carry no email**, so victims are only findable by walking live Stripe. Cooney and Shanks were two.
- **4 members whose AWS workout data never migrated:** `tombartels183`, `andreas.vanwyk`, `rsieg01`,
  `lesperance` — they have data in the export and 0 in Neon, and three of them wrote in asking where
  their courses went. They then received the $15 offer.
- **17 sentinel-level members**... actually **5,192** carry a sentinel `levelId` with a real
  `lastViewedLevel` 1–4. NOT a defect on its own (the areas are just screens a member swaps between)
  but it is the population exposed to the write-path bug.
- **256 uncased tickets** — the owner says much of the old material was handled outside this system;
  needs the Google Group checked via the Chrome extension before manufacturing cases.
- **Raymond Peralta** (task #1) — claims Amex charged $179.88 twice; no Stripe customer, no Auth.net
  record, no matching charge in that window. Needs his statement lines.
- Owner decisions: wall credits, Jin Wa's lifetime claim (task #6), John Fowlie's deletion request.

## Working rules reinforced this session

- **Feedback is not approval.** 40 win-back emails went out mid-conversation while the owner was
  still giving copy edits; they had never said send. Memory `feedback_approval_before_send` rewritten.
- **Don't assert a mechanism you haven't tested.** Wrong three times: "renewal wipes progress",
  "the freeze is a widespread bug" (it was the React dev server — production is clean), and calling
  723 members "victims dumped into BYO" when the areas are just screens.
- **`null < 0.8` is true in JS** — this made 290 failed video encodes look like successes and turned
  a 2.5 GB saving into a claimed 60 GB.
- **Verify with `ps` before saying a background job is running.** Claimed a killed job was dead when
  its child was still going, which caused two concurrent provisioning runs and a duplicate-key crash.

## Skills / tools / MCPs

Chrome MCP (browser testing, network + console capture), Neon via `@neondatabase/serverless`,
live Stripe SDK, SendGrid via `claudeTools/support.js`, `claudeTools/testSession.js` (browser
sessions for any member), `claudeTools/seedWorkoutData.js`, TaskCreate/TaskList.

## New tooling (all at `/var/www/Work/Gymfit/claudeTools/`, outside git — the monorepo root is not a repo)

- **`credit.js`** — the one way to credit a member. Asks live Stripe to decide: paywalled → push
  `renewaldate`; paying → push `trial_end`. Dry-runs by default, logs before/after.
- `provision-support-outreach-2026-08-06.js` · `resolve-writer-identities-2026-08-06.js`
- `merge-duplicate-accounts-2026-08-06.js` · `repair-level-override-2026-08-06.js`
- `repair-guided-week-2026-08-06.js` · **`repair-guided-week-perday-2026-08-10.js`**
- `audit-woo-expiry-2026-08-07.js` · `apology-credit-2026-08-06.js` + rollback
