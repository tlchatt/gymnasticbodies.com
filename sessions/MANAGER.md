# Manager — Gymnastic Bodies

Read this FIRST on startup, compaction or rotation (skill `project-review-manage`).

- **Manager session ID:** `987aa382-2760-494d-94a5-e595dda95c78` — resume: `tclauder 987aa382-2760-494d-94a5-e595dda95c78`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com` (git root; `sessions/INDEX.md` lives one level up at `/var/www/Work/Gymfit/sessions/INDEX.md`, outside the repo)
- **Board client slug:** `gymnastic-bodies`
- **Review baseline commit:** `12f6aee` (2026-10-08)
- **Last check-in:** 2026-10-08 ~21:10 ET

## Today — 2026-10-08

| # | Item | Session | Task | Hours | Status |
|---|---|---|---|---|---|
| 1 | Luke: mobile button white screen + subscribe warning (now: mobile icon labels) | `cc26628b-4f8f-4876-9691-e177603f1efe` | none | `67ede9d8` open | 🟡 running |
| 2 | October chargeback users → support-agent real cancel/refund/delete | `96d475f4-f803-4e81-9ce1-375faef72746` | none (candidate `35ee9965`) | none matched | 🟡 running |
| 3 | Oct 28 renewal reminders: Stripe webhook never received `invoice.upcoming` / dispute / EFW events | manager | none | — | ✅ dispute+EFW alerts on; `invoice.upcoming` removed (owner: only promised heads-ups; none found) |

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
