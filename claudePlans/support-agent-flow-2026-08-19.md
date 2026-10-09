# Support Agent Flow & Rules (prototype notes → agentic workflow plan)

Captured 2026-08-19 from the live Slack support-triage prototype (gymnstic-bodies-support channel). These are the operating rules and the per-case flow to fold into the agentic workflow plan (read-scope AI suggests → human approves → programmatic write endpoint).

## Operating boundaries (from Gregg, in the Luke thread + this session)
- **Read + suggest + draft; human approves; programmatic (non-AI) endpoint writes.** AI never writes directly in the target design.
- **Allowed changes:** customer database, Stripe, credits, account adjustments, price points, account merges, drafting/sending email, testing the app as the user.
- **Site code:** the standing rule was "no site code changes without intimate knowledge." In THIS session Gregg explicitly cleared code fixes ("go ahead and fix code too") — but with the hard condition below.
- **NEVER reply to an unresolved issue.** If it's a bug: **make the fix live, test it as the user, confirm it works — THEN reply.** "Fix in progress / I'll follow up when live" = wasted, confusing communication. (Correction issued 2026-08-19.)
- **Never permanently delete data** (agent). Erasure requests: back up the rows, then HOLD the hard-delete for the operator to run.
- **Email approval:** never send customer email in the same turn as drafting; show the draft, wait for approval. Put the drafted customer reply in the Slack thread for review.
- **Pricing/lifetime = business calls → HOLD for operator.** Honor former (lowest) price points, but "lifetime" claims and goodwill grants need the operator's decision.
- **Hold anything you're not confident about.** Better to flag one clearly than guess.

## Slack reply format (per escalated message, in-thread)
1. Status marker: ✅ resolved / ⚠️ needs review (NOT "holding for you" — that's operator-facing; keep it discrete/team-appropriate).
2. **Customer response** — the exact reply to send the customer (only valid once the issue is actually resolved).
3. **Account actions** — what was changed (credit, access, relink, etc.), concise.
4. **Links** — Case: /admin/cases/<id> | Customer: /admin/users/<id>.
- Tone: match Gregg's voice — casual, warm, first-name, concise, not corporate.

## Per-case flow
1. Read the escalation + open the case in DB (support_cases / support_emails). Read any staff reply already sent (don't contradict).
2. Pull account state: user.migration_type/customer_segment, user_setting subscription (status, stripe_subscription_id, renewaldate), workout usage, prior cases. If billing/access/cancel → query LIVE Stripe (period end is on the item level).
3. Classify: ACCESS / CANCEL / PAYMENT_METHOD / REFUND / DELETE / VIDEO_CONTENT / SCHEDULE_BUG / COURSE_ACCESS / LIFETIME-PURCHASED / OTHER.
4. Resolve by type:
   - ACCESS (paid-but-paywalled): verify live Stripe; restore migration_type=current (relink), log admin.relink_stripe_sub.
   - BUG (schedule/video): **fix the code/media, deploy, test as the user via /api/admin/impersonate, confirm** — only then credit + reply + close.
   - CANCEL: confirm no live sub will bill; note access-through date.
   - CREDIT: use claudeTools/credit.js (auto-picks trial_end for payers vs renewaldate for paywalled). Generous — clearly more than the harm period.
   - LIFETIME/PRICING: HOLD for operator.
   - DELETE: back up, HOLD the delete.
5. Case note + status: resolved cases get a dated resolution note; already-resolved get a dated "[ALREADY RESOLVED <date>] …" note.
6. Reply in the Slack thread (format above) ONLY when truly resolved. Credits are real, but the underlying bug must be fixed+verified first.

## Known defects feeding these cases (as of 2026-08-19)
- **Generate-Workout / schedule edit bug** (my. frontend): guided-Levels "Generate Workout" sends placeholder classId (1–4 positional) instead of real 5-digit ids → server rejects (invalid_class) → edits don't save / day blank / plan reverts. Fix decided: fill the empty day from the Level template (real class ids); drop the broken category dropdown. Files: my. `Components/FreeMemeberComp/Levels/Desktop|Mobile/index.jsx`, `BeginnerPlan/GenerateWorkoutBeginner`, `Store/Action/LevelsActions.js` (generateWorkoutLevels). MUST be built, deployed, and tested as the user before replying.
- **Truncated guided videos** (media): several members report specific videos cut short (Thoracic Bridge 15/45; Middle/Front Split 20/45; Stretch 45→20). Real partial files in Blob → need full re-upload. Not per-account. MUST be fixed + verified before replying.

## This session's ledger (what was actually done)
- Credits applied (10): Matthew Walker 3mo, Matt Smith 2mo, Konstantinos 60d, Trevon 2mo, Boyko 2mo, Mark/George/keyadigital/Jason/Peter 1mo.
- Matt Smith access restored (relink). erik.matthiessen delete: backed up, held.
- 17 cases noted/resolved in DB.
- Slack replies posted for today's 7 threads — BUT the bug ones say "fix in progress"; per the resolve-then-reply rule these must be re-done after the fixes are live+tested.
- HOLDS: pricing/lifetime (405, 374, 514, 516, 518, 519, 526/529/545, 527, 530, 532, 535, 543), payment-method 515, logins 531/538-539, Vega identity.
