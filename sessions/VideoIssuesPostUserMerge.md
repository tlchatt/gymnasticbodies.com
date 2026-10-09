# Session: VideoIssuesPostUserMerge

- **Session ID:** `cf10dd5a-588a-461c-8de3-0a5086f55254`
- **Session name:** VideoIssuesPostUserMerge
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Dates:** 2026-07-27 → 2026-07-28
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/cf10dd5a-588a-461c-8de3-0a5086f55254.jsonl`
- **Other dirs used:** `../my.gymnasticbodies.com` (video fix + logging), `/var/www/Work/Gymfit/` (backups: `aws_export_2026-07-24/`, `wordpress_backup_2026-07-24/`, `forum_backup_2026-07-24/`, `legacy_apps_backup_2026-07-24/`, `keap_backup_2026-07-24/`, `courses_rds_backup_2026-07-24/`, `BACKUPS_2026-07-24.md`), memory at `~/.claude/projects/.../memory/`.
- **Plan referenced:** `~/.claude/plans/robust-roaming-garden.md` (the OffAWS workout migration plan — the roadmap for the pending migration writes).

## First user inputs
1. "Some users have reported issues loading video (my. portion of the app) in about 24 hours … scan the inbox for these emails. Give me account. see if you can test the issues in production with our test users. set up logging."
2. "'The my. video players don't branch on user class, but the data feeding their mediaIds does' … whats a user class?"
3. "Okay user class should only apply to Auth though. We were supposed to be no longer using AWS for all video and data … Verify your claim review the my. sessions."
4. "Did you review the user reported issues, one reported on My Courses"
5. "ON GWtest account (non legacy), the my courses videos work fine for me."

**First actions:** Read `claudeTools/support.js`; launched an Explore subagent to map the `my.` video-player code; ran `scratchpad/scanVideoEmails.js` (support-inbox scan).

---

## Goals & accomplishments

### 1. Video/"My Courses won't load" outage — DIAGNOSED, FIXED, DEPLOYED, VERIFIED ✅
- **Inbox scan** → cluster of "logged in, content/video won't load" reports (last ~48h): **Zachary Kaddatz, Karla Guimaraes, Cyril Checroun** (no Neon row → legacy AWS), **Yuriy Benderskiy** (current/stripe), **Jeff Ford** (noncurrent), **Yaniv Eyny** (current/subscriber). (Others in inbox were billing/login, not this bug.)
- **Root cause (reproduced on prod via headless luke):** the Course Library (`my.` `src/Containers/CourseLibrary/index.jsx`) crashes for **legacy AWS users** opening the **newly-added courses** (Foundation Intro, Restore series, Fundamentals, Elements). AWS `workout-service/course-library` returns **HTTP 200 with the string `"Please pass in Valid parameters."`** for courses it doesn't recognize; `Object.keys(string)` → char-index keys → **blank numbered cards**; clicking one sets `allProgs` to a single char → `allProgs.map` throws → **whole SPA white-screens** (no error boundary). Neon users get **401 → `.catch` fallback (local embedded course data)** → work fine. That's why gwtest worked and legacy users didn't.
- **Fix (3 iterations in `CourseLibrary/index.jsx`, all shipped):** (1) guard non-object responses; (2) show a neutral "Coming Soon" instead of the "you must purchase" `OhNoModal` (misleading for entitled members); (3) **FINAL/real fix** — for an unrecognized-course response, `throw` into the existing `.catch`, which renders from the **local embedded course dataset** (the exact data Neon users already use — it contains full data for Foundation Intro, all 7 Restore courses, Elements 1-2, Fundamentals 1-20). Legacy users now get the new courses **actually working** (real cards + Blob video), not just non-crashing.
- **Verified** by a headless luke (legacy) prod run on the live bundle: Foundation Intro, Hip Restore, Ankle & Knee Restore all render real content + play Blob video (`readyState 4`, HTTP 206); old Stretch course still works; zero console/page errors.

### 2. Client logging — was 100% DARK; now enabled ✅
- **Root cause:** `CLIENT_LOG_TOKEN` was **absent from every Vercel env** → `app/api/clientLog/route.js` returned 401 for every `my.` client POST since the feature was built. **Zero** `source=my.gymnasticbodies.com` rows ever in `app_logs`. (The renewal/`renewalStatus.check` events the user remembered are **server-side**, `source=app.gymnasticbodies.com`.)
- **Fix:** set `CLIENT_LOG_TOKEN` in **Vercel prod** (= `my.`'s `REACT_APP_LOG_TOKEN` `20f4c8d0…`) + local `.env.local`; expanded `ALLOWED_EVENTS` (`my.video.error/missing_src/stalled/loadstart`, `my.course.error/empty`); instrumented `my.` `VideoElement` (onError/onStalled + missing-src via existing effect), `CourseLibraryPlayer` (onError/onStalled), and enriched `clientLogger.js` to attach user-class context (`postAWS`, ids) from localStorage. Note: the video instrumentation does NOT catch the Course Library crash (that's a render exception pre-video); `my.course.error` covers it.

### 3. AWS wind-down reconnaissance — BOTH BLOCKERS SOLVED ✅ (writes NOT started)
- **Migration reality (verified):** the AWS→Neon workout-data migration **never ran for real users** — only **luke** carries the seeder marker (1 of 16,334); ~170 Neon users have any `user_logs` (organic). Subscription/billing did migrate (15,994). Legacy users still read Guided-Plans/Levels, Thrive, calendar, demo, and Course Library **from AWS** (`LegacyAction.js`, `LevelsActions.js` `/myschedule/*`, Thrive containers); AutoPilot/BYO/History are Neon-for-all.
- **THE MAP (blocker 1 solved):** **AWS integer `userId` ≡ Keap contact `id`** — verified 10/10 (Neon `aws_customer_id` == Keap contact id) + luke=411847. Keap has **93,379** contacts vs 16,334 Neon. Pulling Keap contacts (id+email) → complete `email↔awsUserId` map.
- **PASSWORDS (blocker 2 solved):** AWS RDS has **zero** email/identity/password columns across all 12 DBs (re-probed) → auth delegated to Keap live (token in `token_management_service_db`). The native Keap `Password` field is **plaintext + extractable** — read luke's real pw via a **Keap PAT** (passed as `?access_token=` for XML-RPC) and it **validated against AWS `/auth`**. A **SAK gets 401 on XML-RPC** (REST-only). So bulk password migration → **no forced resets** (extract → argon2 → discard plaintext; never persist).
- **Credentials saved (durable):** `KEAP_SERVICE_KEY` (SAK, REST/map) + `KEAP_PAT` (PAT, XML-RPC/passwords) in `my./.env` and `app./.env.local`. Tool: `claudeTools/keapPasswordTest.py` (`KEAP_TOKEN=<PAT>`).

### 4. Pre-shutoff backups — COMPLETE (6 archives) ✅
| Dir | Size | Contents |
|---|---|---|
| `aws_export_2026-07-24/` | 1.5 GB | Full AWS workout RDS, 47 tables NDJSON + manifest (keyed by awsUserId) |
| `wordpress_backup_2026-07-24/` | 221 MB | 5 WP sites incl. `goatfart_homepage` (main + **WooCommerce orders/customers confirmed**, 170k shop_order refs), stagingsales, gear, account, gbprofile |
| `forum_backup_2026-07-24/` | 510 MB | `goatfart_forum40` — Invision Community forum (312 tables) |
| `legacy_apps_backup_2026-07-24/` | 81 MB | non-WP apps: minicourseapp (workout app), course_dev, vip |
| `keap_backup_2026-07-24/` | 108 MB | all 93,379 Keap contacts (id/email/custom fields), **password-free** (REST-only) |
| `courses_rds_backup_2026-07-24/` | 800 KB | curriculum content RDS (found_core/upper/lower, handstand, movement, rings, stretch) |
- Guide `BACKUPS_2026-07-24.md` written — trace-a-user (email→Keap id=awsUserId→export) + fix/re-seed-one-user recipes.

## Corrections to prior beliefs (important)
- **"courses RDS = WordPress content" — WRONG.** That RDS (`gymfit-membersite-courses-prod-db`, SG `sg-00ef254a10a8e1922`, SSM `/prod/gymfit-memsite/courses/RDS_*`) is **workout curriculum**, not WordPress.
- **"WP+forum box is in a third-party account" — WRONG.** It's **our own Lightsail** instance `cpanel-new-2026` (34.205.92.109, us-east-1, cPanel/AlmaLinux). Query `aws lightsail get-instances` (NOT `ec2 describe-instances` — Lightsail is separate). Access via `aws lightsail get-instance-access-details --instance-name cpanel-new-2026 --protocol ssh` (temp SSH, no key needed). Memory `project_forum_host_ownership.md` corrected.

## Git / Vercel / deploys
- **`my.` (GitHub tlchatt/my.gymnasticbodies.com):** commits `5f4ec54` (crash fix + logging), `3d51d7c` (Coming Soon msg), `3f7857d` (real fix — legacy render from local data). Deployed to prod **3×** via `bash claudeTools/deploy.sh` (S3 `my.react2026` + CloudFront `E2TAHYRIUSC1ZN`): bundles `main.c3f08029` → `main.d6ead481` → **`main.7c1fe10f` (CURRENT LIVE)**.
- **`app.` (GitHub tlchatt/gymnasticbodies.com):** commit `71c195a` (clientLog allowlist) pushed to `main` → Vercel auto-deploy.
- **Vercel:** added `CLIENT_LOG_TOKEN` to **Production** env (`vercel env add`).
- **Commit attribution:** per updated global rule mid-session, commits carry **no** Claude/AI trailer (earlier session commits do — not rewritten).

## Tests / tools / subagents
- Explore subagent: `my.` video-player + logging map. general-purpose subagents: 2 prod repro/verify runs (luke+gwtest), AWS RDS map-probe, AWS RDS password-column probe, Keap contacts backup, AWS full-export backup, WP/forum Lightsail-SSH backup. `SendMessage` used to resume detached backup agents + ensure SG revokes.
- Scratchpad scripts: `scanVideoEmails.js`, `lookupReporters.js`, `keapProbe.js`, `keapMapVerify.js`, `keapXmlrpcTest.py` (blocked), `wp_dump.sh`.
- **Security guard notes:** several prod-data subagents auto-flagged (credential exploration / PII / production reads) — all were **user-authorized backups**, read-only, SG-ingress revoked. The classifier repeatedly blocked SSH-into-prod until the user authorized it + added `Bash(aws lightsail:*|ssh:*|scp:*)` allow-rules to `app./.claude/settings.local.json` (running the dump as a single script then worked).

## Files created / modified
- **`my.` code:** `src/Containers/CourseLibrary/index.jsx`, `src/Components/VideoElement/index.jsx`, `src/Components/CourseLibaryComponents/CourseLibraryPlayer/index.jsx`, `src/util/clientLogger.js`. Env: `my./.env` (+`KEAP_SERVICE_KEY`, `KEAP_PAT`).
- **`app.` code:** `app/api/clientLog/route.js`. Env: `app./.env.local` (+`CLIENT_LOG_TOKEN`, `KEAP_SERVICE_KEY`, `KEAP_PAT`; backups `.env.local.bak-*`).
- **Backups + guide:** 6 archive dirs + `BACKUPS_2026-07-24.md` (all under `/var/www/Work/Gymfit/`).
- **Memory:** `project_aws_identity_in_keap.md` (new), `project_forum_host_ownership.md` (corrected), `feedback_never_remove_local_secrets.md` (access-key durability note), `MEMORY.md` (index).
- **Settings:** `app./.claude/settings.local.json` (+3 allow-rules, user-added).

---

## Note for Next Session

**Focus: execute the AWS→Neon migration WRITES** (held all session — nothing written to prod Neon yet). Roadmap: `~/.claude/plans/robust-roaming-garden.md`. **Plan each phase with the user before executing (DB-level writes); use this fresh context, don't let a 400k-row seed get auto-compacted mid-run.**

Both blockers are already solved and credentials are in the envs:
- **Map:** `AWS userId == Keap contact id`. Build the full `email↔awsUserId` map from `keap_backup_2026-07-24/contacts.jsonl` (each `contact.id` = awsUserId) joined to Neon `user.email`.
- **Passwords:** plaintext extractable via `KEAP_PAT` (XML-RPC); verified against AWS `/auth`.

**Suggested phase order:**
1. **Seed (A5)** — validate the map (how many of the 16,334 Neon users resolve to a Keap contact + have data in `aws_export_2026-07-24/`), then run `claudeTools/seedWorkoutData.js` (start `--users=` / `--limit=` scoped, verify, then full). ~400–600k rows into `user_logs`/`user_setting`. Seeder is idempotent (`seeded:true` + ON CONFLICT).
2. **Passwords** — per user: read Keap plaintext (PAT/XML-RPC) → argon2 into better-auth → **discard plaintext, never persist**. Sensitive; get explicit go-ahead + do in-memory only.
3. **Frontend cutover** — flip the still-AWS sections to Neon: Levels/Guided-Plans (`LevelsActions.js`/`LegacyAction.js` `awsUserId?` branches, plan phase **B4**), Thrive (routed `Containers/Thrive*` still hit `/thrive/*`), calendar (`calendarActions.js` `/myschedule/*`), demo (`DemoModalActions.js`), Course Library (still calls AWS; today's fix only added a local fallback). Gate B4 on seed verified.
4. **Turn AWS off.**

**Also open (lower priority):**
- Reply drafts to the 4 outage reporters (Zachary, Karla, Cyril, Yuriy) — "it's fixed, try again" — drafted-not-sent; needs user approval before sending (Support Email Rule).
- Confirm the `my.course.error` / video events are now actually landing in `app_logs` from real prod traffic (pipeline is live post-deploy).
- The 3 `Bash(...)` allow-rules in `app./.claude/settings.local.json` can be removed now the WP dump is done (command given to user).

**Backups are the safety net** for all of the above — `BACKUPS_2026-07-24.md` documents trace + single-user re-seed. Session file: `app.gymnasticbodies.com/sessions/VideoIssuesPostUserMerge.md`.
