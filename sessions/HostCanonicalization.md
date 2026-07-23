# Session: HostCanonicalization

- **Session name:** HostCanonicalization
- **Session ID:** `f2765d2b-f5dd-45a3-b111-75e096dd6749`
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** 2026-07-23 (single day)
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/f2765d2b-f5dd-45a3-b111-75e096dd6749.jsonl`
- **Session directory:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/`
- **Other data written this session:**
  - Memory: `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/memory/project_host_architecture.md` (new) + `MEMORY.md` index updated
  - Scratchpad: `redirect-matrix.sh` (local 51-check matrix), `live-matrix.sh` (live 29-check matrix) — session-scoped, disposable
- **Plans referenced:** `~/.claude/plans/we-have-a-plan-witty-galaxy.md` (prior WP go-live plan; no new plan file created — the merge was planned in-conversation)

## Goals & Accomplishments

| Goal | Status |
|---|---|
| Pick up WPMigrationGoLive handoff; execute deferred item #2: "app. → www merge" | ✅ Complete — resolved as permanent **two-front-door model**, not a true merge |
| Establish current app. vs www functioning (DNS, routing, host bindings) | ✅ Complete |
| Decide end-state architecture with user | ✅ Complete — **www = content, app. = application, permanent split; my. eventually merges INTO app.** |
| Implement host canonicalization | ✅ Complete — deployed `a7de890`, live-verified |
| Verify Stripe untouched | ✅ Complete — live `webhookEndpoints.list` confirms single endpoint at `app./api/stripe/webhook`, exempt path |
| Update docs (project CLAUDE.md) | ✅ Complete — new "Host Canonicalization" section |

## Key Decisions (user-made, in order)

1. **"Keep the functionality of app. where it is. We will probably eventually merge my. into app. and keep www where it is."** — rejected the "full merge to www" option; the split is permanent. This eliminated ~80% of the originally-scoped work (no my. changes, no email-template changes, no Stripe/auth changes).
2. **"App. all current functionality that lived there should stay there, also my account"** — everything pre-WP stays on app., including `/accountDetails`.
3. `/subscribe` + `/offer/*` canonical on **app.** (grouped with the other Stripe/transactional pages; existing drip-email links already point there).
4. Deploy approved mid-turn ("Okay great deploy"); CLAUDE.md docs commit approved ("Yes").

## Technical Overview

### Discovery (how app./www actually functioned before this session)
- DNS: `www` CNAME + `app.` CNAME → **same** `268071469c5b402d.vercel-dns-016.com`; apex A → `76.76.21.21`. All three hosts + `gymnasticbodies-com.vercel.app` alias **one Vercel deployment** of this codebase.
- **Zero host-based routing existed** — every route answered on every host (duplicate content on 3+ hosts; apex served raw 200s with no canonicalization at all).
- Host bindings that force app. to keep application traffic: better-auth `baseURL`/`trustedOrigins` = app.-only (`lib/auth.js:16-17`, host-only cookie — admin login can only ever succeed on app.); Stripe webhook registered at `app./api/stripe/webhook` (verified live — the ONLY registered endpoint; events: invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted); every sent email links `app./renew`; my. hardcodes app. in 4 places (`loginActions.js:242,342,486` + `AccountPage.jsx:7` `APP_URL`).
- my.'s **API** traffic goes to `REACT_APP_API_NEW = https://gymnasticbodies-com.vercel.app` — NOT app. — only browser redirects/links use app.
- Content (blog posts + WP pages) served by root-level `app/[slug]` catch-all → content slugs **cannot be enumerated** for redirect purposes; application routes must be exempted by negative lookahead instead.
- Route classification done this session: `/checkout` (legacy MUI Stripe checkout), `/allUsers` (legacy internal listing), `/Media` (internal JW→Blob migration tool) are all **pre-WP app. pages → exempt**.

### Implementation (commit `a7de890`)
- **`next.config.mjs`** — host-scoped redirect rules appended AFTER the WP path-map (so path redirects resolve first, e.g. `app./shop → app./subscribe` in one host-preserving hop):
  - Apex `gymnasticbodies.com` → everything → same path on www (fixed the never-canonicalized apex).
  - `app.` host → everything → www EXCEPT negative-lookahead exemptions: `api/`, `admin(/|$)`, `renew$`, `accountDetails$`, `subscribe$`, `subscribeOld$`, `offer(/|$)`, `checkout$`, `allUsers$`, `Media$`, `_next/`, `images/`, `favicon.ico$`, `.well-known/`. Separate rule for bare `/`.
  - `www` host → `/renew`, `/accountDetails`, `/subscribe`, `/offer/:path*`, `/admin/:path*` → app. (query strings carry; `@` gets percent-encoded to `%40` — harmless).
  - `/api/*` is redirected in NEITHER direction (webhook POSTs, CORS calls, email verify links must answer in place).
  - **All rules `permanent: false` (307)** deliberately — browsers cache 308s aggressively; flip to 308 after soak. THIS FLIP IS STILL PENDING.
- **Canonical tags** (`alternates.canonical`, resolved via existing `metadataBase` = www in `app/layout.js:23`): added to `app/[slug]/page.js`, `app/exercises/[slug]/page.js`, `app/exercises/page.js`, `app/blog/page.js`. `sitemap.js`/`robots.js` already emitted www — untouched.
- **`CLAUDE.md`** (committed separately): new "Host Canonicalization" section + root-note update + stale Code Structure Map line fixed.

### Verification
- **Local (pre-deploy):** 51-check curl matrix with **forged `Host` headers against localhost:3013** (dev service) — this technique works because `has: host` matching happens inside Next itself, not only at the Vercel edge. All passed (6 nominal "FAILs" were test-script artifacts: proxy.ts admin→login same-host redirect; path-map relative destinations reported as localhost; `%40` encoding).
- **Live (post-deploy):** background poll detected deploy live ~80s after push; 29-check matrix across all three hosts + end-to-end `-L` journey follows — all passed. Dev host + previews match no host rule → unaffected (verified).
- **Stripe:** read-only `stripe.webhookEndpoints.list()` with live key (in `.env.local` per standing note) confirmed exactly one endpoint, on app., exempt.

### Git / Vercel
- `a7de890` "Host canonicalization: www = content, app = application" — 5 files, pushed to `main` → Vercel auto prod deploy (per project's explicit-deploy-only policy; user said "Okay great deploy").
- Follow-up commit (this rotation): `CLAUDE.md` + `sessions/HostCanonicalization.md`.
- User's monorepo-level `/var/www/Work/Gymfit/CLAUDE.md` is OUTSIDE this git repo (repo root = `app.gymnasticbodies.com/`).

### Tools/infra used
- `drill` for DNS (no `dig` on this box); systemd dev service restart ×2; background Bash task for deploy-wait + live matrix; direct Stripe SDK query via `node -e`; NO local `npm run build` (would clobber the dev service's shared `.next` — Vercel's isolated build is the safety net).

## Notes, Considerations, Loose Ends

- **307 → 308 flip pending** — one-word change (`permanent: true` ×8 in `next.config.mjs`) after ~1–2 days of clean traffic. Then **GSC sitemap resubmit**.
- **New-route rule going forward:** any new user-facing application route MUST be added to the exemption regex in `next.config.mjs`, or it will bounce to www. Documented in CLAUDE.md.
- **`app/home/page.sync-conflict-20260625-062536-ZRHRIGU.js`** — Syncthing conflict artifact, not a route, harmless. User never answered delete question — still sitting there.
- `/Media` returns 500 on dev (pre-existing; internal tool page with fs/child_process imports) — untouched, unrelated.
- Old WP funnel URLs on www now chain 2 hops (`www/shop → www/subscribe → app./subscribe`) — acceptable; could shorten by making the WP path-map host-aware if it ever matters.
- Homepage CTAs are relative links → on www they produce `www/subscribe → app./subscribe` (1 extra hop). Optional optimization: absolute app. hrefs in nav/CTA content.
- Monitoring idea for the soak: check `app_logs` renew funnel (`renew.page_view`) stays at normal volume post-redirects; forum traffic normal.
- Deferred items from WPMigrationGoLive that remain OPEN: easyDNS NS flip (needs registrar login — user hasn't confirmed access), Vercel Firewall rules for WP attack paths (dashboard-only), case 68 Jason cancellation reply (drafted, NEEDS USER APPROVAL before sending), privacy-policy legal review, email deliverability test, `gear.gymnasticbodies.com` → 35.169.12.160 confirmation.

## First user inputs (session start)

1. "Were picking up from a previous session, here is a not it left you. Don't perform any actions just review the information. 📋 Note for Next Session — WPMigrationGoLive …"
2. "'2. app. → www merge — with hard preserves…' How are we funcitoning now for app. vs www"
3. "Okay lets go through it."
4. "I dont' know what a 'system host' is"
5. "Keep the functionality of app. where it is. We will probably eventually merge my. into app. and keep www where it is."

**First command run:** `dig +short www.gymnasticbodies.com CNAME …` (failed — no dig; switched to `drill`).

## Files created/modified

| File | Change |
|---|---|
| `next.config.mjs` | Host-scoped redirect rules (apex→www, app.-content→www with exemptions, www-app-routes→app.) |
| `app/[slug]/page.js` | `alternates.canonical` added |
| `app/exercises/[slug]/page.js` | `alternates.canonical` added |
| `app/exercises/page.js` | `alternates.canonical` added |
| `app/blog/page.js` | `alternates.canonical` added |
| `CLAUDE.md` | Host Canonicalization section, root-note update, Code Structure Map fix |
| `sessions/HostCanonicalization.md` | This file |
| `~/.claude/.../memory/project_host_architecture.md` | New memory: permanent host split decision |
| `/var/www/Work/Gymfit/CLAUDE.md` | Sessions table row (outside git repo) |

## Note for Next Session

**Where we are:** The `app. → www` merge (deferred item #2 from WPMigrationGoLive) is DONE — shipped as a permanent two-front-door model, commit `a7de890`, live-verified 2026-07-23. **www = content** (homepage, blog, `[slug]` pages, exercises, forum, legal), **app. = application** (`/api/*` + Stripe webhook, `/admin`, `/renew`, `/accountDetails`, `/subscribe`, `/offer/*`). Apex now canonicalizes to www (it previously served duplicate 200s). Nothing in my., emails, Stripe, or auth was touched — all existing links already pointed at the right hosts. Architecture decision is in memory (`project_host_architecture.md`): **the split is permanent; my. eventually merges INTO app.; never blanket-redirect app.→www; new app routes must be added to the exemption regex in `next.config.mjs`.**

**First actions next session:**
1. **Soak check** (if ≥1–2 days since 2026-07-23): spot-check redirects still correct (`curl -sI https://app.gymnasticbodies.com/blog` → 307 www; `app./renew` → 200), check `app_logs` renew funnel volume is normal, then **flip all 8 host-rule `permanent: false` → `true`** in `next.config.mjs`, deploy on user approval, then **resubmit sitemap in GSC**.
2. Ask user about deleting `app/home/page.sync-conflict-20260625-062536-ZRHRIGU.js` (unanswered).

**Still open from the WPMigrationGoLive backlog:** easyDNS NS flip → `ns1/ns2.vercel-dns.com` (blocked: registrar login — domain renews Aug 10); Vercel Firewall rules for `/wp-login.php` `/xmlrpc.php` `/wp-admin/*` + automation-bypass token (dashboard-only, CLI 403s); case 68 Jason cancellation (reply drafted — REQUIRES explicit user approval before sending, per standing email rule); privacy-policy legal review; email deliverability test; confirm `gear.gymnasticbodies.com` → `35.169.12.160` still correct.

**Gotchas:** `dig` not installed — use `drill`. Don't run `npm run build` locally (clobbers dev service's `.next`). Host redirects are testable locally: `curl -H 'Host: app.gymnasticbodies.com' http://localhost:3013/<path>` against the dev service. Restart `app-gymnasticbodies-dev.service` after any `next.config.mjs` edit.

Session file: `app.gymnasticbodies.com/sessions/HostCanonicalization.md`
