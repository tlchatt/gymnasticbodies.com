# Follow-up: truncated webm renditions (Front Split / Thoracic Bridge)

**Snapshot as of 2026-09-01.** Point-in-time handoff — verify before acting.

## The finding (the crux)
Members report stretch follow-along videos "cut off ~20 min into a 45-min video." Root
cause is NOT mp4 stalls — it's that the **optimized webm renditions are TRUNCATED** for two
videos, and the app serves webm (prefers it via the manifest). A full ffprobe scan of all
537 optimized ids found **exactly 2 truncated**:

| Video | Blob id | Source mp4 | webm rendition | webm % of source |
|---|---|---|---|---|
| Front Split | `UwSbT4bF` | 45.4 min | 20.2 min | **44%** — matches "cuts off at 20 min" |
| Thoracic Bridge | `2yO4CxF4` | 40.5 min | 14.7 min | **36%** — matches "thoracic only 14 min" |

The consistent per-video cut-off time in complaints (same timestamp for everyone) is the tell
that it's a truncated file, not a bandwidth stall. **Middle Split (`zhgu6OPL`) and the other
535 renditions are full-length and fine.** So this is a **2-file fix, NOT a $200 library
re-encode.** (Both `_720.webm` and `_480.webm` are truncated for the 2 — the re-encode job
silently produced short output for these; the ledger recorded no durations so it wasn't
caught.)

## What is currently LIVE (2026-09-01) — the truncated webm is STILL being served
- `my.` bundle `main.0919dca1`: `src/lib/video.js` now seeds the optimized-rendition manifest
  **synchronously** from a bundled snapshot `src/data/optimized-manifest.json` (537 ids), so
  webm is selected reliably. `VideoElement` now logs the **actual `currentSrc`** + playback
  position, and emits `my.video.waiting/playing/ended/stuck` (a `stuck` watchdog = a real
  cut-off). `app.` `clientLog` allowlist updated for those events (commit `6a27850`).
- **These changes did NOT fix the videos** — they made webm serving reliable and, crucially,
  the logging finally revealed that the served webm is truncated. Browser-verified: Course
  Library → Stretch → Front Split plays `UwSbT4bF_480.webm`, duration 1211s (20 min).
- **Lesson:** the old telemetry logged the mp4 *fallback* URL (`current.src`), never the real
  source, so "0 webm in logs" was a false read — do not trust it; trust `currentSrc` now.
- **Nothing has been mitigated yet** — the 2 truncated renditions are live. First actual user
  message next session should decide whether to run the fix below.

## The fix to run (approved in principle, NOT yet executed)
1. **Stopgap (instant):** remove `UwSbT4bF` and `2yO4CxF4` from the manifest in BOTH places —
   `my.gymnasticbodies.com/src/data/optimized-manifest.json` (bundled) AND the Blob
   `optimized-manifest.json` (the running app's async fetch reads Blob, so it must be updated
   too or it re-adds them). Redeploy `my.` (`claudeTools/deploy.sh`). Result: the app serves
   the **complete mp4** for those 2 (may stall, but it's the whole video — strictly better
   than a silent cut-off).
2. **Re-encode those 2 correctly:** from the full source mp4, verify **output duration ==
   source duration** before upload (this is the check the last batch lacked), overwrite the
   truncated `UwSbT4bF_{720,480,1080}.webm` and `2yO4CxF4_*` in Blob, then re-add the ids to
   the manifest. Reuse `claudeTools/videoOptimize/optimize.mjs` helpers; corrected recipe is a
   capped/quality VP9 or `libx264 -crf 23 -maxrate 1.2M -bufsize 2.4M -vf scale=-2:720
   -movflags +faststart`. Only 2 files — ~30 min of compute.
3. **Verify:** ffprobe the new renditions == source length; browser-play Front Split to the
   end on the **local** (`isLocal:true`) Agent browser or a normal browser; watch
   `my.video.stuck` stays ~0 and no early `ended`.

## Also relevant
- Plan file: `~/.claude/plans/the-top-stallers-are-unified-otter.md` (measure-first plan;
  now superseded on the root cause by this truncation finding).
- Scan artifacts in scratchpad: `durScan.mjs` (probes webm vs mp4 duration for all manifest
  ids), `durScan.out` (results), `videoTelemetry.mjs` / `webmStuckCheck.mjs` (monitoring).
- Board todos already filed (Gymnastic Bodies): "Harden my. video player to recover from
  stalls" (`8433a3bd`), "Remove/repoint outbound links in my. app" (`7c2eae67`), "Continue
  Tim's GB support session" (`d5ca881e`).
- **Support cases: do NOT reply "fixed" until this is actually resolved** (owner's rule). Open
  about these videos: 605, 604, 600 + uncased Travis Daigle / James Spann / Dean Cunningham /
  Andre Hayter / Josh Schmitt / Ean Phillips. Already told "IT is working on it" (2026-08-29):
  595, 593, 583, 582, 576, 575, 408. Back-case pre-Aug-26 backlog with
  `node claudeTools/support.js backfill-cases`.
- Browser note: this session drove a NON-local browser by mistake — always select the
  `isLocal:true` entry first.
