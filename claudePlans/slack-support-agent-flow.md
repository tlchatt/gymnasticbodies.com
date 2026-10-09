# Slack Support Agent — End-to-End Flow (living spec)

Design being dialed in with Gregg, 2026-08-24. **Not final — open decisions marked ⛔.**
Principle: **AI reads + suggests, a human gates, hardcoded code executes.** The agent never
writes; the deterministic back layer does, and only after human approval + a delay.

## The pipeline

```
new support email ──▶ (email = case) ──▶ forwarded to #gymnstic-bodies-support
        │                                          │
        │                                   INPUT to the agent
        ▼                                          ▼
  [ FRONT: AI investigates, read-only ] ──▶ posts { response, actions } play in the thread
        │                                          │
        │                              Accept · Edit · Regenerate · Reject
        ▼                                          ▼
  [ GATE: Accept → 5-min fuse (Undo cancels) ]
        │
        ▼
  [ BACK: hardcoded poller fires the play — send reply, apply actions — result to thread ]
```

## 1. Trigger / input side

- **Emails ≠ cases — distinct tables, all stay (DECIDED, WORKFLOW change only).** An email is a
  message (`support_emails` inbound, `outbound_emails` outbound); a case (`support_cases`) groups a
  conversation. No merge, no migration. The workflow change is narrow: **every *inbound* support
  email is auto-attached to a case** (conversation-threaded) — which today doesn't always happen, so
  `/admin` replies went out uncased and confused staff. **Outbound emails (marketing/campaign) are
  NOT cased** — they stay their own thing. The concrete change is the case-attach rule in the Gmail
  sync (`/api/admin/gmail/sync`): always case *inbound support* mail, instead of only campaign
  replies. The unified interface = the inbound support inbox, everything cased.
- **Conversation-threaded.** A reply on a Gmail thread that already has a case **reopens that
  case**, drops the new message into its existing Slack thread, and the agent re-suggests against
  the fuller exchange. New thread → new case → new Slack post.
- **Auto-investigate on receipt (DECIDED).** A new/reopened case forwards to Slack AND fires an
  agent run immediately — the play is waiting when you open the thread. No human "Investigate"
  gate. (Cost/noise on junk is a tuning concern, not a blocker; a prefilter can be added later.)

## 2. The agent's INPUT (four layers)

1. **Framework / rules of thumb** — the playbook: credit ≈ 2× the logged interruption; refunds
   only for billing mistakes/double-bills; the `/offer/legacy15` legacy rate; resolve-before-reply;
   tone/voice. Lives in `support_playbook`, appended to the agent's system prompt.
2. **This client's full combined case + inbox history** — their whole relationship, not just the
   one message.
3. **Relevant precedent** — similar past cases across *all* clients, searched out of the case DB,
   so answers are consistent with how the same issue was handled before.
4. **A live `search_case_history` tool** — the agent can query the case database mid-investigation.

All read-only (Neon + live Stripe reads only). No mutation on the front side.

## 3. The agent's OUTPUT — the play `{ response, actions }`

- `response` — the customer-facing reply draft.
- `actions[]` — a typed command vocabulary the agent composes; the back layer executes each:
  | type | executor (deterministic) | status |
  |---|---|---|
  | `reply` | `support.js reply` | ✅ built |
  | `credit` | `credit.js` | ✅ built |
  | `refund` | new Stripe-refund fn (billing-error cases only) | ⬜ to build |
  | `grant` / `cancel` | admin-route logic | ⬜ to build |
  | `merge_cases` / `close_case` / `reopen` / `reassign` | case-table writes | ⬜ to build |

## 4. The GATE (front, in Slack)

- Play posts with **Accept · Edit · Regenerate · Reject**.
  - **Accept** → writes the play into `support_fires` with a **5-minute fuse** (`fire_at`).
  - **Undo** (shown after Accept) → cancels within the window.
  - **Edit** → modal to tweak the reply.
  - **Regenerate** → re-queues a fresh investigation (input layer can always ask for a new suggestion).
  - **Reject** → drop it.
- The gate **is** the authorization: because a human approves + has 5 min to undo, the back layer
  is allowed to execute even powerful actions (refund, cancel, merge).

## 5. The BACK layer (hardcoded, non-bot, non-AI)

- `poller.js` fire-worker: picks `support_fires` where `fire_at ≤ now` and `status='scheduled'`,
  runs the deterministic executor per action, marks `fired`/`failed`, posts the result to the thread.
- Timing (fire_at) and execution both live here — never in the bot or the AI.

## Data model

- **`support_fires`** (built, ours) — the fire queue + Slack lifecycle: id, run_id, member_email,
  channel, thread_ts, play_ts, status (awaiting|posted|scheduled|cancelled|rejected|firing|fired|
  failed), fire_at, response, actions jsonb, result jsonb. Durable fuse.
- **`support_runs`** (existing) — the investigation; `raw_result` holds the play JSON.
- **`support_emails`** (inbound messages) / **`support_cases`** (conversation grouping) /
  **`support_replies`** (admin replies) / **`outbound_emails`** (outbound sends — NOT cased). All
  stay distinct. The workflow change auto-attaches every inbound support email to a case; case-mgmt
  actions (merge/close/reopen/reassign) write to `support_cases`/`support_emails`.

## Decisions (RESOLVED 2026-08-24)

1. **Investigate = auto** on receipt of a support request. No human gate before the agent runs.
2. **This system owns and reshapes the inbox** into one unified auto-case interface (email=case,
   merges, close/reopen). Not converging with a separate track — this IS the track now.

## Existing work this extends (RESOLVED — ours to build on)

The uncommitted support-ops / inbox work in the tree is **ours** (started earlier, never finished):
`app/admin/support-ops/`, `app/api/admin/support-ops/`, modified `AdminNav.js` +
`inbox/InboxClient.js`, the `support_runs`/`support_actions`/`support_playbook` tables, and the
`claudeTools/supportAgent` CLI. Build **on top of it** — extend, don't restart or clobber.

## Built vs to-build

- ✅ `support_fires` table · bot Socket Mode + buttons · fire-worker (`scheduled`→`fired`) ·
  `lib/{plays,execute,slackClient}.js` · play extractor · credit/reply executors.
- ⬜ email=case forwarding + trigger · full input (client history + precedent + `search_case_history`
  + framework wiring in `run.js`) · refund/grant/cancel/case-mgmt executors · the two open decisions.

---

# Cloud (production) architecture — event-driven, on Vercel (DECIDED 2026-08-24)

**Two surfaces, one DB/logic/playbook:**
- **Local Socket Mode CLI** (`claudeTools/supportAgent`, kept) — dev/testing tool. Don't run it
  against prod at the same time as cloud (both would forward/post).
- **Cloud on Vercel** — production. Event-driven, **no cron** (except the Gmail watch *renewal*).

**Stack:** LLM = **Anthropic Messages API** (`ANTHROPIC_API_KEY`, ports the run.js tools + playbook
almost 1:1). Delayed 5-min fuse = **Google Cloud Tasks** (same GCP ecosystem as the Gmail push).

**Event flow (all live):**

| Route (Vercel) | Fired by | Does |
|---|---|---|
| `/api/gmail/push` | **Gmail push** — `users.watch` → Pub/Sub → push sub | pull new msg via `history.list` → email=case → post case to Slack + start investigation |
| `/api/support/investigate` | the push handler | Anthropic API + ported tools + playbook → play JSON → post play (Accept/Edit/Regenerate/Reject) in the thread |
| `/api/slack/events` | **Slack Events API** | inbound Slack events (thread replies etc.) — replaces Socket Mode receive |
| `/api/slack/interactivity` | **Slack button webhook** (signed w/ signing secret) | Accept → schedule a **Cloud Task** at T+5min → `/api/support/fire` · Undo → delete the task · Edit → modal · Regenerate → re-investigate · Reject → drop |
| `/api/support/fire` | **Cloud Task** at T+5 | run the ported executors (reply/credit/grant/refund/cancel/case-mgmt) → post result to thread |

**Gmail webhook:** `users.watch` on the support mailbox (via the domain-wide service account) →
Pub/Sub topic → push subscription → `/api/gmail/push`. Watch expires in 7 days → re-arm on each
push (or weekly). That renewal is the ONLY scheduled thing — not an inbox poll.

**Ports (from the local build):** `lib/execute.js` (executors), `lib/plays.js`, the `run.js` tool
SQL → into Vercel `lib/support/*`. The play model, fire lifecycle, and `support_fires` table are
identical; only the runtime shells change (Socket Mode → HTTP; Agent SDK → Anthropic API; poller
loop → webhooks + Cloud Task).

**External setup:** `ANTHROPIC_API_KEY`; a Google Pub/Sub topic + Gmail `users.watch`; a Cloud
Tasks queue; Slack app reconfig (Socket Mode OFF → Events + Interactivity request URLs, verified by
the signing secret we captured); Vercel env vars (Slack bot token, signing secret, GCP creds).

**Build sequence (cloud):**
1. Port the shared lib (executors, plays, tool SQL) into the app repo `lib/support/`.
2. `/api/support/investigate` — Anthropic API + tools + playbook → play JSON.
3. `/api/slack/interactivity` + `/api/slack/events` — button/edit/regenerate/reject; Cloud Task
   schedule/cancel on Accept/Undo. Reconfigure the Slack app to Events + Interactivity URLs.
4. `/api/support/fire` — Cloud Task target; executors.
5. `/api/gmail/push` + Pub/Sub + `users.watch` arm/renew.
6. Vercel env + deploy; end-to-end test (throwaway case → play → Accept → Undo before fire).
