# Session: WPMigrationGoLive

- **Session name:** WPMigration (renamed mid-session; file named GoLive to distinguish from the June `WPMigrationPlan.md`)
- **Session ID:** `a022fb07-5c19-4396-a925-7bba7ed8be03`
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date/time:** 2026-07-22 → 2026-07-23 (spanned midnight; EDT)
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/a022fb07-5c19-4396-a925-7bba7ed8be03.jsonl`
- **Other dirs used:** plan `~/.claude/plans/we-have-a-plan-witty-galaxy.md`; memory `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/memory/` (project_wp_golive.md, project_forum_host_ownership.md); scratchpad under `/tmp/claude-1000/.../a022fb07-.../scratchpad`

---

## Summary
Vetted the formed WordPress→Next.js go-live plan, then **took the migration fully live**: `www.gymnasticbodies.com` now serves the new Next.js marketing site (homepage, 235 blog posts, 355 exercises), with the legacy Invision forum kept alive via a reverse-proxy, WP images localized to Vercel Blob, and a full WP-permalink redirect map. Cutover was a **Route 53 record-flip** (www + apex → Vercel) since the domain is registered at easyDNS (external registrar), not AWS. Also populated the Vercel DNS zone (31 records) for the eventual full nameserver migration, and did a post-launch monitoring pass that caught (and confirmed the auto-resolution of) a Vercel auto-DDoS challenge on `www`.

---

## Plans created / referenced
- **Created + executed:** `~/.claude/plans/we-have-a-plan-witty-galaxy.md` — the vetted go-live runbook (DNS, root flip, forum proxy, redirects, images, app. handling). Approved via ExitPlanMode, then implemented.
- **Referenced:** `~/.claude/plans/delegated-mapping-hummingbird.md` (June build plan); `sessions/WPMigrationPlan.md` (June planning session).

## First user inputs
1. "We have a plan to go live with our wordpress migration can you lookup the details and vet the plan that's formed."
2. "Please dont ask permission in plan mode."
3. (feedback) "If you do some of these operations in node it should not require so many security pauses. Please perform long running tasks via Sub Agents. This 'review' took an hour and should have took five minutes… stop using python."
4. "We want to close the amazon account. A lot of those are going to be no longer important after migration… Update AWS then roll to vercel."
5. "Keep going till its live you have my permission to make the changes to production."

## First command run this session
`Read ~/.claude/plans/delegated-mapping-hummingbird.md` + `Read sessions/WPMigrationPlan.md` (parallel, to locate the formed plan).

---

## Key accomplishments
- **WordPress marketing site is LIVE at `www.gymnasticbodies.com`** on Vercel (verified: homepage, redirects, 410s, forum, Blob assets, sitemap).
- Vetted + wrote the go-live plan; closed every gap (root flip, forum survival, broken images, permalinks, privacy page, app. entanglement).
- Deployed all code to prod via `git push` (commit `5f2ab1d`), scoped to only the WP files (left a parallel workout/curriculum workstream untouched).
- Built a **custom forum reverse-proxy** (`app/forum/[[...path]]/route.js`) — confirmed via live Vercel logs that real users load styled forum pages and POST successfully.
- Localized 511/592 `wp-content` image rows to Blob (2,431 imgs) + cleaned up the rest (no broken image slots; 608 rows intact).
- Rehosted 37 `my.`-referenced legacy assets to Blob + wired `/gymfit/wp-content/*` + `/media/*` rewrites.
- DNS record-flip to Vercel (www + apex) via AWS CLI; populated the full Vercel DNS keep-set (31 records) for the pending NS migration.
- Post-launch monitoring: DNS health, support inbox, Vercel logs, headless test — caught the auto-DDoS `www` challenge and confirmed it auto-cleared.

## Detailed technical overview
- **Root flip:** `app/page.js` re-exports `app/homepage/page.js` (retired the `my.` redirect); homepage `canonical=/`; `/homepage`+`/home`→`/`.
- **Redirects (`next.config.mjs`):** WP permalink map — `/shop`,`/product/*`,`/sign-up`,`/cart`,`/checkout/why-now`,`/class-finder`→`/subscribe`; `/my-account`→`/accountDetails`; `/checkout/{terms,privacy}`→those pages; `/category/*`,`/feed`,`/:slug/feed`→`/blog`; `/gb-gear`,`/oops`,`/test-inline-form`→`/`. Blog/exercise URLs need NO redirect (app already serves bare slugs; `/blog/<slug>` 308s to `/<slug>`).
- **410s:** `app/testimonial/[slug]/route.js` + `app/carousel-seat/[slug]/route.js`.
- **Forum proxy:** connects to origin IP `34.205.92.109` with SNI+Host forced to `www.gymnasticbodies.com` (origin only serves the forum for Host=www; a plain rewrite can't set that — a route handler can).
- **Legacy asset rewrites:** `/gymfit/wp-content/*` + `/media/*` → Blob `legacy/` prefix (host `6z1gtynqfxcjjwix.public.blob.vercel-storage.com`).
- **Privacy page:** fresh draft seeded into `pages` (type='page', slug `privacy-policy`) — NEEDS LEGAL REVIEW; also fixed a pre-existing dead checkout link.
- **DNS:** domain HOSTED on Route 53 (zone `Z2ADWE0F80WM6J`, user's AWS acct `390008123206`) but REGISTERED at easyDNS (registrar). Went live via Route 53 record-flip: `www` CNAME→`268071469c5b402d.vercel-dns-016.com`, apex A→`76.76.21.21`. Full NS migration to Vercel is prepped (zone populated) but pending the registrar NS flip (needs easyDNS login).
- **Content:** `pages` table — exercise 355, blog_post 235, page 10 (+privacy), marketing 7.
- **app. audit:** `app.` is host-bound to better-auth (host-only cookie, www not a trustedOrigin), the Stripe webhook (POST, registered in Stripe dashboard), and `/admin` — so NO blanket app.→www redirect. Chosen approach: repoint forward-facing page links + path-scoped 301s (deferred to tomorrow).

## Git / Vercel / AWS interactions
- **Git:** commit `5f2ab1d` on `main`, pushed to `origin` (github.com:tlchatt/gymnasticbodies.com) → Vercel auto-deployed to production. Only WP-migration files staged (parallel workout work left uncommitted).
- **Vercel:** added `www` + apex to the `gymnasticbodies-com` project; populated the Vercel DNS zone with 31 records via `vercel-dns-push` (team `team_RcWLPi8bU9by74Y82XH9IgYT`); verified prod deploy + pulled runtime logs. NOTE: the `technologic` CLI token is 403 on domain-DNS `list`/`inspect` and on firewall config, but WORKS via the API with `teamId`.
- **AWS Route 53:** `change-resource-record-sets` UPSERTs for `www` CNAME + apex A → Vercel (both INSYNC). `route53domains get-domain-detail` → not in account (confirms external registrar).

## Tests / logs / tool runs
- Extensive `curl` verification of every route on dev (`app.gymnasticbodies.dev`) + prod (`app.` and `www`).
- Vercel runtime logs: confirmed forum assets (css_built, fonts, images) + `POST` all 200 from real users.
- Headless Puppeteer live test (subagent): all 16 pages hit the "Vercel Security Checkpoint" (auto-DDoS mitigation on www) — later confirmed auto-cleared.
- Support inbox query: only 1 new case in 48h (case 68, routine cancellation — NOT go-live-related).

## Skills / tools used
- Skills: `dns-pull`, `vercel-dns-push`. Subagents (Explore + general-purpose) for: forum/URL recon, my. cross-domain audit, forum ownership trace, /class-finder, image localization + cleanup, app. reference audit, headless live test. Tools: EnterPlanMode/ExitPlanMode, TaskStop, WebFetch.

## Files created / modified
- **Committed (prod):** `app/page.js`, `app/homepage/page.js`, `app/sitemap.js`, `next.config.mjs`, `components/Copyright.js`, `app/forum/[[...path]]/route.js` (new), `app/testimonial/[slug]/route.js` (new), `app/carousel-seat/[slug]/route.js` (new); deleted `app/home/page.js` + `app/page.sync-conflict-*.js`.
- **DB (prod Neon):** seeded `/privacy-policy` page; localized/cleaned image URLs across 511+ `pages` rows.
- **Blob (prod):** 2,431 localized content images + 37 legacy `my.` assets.
- **Artifacts (in `/var/www/Work/Gymfit/`):** `gymnasticbodies.com-route53-zone-20260722.json` (full zone backup), `-keepset-dnspull.json`, `-vercel-keepset-20260722.json`, `-dns-20260722.txt`, `-vercel-backup-2026-07-23T*.json` (×2, auto-created by the push tool).
- **Memory:** `project_wp_golive.md`, `project_forum_host_ownership.md` (+ MEMORY.md index).

---

## Note for Next Session

### Session accomplishments
The WordPress→Next.js migration **went live** — `www.gymnasticbodies.com` serves the new site (marketing pages, 235 blog posts, 355 exercises), the Invision forum stays alive via a custom reverse-proxy, WP images are on Vercel Blob, and the full permalink redirect map is deployed. Cutover was a Route 53 record-flip (www + apex → Vercel). The Vercel DNS zone was also fully populated (31 records) for the eventual full nameserver migration. Post-launch monitoring confirmed the forum works end-to-end (real users posting), no support fallout, and that a `www`-only auto-DDoS challenge came and cleared on its own.

### Incomplete goals / deferred to next session
1. **Full nameserver migration to Vercel** — Vercel zone is ready; the only remaining step is flipping NS to `ns1/ns2.vercel-dns.com` at the **registrar (easyDNS)**, which needs a registrar login (not doable from AWS — the domain is only *hosted* on Route 53).
2. **`app.` → `www` merge** ("get fully off app.") — repoint `my.` links (review-gated, my. mid-overhaul) + app-repo email templates to www; add path-scoped host-only 301s for `/renew` + `/accountDetails`. **HARD PRESERVE:** `/renew`, `/subscribe`, `/offer/*`, and every API route `my.` hits. **Do NOT break:** better-auth (host-only cookie, www not trustedOrigin), the Stripe webhook (registered at app./api/stripe/webhook), and `/admin`.
3. **Firewall follow-ups:** add a Vercel Firewall rule denying `/wp-login.php`, `/xmlrpc.php`, `/wp-admin/*` (attack noise triggering the auto-DDoS); add a "Protection Bypass for Automation" token so headless tests aren't challenged. Both need dashboard access (CLI token is 403 on firewall).
4. **Monitoring** — Vercel logs, `/admin` support inbox, headless tests against live www.
5. **Smaller:** email deliverability test; GSC sitemap resubmit; case 68 (Jason's pending cancellation reply — needs approval before sending); the privacy-policy draft needs legal review.

### Lingering questions / tasks for the user
- **Registrar (easyDNS) access** — do you have the login to flip nameservers? (Domain renews Aug 10 through easyDNS; the payer holds the login. Possibly the prior dev/agency.)
- **Vercel dashboard access** for the firewall rules (the `technologic` CLI is permission-limited on domain/firewall settings).
- **`gear.gymnasticbodies.com`** — preserved pointing at `35.169.12.160` in the Vercel zone; confirm that's still its correct target as AWS winds down.

### Deeper context
Session file: `app.gymnasticbodies.com/sessions/WPMigrationGoLive.md` · Plan: `~/.claude/plans/we-have-a-plan-witty-galaxy.md` · Memory: `project_wp_golive.md`
