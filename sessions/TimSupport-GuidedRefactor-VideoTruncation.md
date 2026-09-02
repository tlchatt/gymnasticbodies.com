# Session: Tim Support → Guided/Section Refactor → Video Truncation

- **Session name:** TimSupport-GuidedRefactor-VideoTruncation
- **Session ID:** `44af7bae-2635-471c-af33-0c8a213808a7`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com` (member app: `../my.gymnasticbodies.com`)
- **Dates:** 2026-08-25 → 2026-09-01 (multi-day, live-support driven)
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/44af7bae-2635-471c-af33-0c8a213808a7.jsonl`
- **Plan file:** `~/.claude/plans/the-top-stallers-are-unified-otter.md` (video plan; root cause since superseded by the truncation finding)
- **Other dirs:** scratchpad `/tmp/claude-1000/-var-www-Work-Gymfit-app-gymnasticbodies-com/44af7bae-.../scratchpad/` (video scan + monitor scripts).

**First user inputs:** (1) `tim@par5performance.com` (2) "He is having trouble logging in." (3) "I'm sitting with him." (4) "look into that token issue after you issue a new password." (5) "Okay we need to get Tim logged in now."
**First command:** `node claudeTools/support.js user --email=tim@par5performance.com`

## The arc
Opened as a live support case for **Tim (tim@par5performance.com)**, expanded into a
guided-plans/section-model refactor, and then Tim's issue #1 ("Front Split video stops
halfway") drove a deep video investigation that ended on a real, still-open bug.

## Accomplishments (with status)

### Tim support — DONE (with a self-inflicted detour)
- Login: the failing logins were resolving to a **stale cached `gwtest@tlchatt.com`** session,
  and separately Tim was typing a superseded password. I churned his password several times
  (my mistake — I overwrote it without clearly flagging it, breaking a password the owner had
  already shared). **Final password: `Gymnastic2026!`** (verified). Built
  `claudeTools/setUserPassword.js`.
- `my.` login error now shows the real reason (bad credentials / server / network) instead of
  "something went wrong" (`10bb6bf`).
- Tim's issue #2 (day order) and #3 (plan re-selection) fixed below. Issue #4 (volume arrow
  doesn't change the video) = **working as designed** — mastery steps are volume of the *same*
  exercise; the video is per-exercise, not per-step. Issue #1 (Front Split) = root-caused, NOT
  fixed (see Video below).

### Guided level "stickiness" + Section/Level refactor — DONE, deployed, browser-tested
- Root cause: `levelId` was overloaded — it held BOTH a guided training level (0–4) AND a
  section code (White Board=9, BYO=10), so entering a section wiped the guided level.
- Fix 1 (`c89c062`): `lastGuidedLevel` remembered independently; returning to Guided restores
  it; guided picks persist to `workout_level` via the standing PUT.
- Fix 2 — full refactor (`338d48a`): new `section` field (`guided`/`whiteboard`/`byo`) drives
  the home render; `levelId` is 0–4 only; **switch-confirm modals removed** (direct switch).
  Login derives section from `current_location` else translates a seeded 9/10 code. Verified
  in a local browser across all sections + reload.
- White Board label shows the actual level (apLevel) not the word "White Board" (`d2def26`).
- **Resume-last-place** feature: `current_location` user_setting, recorded on nav, restored on
  login (`c131318`, renamed from `last_location` in `e11d055`/`c42a959`, app. `25b62cd`).
- Retired the vestigial `levelPath` write; **quiz now sets the White Board level too**
  (`f28f3f5`).

### Guided day order — DONE, deployed (`f15c331`)
- A bulk seed/repair scrambled class order for **~11,004 of 13,174 members** (Warm-Up/Mobility
  landing last). Fix = **non-destructive display sort** in the levels route: Warm-Up, then
  Mobility, then the rest in stored order. No DB write.

### Information page link — DONE (`70a7403`)
- The "Exercises" card linked out to the WordPress site (logged-out, broken thumbs). Repointed
  to in-app `/my-courses`, title→"Courses", thumbnail off WP → S3. (Blogs/Podcasts cards still
  link out — board todo `7c2eae67`.)

### Video investigation — the important unfinished thread (see the follow-up note)
Tim's "Front Split stops halfway" → discovered the guided catalog used JW **playlist-container
ids** as mediaIds; "fixed" the data (`8a870b7`, `c84bad3`) — but that was a no-op because the
player already resolves playlists. Deep-dived and found the REAL cause: **2 webm renditions are
truncated** — `UwSbT4bF` (Front Split) 44% and `2yO4CxF4` (Thoracic Bridge) 36% of source; the
other 535 are fine. The app serves webm, so users get the truncated file (matches the exact
cut-off timestamps in complaints). Shipped a **telemetry fix + synchronous manifest bundling**
(`my.` `a972349`, app. allowlist `6a27850`) which exposed the truncation via a browser test.
**Not resolved — the 2-file fix is pending. Full detail + exact next steps in
`sessions/VideoWebmTruncation-followup.md`.**

## Deploys / git
- `my.` deployed many times via `claudeTools/deploy.sh` (S3 `my.react2026` + CloudFront
  `E2TAHYRIUSC1ZN`); latest bundle `main.0919dca1.chunk.js`.
- `app.` pushed to `main` (Vercel auto-deploy) per fix. My commits: `6a27850 c84bad3 8a870b7
  f15c331 c42a959 25b62cd` (+ section-refactor + guided-level commits). **NOTE: a parallel
  session was committing Support-agent/Gmail-push work to app. `main` concurrently** (`180f983
  0e5bb0e a904b55 8707048 …`) — those are NOT mine.

## Tools/skills used
Browser automation (Chrome — drove a NON-local browser by mistake once; always pick the
`isLocal:true` one), `technologic-tasks` (3 todos filed), `code-review`-style subagents
(Explore/general-purpose) for transcript + serving-path archaeology, ffprobe/ffmpeg for video
analysis, Monitor + background watchers for live telemetry.

## Files created
- `my.`: `src/Components/CurrentLocationTracker/index.jsx`, `src/data/optimized-manifest.json`
- `app.`: `sessions/*` (this note + the video follow-up)
- `claudeTools/setUserPassword.js`, `setWorkoutLevel.js`
- scratchpad: `videoTelemetry.mjs`, `webmStuckCheck.mjs`, `durScan.mjs`

## Board todos (Gymnastic Bodies)
- `8433a3bd` Harden `my.` video player to recover from stalls
- `7c2eae67` Remove/repoint outbound links in `my.` (except My Account)
- `d5ca881e` Continue Tim's GB support session

## Note for Next Session
**As of 2026-09-01.** The one live, unresolved item is the **truncated webm renditions** —
`UwSbT4bF` (Front Split, 44% of source) and `2yO4CxF4` (Thoracic Bridge, 36%). The app serves
webm, so those two videos are currently cut off for every member. Only these 2 of 537 are bad.

**Do first:** run the 2-step fix in `app.gymnasticbodies.com/sessions/VideoWebmTruncation-followup.md`
— (1) stopgap: remove those 2 ids from the manifest (bundled `my./src/data/optimized-manifest.json`
AND the Blob `optimized-manifest.json`) so the complete mp4 serves, redeploy `my.`; (2) re-encode
just those 2 correctly (verify output duration == source before upload), overwrite the truncated
`.webm`, re-add to the manifest. Then verify with ffprobe + a browser play + the new
`my.video.stuck` telemetry.

**Do NOT** reply to the video support cases until this is actually resolved (owner's rule) —
open: 605/604/600 + uncased Travis Daigle, James Spann, Dean Cunningham, Andre Hayter, Josh
Schmitt, Ean Phillips; a follow-up is owed to the "IT is working on it" batch (595/593/583/582/
576/575/408). Back-case pre-Aug-26 backlog: `node claudeTools/support.js backfill-cases`.

**Lesson to carry:** the old video telemetry logged the mp4 *fallback* label, not the real
`currentSrc` — that's why "0 webm in logs" was a false read and the truncation hid for weeks.
Trust `currentSrc` / a hands-on browser check, not stall counts. And always drive the
`isLocal:true` browser.
