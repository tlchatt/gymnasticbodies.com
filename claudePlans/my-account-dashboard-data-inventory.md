# My Account Dashboard — Member Data Inventory & Design Proposal

**Scope:** Read-only inventory of member data now in Neon (shared by `app.gymnasticbodies.com` + `my.gymnasticbodies.com`), and a design proposal for modular, conditionally-rendered sections on the `/accountDetails` My Account page. No code was changed. All counts are live DB reads (2026-07-24).

**How to connect (for the implementer):** load `DATABASE_URL` from `/var/www/Work/Gymfit/app.gymnasticbodies.com/.env.local`, `neon()` from `@neondatabase/serverless` (resolve modules from `app.gymnasticbodies.com/node_modules`). `user_logs.data`/`progressions` are Postgres `json` (already parsed objects). `user_setting.data` is **TEXT** — `JSON.parse` it (no `->>`).

---

## 0. Where each data type lives (the map)

| Dashboard data type | Storage | Key | Populated (users) |
|---|---|---|---|
| **Workout history (Guided Plans)** | `user_logs` `section='levels'` — `data` = array of day's schedule items w/ `isLogged` | `(user_id, section, user_schedule_date)` | **668 rows / 158 users** |
| **Workout history (rolled-up)** | `user_logs` `section='history'` — `data.entries[]` = per-day course log entries | same | 61 rows / **8 users** |
| **White Board / AutoPilot logs** | `user_logs` `section='autopilot'` — `data.exercises[]` | same | 71 rows / **2 users** |
| **Build Your Own (BYO) logs** | `user_logs` `section='byo'` — `data.items[]` | same | 62 rows / **14 users** |
| **Nutrition / Thrive — daily tasks + measurements** | `user_logs` `section='thrive'` — `data.tasks[]`, `data.measurement` | same | 1 row / **1 user** |
| **Nutrition / Thrive — body profile** | `user_setting` `type='thrive_profile'` — weight/height/units + before/current photos | `user_id` | **1 user** |
| **Nutrition / Thrive — task permissions** | `user_setting` `type='thrive_state'` — `permissions[]` | `user_id` | **8 users** |
| **Thrive Nutrition (was purchased)** | `user_setting` `type='purchase'` — `productName` incl "Thrive Nutrition" | `user_id` | **10** purchase rows |
| **Levels / progression (legacy)** | `user_setting` `type='levelPath'` — `{workoutOrPlanId, leveld}` | `user_id` | **203 rows / 202 users** |
| **Levels / progression (migration)** | `user_setting` `type='workout_level'` — `{levelId, planId, lastViewedLevel}` | `user_id` | **1 user** |
| **Preferences — BYO progression picks** | `user_setting` `type='byo_settings'` — `{exercises:{exId:{masterySetId,date}}}` | `user_id` | **7 users** |
| **Preferences — BYO favorites** | `user_setting` `type='byo_favorites'` — `{favorites:[]}` | `user_id` | 2 users |
| **Preferences — AutoPilot level/favorites** | `user_setting` `type='autopilot_state'` — `{level, favorites:[]}` | `user_id` | 2 users |
| **Profile / subscription core** | `user_setting` `type='subscription'` — status/renewaldate/term/phone/country/name/email | `user_id` | **15,994 (all)** |
| **Support inbound history** | `support_emails` (+ `support_cases` join) | `user_id` **or** `from_email` | **345 emails / 173 users**, 99 cases / 82 users |
| **Outbound emails sent to them** | `outbound_emails` | `user_id` **or** `to_email` | **8,156 / 2,626 users** |

**Headline reality for the dashboard design:** the AWS→Neon workout migration is **lazy / on-demand**, not a bulk backfill. Sections `autopilot` (2), `byo` (14), `history` (8), `thrive` (1) are seeded only for a handful of users (mostly test accounts). The one section with broad, organic real-member data is **`levels`** (158 users). **Every section must render only when its own data is non-empty** — for the vast majority of members most workout sections will be blank today and fill in over time.

---

## 1. `user_logs.section` — counts, shapes, date semantics

Schema: `Drizzle/db/schema.ts:67-87`. Section column doc: `schema.ts:71-74`.

### Row counts (all users)
| section | rows | distinct users |
|---|---|---|
| `levels` | 668 | 158 |
| `autopilot` | 71 | 2 |
| `byo` | 62 | 14 |
| `history` | 61 | 8 |
| `thrive` | 1 | 1 |

### `user_schedule_date` vs `created_at` — VERIFIED, and they differ per section
This is the most important gotcha. Two different regimes:

- **`levels` (organic, pre-migration):** `created_at` is **distinct per row** (668 distinct timestamps spanning **2026-01-04 → 2026-07-24**) — it is the real write/log time. `user_schedule_date` is a **non-ISO display string** — **643 rows non-ISO** ("Friday, July 24", "Monday, July 20"; no year) vs only **25 rows ISO**. So for `levels`, **use `created_at` as the time axis**; `user_schedule_date` is unreliable (unparseable, year-ambiguous).
- **`autopilot` / `byo` / `history` / `thrive` (migration-seeded):** `created_at` is a **bulk import timestamp** (all `2026-07-22`+; e.g. autopilot has 9 distinct timestamps for 71 rows). `user_schedule_date` is a clean **ISO `YYYY-MM-DD`** and is the **real activity date** (ranges back to `2022-09-07`). So for these, **use `user_schedule_date` as the time axis**, never `created_at`.

Confirmed in `lib/workout.js`: ISO date helpers (`isValidIsoDate` `workout.js:41`, `isoToDayKey` `workout.js:52`) and the range read `readDocsInRange` (`workout.js:158-165`) all key off `user_schedule_date` for the migration sections; the unique index is `(user_id, section, user_schedule_date)` (`schema.ts:86`).

### Real `data` shapes (one live example each)

**`levels`** (id 4500, sched `"Friday, July 24"`) — `data` is an **array** of the day's schedule items; `progressions` = `{}` (unused). Two item types:
```jsonc
[
  { "scheduleId":518531, "classId":59600, "type":"Class", "dayIndex":5,
    "workout": { "className":"7 Minute Warm-Up", "trainingType":"Warm-Up",
      "mediaId":"jTRUtQhq.json?...", "image":"330x220-7min.jpg",
      "description":"...", "isLogged":true } },
  { "scheduleId":518533, "classId":59207, "type":"Program", "dayIndex":5,
    "workout": { "LEVEL 1": { "Front Lever":[{ "exerciseId":1,
      "name":"Bent Hollow Body Hold", "group":"Foundation Core",
      "exerciseNotation":"A1", "stepNo":2, "masterySteps":{...} }] } } }
]
```
`isLogged` lives at `item.workout.isLogged` for Class items (Program items carry logged state in nested `programProgress`). To count "logged workouts" per day: count items where `item.isLogged ?? item.workout.isLogged` is truthy (matches `loggedClassIds` in `app/api/user/workout/levels/route.js:29-39`).

**`autopilot`** (id 4330, sched `2026-07-25`):
```json
{ "seeded":false, "rounds":3, "isLogged":false, "favoriteId":1,
  "exercises":[ {"slotId":1,"autoPilotExerciseId":55,"rounds":3,"isLogged":false,"secsOrReps":"5r"}, ... ] }
```
Shape doc: `app/api/user/workout/autopilot/route.js:1-11`; hydrate `lib/workout.js:91-107`.

**`byo`** (id 4515, sched `2026-07-24`):
```json
{ "seeded":false, "favoriteId":null, "items":[ {"slotId":1,"id":59176,"orderingType":1,"isLogged":true} ] }
```
Program items also carry `programProgress.exercises[]`. Shape doc: `app/api/user/workout/byo/route.js:5-11`.

**`history`** (id 4517, sched `2026-07-24`) — the cleanest single "what did I train" log:
```json
{ "entries":[ {"courseName":"Extended Warmup","courseIcon":"330x220-ExtendedWU.jpg","type":"Class","level":"","source":"byo-class","refId":59176} ] }
```
`type` ∈ `Class` | `Programs` | `Exercise`. Response strips `source`/`refId` (`app/api/user/workout/history/route.js:29-31`). GET is by year+month → `{ "YYYY-MM-DD":[entry,...] }` (`history/route.js:13-33`). Write-through helpers: `lib/workout.js:178-200`. **Note (parity):** AutoPilot logging intentionally does NOT write history (`lib/workout.js:176`), so `history` ≈ Guided-Plans/BYO class & program activity only.

**`thrive`** (id 4141, sched `2026-07-03`) — nutrition daily doc:
```json
{ "tasks":[], "measurement":{"weight":152,"height1":5,"height2":5,"units":0,"date":"2026-07-03"}, "seeded":true }
```
`tasks[]` = `{taskId, complete}` completions; optional `measurement`. Shape doc: `app/api/user/workout/thrive/route.js:6-8`.

**Which are workout history vs nutrition:** workout history = `levels` + `history` + `byo` + `autopilot`. Nutrition = `thrive` only.

---

## 2. Nutrition / "Thrive" — where it lives

Nutrition ("Thrive"; the user's "drive nutrition" = Thrive) spans **three** stores, all keyed by `user_id`:

1. **`user_logs` `section='thrive'`** — per-day `{tasks:[{taskId,complete}], measurement:{weight,height1,height2,units,date}}`. Daily task completion + body measurements. (1 row / 1 user today.)
2. **`user_setting` `type='thrive_profile'`** — body profile + progress photos:
   `{"weight":152,"height1":5,"height2":5,"units":0,"seeded":true}` (also `beforeImg`/`beforeImgDate`/`currentImg`/`currentImgDate` Blob URLs when set). Read at `app/api/user/workout/thrive/route.js:96-108`. (1 user.)
3. **`user_setting` `type='thrive_state'`** — task permission grants (which nutrition lessons/tasks are unlocked, with `validFrom` dates):
   `{"permissions":[{"taskId":20,"validFrom":"2026-07-24"}, ...]}`. Read at `thrive/route.js:44-48`, `80-93`. (8 users.)

Static task/lesson catalog: `data/workout/thriveTasks.json` (`thrive/route.js:29`). The `/api/user/workout/standing` route reports `isThriveUser` from whether `thrive_state.permissions` is non-empty (`app/api/user/workout/standing/route.js:36`).

**Separately:** `user_setting` `type='purchase'` rows record who *bought* Thrive Nutrition as a one-time product (e.g. `{"productName":"Thrive Nutrition","payment_method":"paypal","price":"99.99",...}`). **10** such purchase rows mention "Thrive". This is entitlement/billing, not tracked nutrition data.

---

## 3. Levels & preferences — `user_setting.type` catalog

Full list of `user_setting.type` values in the DB (with what each `data` holds; `data` is TEXT-JSON):

| type | rows | users | `data` shape (real example) | Meaning |
|---|---|---|---|---|
| `subscription` | 15,994 | 15,994 | `{status, renewaldate, startdate, term, phone, country, email, first_name, last_name, price, authorizeCustomer, authorizeSubscription}` | Core profile + subscription state (one per user). Profile edit writes `data.phone`/`data.country` here. |
| `purchase` | 334 | 334 | `{purchase:true, status, payment_method, productName, price, startdate, term, ...}` | One-time WooCommerce/PayPal product buys (incl "Thrive Nutrition"). |
| `levelPath` | 203 | 202 | `{"workoutOrPlanId":0,"leveld":1}` (note misspelled `leveld`) | **Legacy** current level/plan pointer — the broadly-populated one. |
| `thrive_state` | 8 | 8 | `{permissions:[{taskId,validFrom}]}` | Thrive task unlocks. |
| `byo_settings` | 7 | 7 | `{exercises:{"1":{masterySetId:87,date:"2026-07-24"}}}` | BYO per-exercise progression picks (preferences). |
| `autopilot_state` | 2 | 2 | `{level:2, favorites:[]}` | White Board level + favorites (preferences). |
| `byo_favorites` | 2 | 2 | `{favorites:[]}` | BYO saved favorite days (preferences). |
| `thrive_profile` | 1 | 1 | `{weight,height1,height2,units,beforeImg?,currentImg?}` | Thrive body profile. |
| `workout_level` | 1 | 1 | `{levelId:10, planId:1, lastViewedLevel:2, seeded:true}` | **Migration** level store — new source of truth. |

**Where "current level / standing" comes from:** `app/api/user/workout/standing/route.js` reads `workout_level` (levelId → name via `LEVEL_NAMES`, `standing/route.js:16-19,32-38`), `thrive_state` (isThriveUser), `autopilot_state` (apLevel). `LEVEL_NAMES`: `0 Beginner, 1 Intermediate One, 2 Intermediate Two, 3 Advanced One, 4 Advanced Two, 9 White Board, 10 Build Your Own`. The **legacy** analogue is `levelPath` (`leveld` field) — read this as a fallback since `workout_level` is only seeded for 1 user while `levelPath` covers 202. Curriculum/progression hydration (per-discipline levels → sections → selected progression, with logged state overlaid) is in `lib/curriculum.js` (`buildCourseView` `curriculum.js:80-94`; `PROGRAM_IDS` = Core/Upper Body/Lower Body/Handstand/Movement/Rings, `curriculum.js:12`).

**"Preferences"** for a dashboard section = the workout-config typed rows: `workout_level`/`levelPath` (chosen level + plan), `autopilot_state.level`, `byo_settings.exercises` (selected progression difficulty per exercise), `byo_favorites`, `thrive_profile.units`. Plus `subscription.data` `phone`/`country` (already the Profile section).

---

## 4. Support & email history

`fetchUserSupportHistory(userId)` already exists: `lib/userHelpers.js:5-28` — joins `support_emails` → `support_cases`, `WHERE support_emails.user_id = userId`, `ORDER BY received_at DESC LIMIT 20`, returning `{id, subject, body, receivedAt, status, caseId, caseTitle, caseStatus}`. Already wired into the page (`app/accountDetails/page.js:3,14`) and rendered by `DisplaySupportHistory` (`components/AccountDetailsComp.js:495-506`).

**Keying:** `support_emails.user_id` is nullable (`schema.ts:158`) — many inbound rows are matched only by address. **Key by `user_id` OR `from_email`** to catch everything. Same for `outbound_emails` (`user_id` OR `to_email`, `schema.ts:219,221`). Cases: `support_cases.user_id` OR `from_email` (`schema.ts:176,178`).

**Real example** (`aprilnicolau@gmail.com`, 8 emails / 4 in a case):
```jsonc
{ "id":109, "subject":"Re: Subscription renewal",
  "body_preview":"I finally got the new credit card payment to submit...",
  "received_at":"2026-06-01T14:31:35Z", "status":"replied",
  "case_id":1, "case_title":"Re: Subscription renewal",
  "case_status":"resolved", "priority":"normal" }
```
Note: some of a user's emails carry a `case_id` (grouped into a case) and some are `null` (loose tickets) — a thread view should show both, grouping cased emails under their case with its status/priority badge. **Outbound** (`outbound_emails`) is not currently fetched by the page — add a keyed-by-user query to show campaign sends (subject, campaign, type, sent_at, case_id). Totals: 8,156 outbound / 2,626 users.

---

## 5. Sample user counts (what a populated dashboard looks like)

### Showcase — `lukesearra@icloud.com` (test acct, fully seeded; the only cross-section example)
- `user_logs`: **autopilot 68**, **history 52**, **byo 47**, **thrive 1**, **levels 1** (levels doc has 3 items, 2 logged).
- `user_setting` types present: `autopilot_state, byo_favorites, byo_settings, levelPath, subscription (Active), thrive_profile, thrive_state, workout_level` — i.e. every workout/nutrition/preferences store.
- Support: **0** emails / **0** cases. Outbound: **2**.
- autopilot `user_schedule_date` range 2022-09-07 → 2026-07-26; byo 2022-09-07 → 2026-07-24; history 2025-07-10 → 2026-07-23 (real activity dates via `user_schedule_date`).

### Representative real member — `aleksandarjovic@protonmail.com` (`Aleksandar Jovic`, current/subscriber)
- `user_logs`: **levels 50 day-docs → 139 items → 35 logged items** (only section present). `created_at` spans 2026-01-08 → 2026-07-23 (the real time axis for levels).
- `user_setting`: `levelPath`, `subscription (active)` only. No thrive, no byo/autopilot yet.
- Support: 0 / 0. Outbound: 1.
- **This is the common shape:** organic `levels` history + `levelPath` level + `subscription` profile, and nothing else. The dashboard must look complete with just these three.

### Support-rich member — `aprilnicolau@gmail.com`
- 8 support emails (4 grouped into case #1 "Re: Subscription renewal", resolved), 4 loose. Good showcase for the support thread section.

---

## 6. Proposed dashboard sections + visuals (design only)

Follow the **existing modular pattern**: `AccountDetailsComp.js` already renders independent `Display*` sub-components inside one `<Stack>` (`components/AccountDetailsComp.js:14-22`), each self-contained. Add each new section the same way — server component fetches all data in the `Promise.all` (`app/accountDetails/page.js:12-16`), passes as props, and **each `Display*` returns `null` when its slice is empty** (that is the "never fail the whole page" contract: one empty/failed fetch hides only its own card). Every helper should be wrapped like `fetchUserWorkoutLogs` — `try/catch` returning `[]`/`null` (`lib/userHelpers.js:30-49`). Styling: current page is MUI + inline styles; new visuals are all doable with **inline styles + lightweight inline SVG** (heatmap squares, progress bars, sparkline) — **no chart library required.**

### A. Workout History — activity heatmap + totals
- **Visual:** GitHub-style **12-month contribution heatmap** (7×~53 grid of `<div>`/SVG `<rect>` squares, color-graded by workouts-logged that day) + a totals strip (total sessions, current/longest streak, active days, last active).
- **Data / query:** union all four workout sections into a per-day activity count:
  - `levels`: group by **`created_at::date`** (its `user_schedule_date` is non-ISO); count items where `isLogged`.
  - `history`/`byo`/`autopilot`: group by **`user_schedule_date`** (ISO); count logged entries/items. `SELECT section, user_schedule_date, created_at, data FROM user_logs WHERE user_id=$1`, bucket in JS.
- **Secondary visual:** a reverse-chronological **timeline list** from `history` entries (`courseName` + `type` badge) when present — cleanest human-readable log.
- **Degrades:** if no section has logged activity → hide the whole card. If only `levels` exists (the common case) → heatmap still renders off `created_at`.

### B. Levels & Progression — per-discipline level bars
- **Visual:** current **level chip** (name from `LEVEL_NAMES`) + a small **horizontal progress bar per Foundation discipline** (Core, Upper Body, Lower Body, Handstand, Movement, Rings from `PROGRAM_IDS`) showing selected progression / mastery step where `byo_settings` data exists.
- **Data / query:** `workout_level` (fallback `levelPath.leveld`) for the headline level; `autopilot_state.level` for White Board level; `byo_settings.exercises` for per-exercise mastery step (hydrate via `lib/curriculum.js` if per-discipline bars are wanted, else just show chosen level + count of customized progressions).
- **Degrades:** no `workout_level`/`levelPath` → hide bars, or show just "Level: —". Broadly populated (202 users have `levelPath`), so this renders for most.

### C. Nutrition / Thrive — summary card
- **Visual:** stat tiles (current weight, height, units) + a small **weight sparkline** if multiple `thrive` `measurement` dates exist + a **tasks-completed count / lessons-unlocked count** + before/current **photo thumbnails** if present.
- **Data / query:** `thrive_profile` (weight/height/units/photos), `thrive_state.permissions` (unlocked count), `user_logs section='thrive'` measurements over time + task completions. Optional badge "Thrive Nutrition owner" if a `purchase` row mentions Thrive.
- **Degrades:** only 1 user today → for everyone else the whole card is hidden. Show nothing rather than empty tiles.

### D. Preferences — key/value list
- **Visual:** simple **definition list** (label/value rows): chosen Level, Plan, White Board level, Thrive units (Imperial/Metric), # customized BYO progressions, # saved favorites, phone, country.
- **Data / query:** `workout_level`/`levelPath`, `autopilot_state`, `thrive_profile.units`, `byo_settings` (count keys), `byo_favorites` (count), `subscription.data.phone`/`country`. (Phone/country already editable in the Profile section — reference, don't duplicate the editor.)
- **Degrades:** render only the rows that have values; hide the card if all empty.

### E. Support & Email History — chronological thread list (extend existing)
- **Visual:** chronological list of inbound emails, **grouped under their case** (case title + `status`/`priority` badge using the existing `Badge` variants), loose emails shown standalone; interleave **outbound** sends (campaign tag + support/marketing badge). Each row: date, subject, preview, status pill; expandable body.
- **Data / query:** `fetchUserSupportHistory(userId)` already returns the inbound+case join (`lib/userHelpers.js:5-28`) — **broaden the key to `user_id` OR `from_email`** to catch address-only rows, and add an outbound fetch (`outbound_emails` where `user_id=$1 OR to_email=$2`, newest first).
- **Degrades:** already `try/catch → []`; empty → hide card (current `DisplaySupportHistory` handles empty). This section already exists (`AccountDetailsComp.js:495`) and just needs the outbound merge + broader keying.

---

## 7. Modular degradation rules (the contract)

1. Each section is an independent `Display*` sub-component; the page fetches all slices in one `Promise.all` and passes props (mirror `app/accountDetails/page.js:12-16`).
2. Every fetch helper wraps its query in `try/catch` and returns a safe empty value (`[]`/`null`) — never throws (mirror `lib/userHelpers.js:30-49`). One failed/empty slice hides only its card.
3. A section renders **only** when its own data is non-empty (`if (!data?.length) return null`). Given today's sparse migration data, expect most members to show: Workout History (levels), Levels, Preferences, Support — with Nutrition/BYO/AutoPilot appearing only as those users get seeded.
4. Time axis rule (bake into queries): **`levels` → `created_at`; migration sections → `user_schedule_date`.**
5. Keying rule: support/outbound must match `user_id` **OR** email address, since `user_id` is nullable on those tables.

---

## Appendix — file:line references
- Schema: `Drizzle/db/schema.ts` — `user_logs` 67-87 (section doc 71-74, unique idx 86), `user_setting` 38-66, `support_emails` 147-172, `support_cases` 174-191, `outbound_emails` 217-232.
- Page/component: `app/accountDetails/page.js:12-16`; `components/AccountDetailsComp.js:14-22` (section stack), `:495-506` support, `:576` activity.
- Helpers: `lib/userHelpers.js:5-28` (support history), `:30-49` (workout logs — the try/catch degradation template).
- Workout API + shapes: `lib/workout.js` (date helpers 41-60, standing storage 118-139, day-doc access 143-165, history helpers 176-200); `lib/curriculum.js` (PROGRAM_IDS 12, buildCourseView 80-94); routes `app/api/user/workout/{levels,history,autopilot,byo,thrive,standing}/route.js`.
