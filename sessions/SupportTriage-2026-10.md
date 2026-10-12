# Support backlog triage — October 2026

Worker session `6e51a0f5-4053-4ca2-9fcb-77a26fb5df6c`, dispatched by the manager (`987aa382`) on 2026-10-12.
Running tally. Every number below is a snapshot as of the date on its line.

## Snapshot — 2026-10-12 (read-only, nothing sent or changed yet)

104 open/pending/escalated cases. 77 `support_fires` in status `posted` (never accepted): 46 sit on those
open cases, 31 sit on cases already closed/resolved (or no case) and are stale drafts.

| Group | Cases | Posted drafts | Recommended action |
|---|---|---|---|
| Engineering bug, still open, no acknowledgement sent | 14 (11 members) | 3 | Batch 1: short "escalated to engineering" email; close the 3 duplicate cases |
| Fixed since the report | 4 | 0 | Batch 1: "it's fixed" email + 1-month credit (credit.js), close |
| Thoracic Bridge (told 10-09 we'll email when the full video is live) | 12 | 2 | Nothing now; manager item 7 sends the "live" email |
| Legacy "I bought courses for life" | 26 | 25 | One standard reply (the $15 legacy offer) — owner to confirm wording/policy; then send + close |
| Cancel / delete requests | 6 (+ Caleb Kuo, case 713, closed but deletion never done) | 5 | Do the period-end cancel / backed-up delete, confirm by email, close. Urgent |
| Billing / account | 16 | 6 | Per-member fix + draft (refund promises, merges, rate questions) |
| Simple questions / requests | 6 | 4 | Answer; reset Oscar's progress like Faiz's |
| Stale January 2026 (pre-migration, answered by email at the time) | 19 | 0 | Close without email |
| Banned (skipa44) | 1 | 0 | No reply (policy pending) |

### Fixes checked (git + deploy evidence from session `20126359`)
- `772c6e5` follow-along plays the member's step (app., live 2026-09-30) — James Goodell #664.
- `ac5e6a7` + `d2a9501` Thrive photos save, task cards readable (my., deployed 2026-09-30 14:55 UTC) — Tricia Sambrano #668.
- `ad9fc3a` Thrive lets every current member in (app., live 2026-10-08) — Diana Alvarez Marin #786.
- Faiz Uzzaman #712: progress reset done 2026-09-30 (`admin.progress_reset`, backup in claudePlans); never told.
- `8b0f33f` + `d103956` (guided-plan picks/edits, 2026-09-30) only partly fixed #680/#685/#710/#728: members wrote after
  the fix that edits still fail; Remove-shows-default and Generate-ignores-pick are still open. Treated as open bugs.

### Found while triaging
- Caleb Kuo (caleb.ec.kuo@gmail.com + caleb.kuo@outlook.com) asked twice (09-25, 09-29) for deletion. The agent's
  delete play #183 was never accepted, case 713 was marked resolved, both accounts still exist, and he has had 3
  marketing emails since.
- Teresa Gomez #94 (current/stripe) asked to cancel in January and again 2026-10-10.
- As-member verification is blocked: impersonate / testSession 401 (manager item 22, task 929b8e2d).

## Batches
| Batch | Contents | Shown to owner | Approved | Sent / applied |
|---|---|---|---|---|
| 1 | 11 escalation acks + 4 fixed-with-credit | 2026-10-12 | — | — |
